# V1 API Discrepancy Report & Audit

**검사 일시**: 2026-01-19
**대상**: Frontend (`src/api`), Backend (`app/api/routes`), SoT (`docs/v2_specs`)

---

## 1. 개요
Frontend 코드와 Backend 구현체를 대조 분석한 결과, 다수의 **"암시적 계약(Implicit Contract)"**과 **"타입 불일치(Type Mismatch)"**가 발견되었습니다. 이는 V2 마이그레이션 시 반드시 해결해야 할 Critical Blocker입니다.

---

## 2. 주요 불일치 사례 (Discrepancy Cases)

### Case A: Roulette API (`/api/roulette/play`)
| 구분 | Frontend (`rouletteApi.ts`) | Backend (`roulette.py`) | 비고 |
| :--- | :--- | :--- | :--- |
| **Request** | `{ ticketType?: string }` | `{ ticket_type: str = "ROULETTE_COIN" }` | FE는 camelCase, BE는 snake_case이며 Pydantic alias 미사용 시 매핑 안 됨. (현재 BE는 payload가 null이면 기본값 처리 등 방어코드로 작동 중) |
| **Response** | `remaining_spins` (FE가 0으로 하드코딩) | **없음** (BE 응답에 필드 부재) | FE가 BE 데이터를 신뢰하지 않고 임의 값을 사용하는 상태. |
| **Result** | `result: string` | `result: str` | 값의 범위(Enum)가 명시되지 않음 ("OK" vs "FAIL" 등). |

### Case B: Season Pass (`/api/season-pass/status`)
| 구분 | Frontend (`seasonPassApi.ts`) | Backend (`season_pass.py`) | 비고 |
| :--- | :--- | :--- | :--- |
| **Reward Label** | FE에서 `formatRewardLabel`로 **동적 생성** | `reward_label` 필드를 BE에서 보내주기도 함 | 로직의 파편화 (BE가 보내는데 FE가 덮어쓰거나, 반대). |
| **Boolean** | `auto_claim: boolean` 기대 | `auto_claim: int` (0/1) 반환 | JS의 Truthy 특성에 의존한 위태로운 구현. |

### Case C: Inventory & Shop (`/api/shop/purchase`)
| 구분 | Frontend (`inventoryApi.ts`) | Backend (`inventory_shop.py`) | 비고 |
| :--- | :--- | :--- | :--- |
| **Validation** | TypeScript Interface 존재 | `payload: dict` (Any Type) | **Critical**: BE에서 Pydantic 스키마를 쓰지 않고 `payload.get`으로 처리 중. 문서화도 안 되고 검증도 느슨함. |
| **Idempotency** | 헤더 처리 로직 부재 | `header` or `body` 혼용 | 결제/사용 로직에서 멱등성 키가 필수가 아님. 중복 결제 위험. |
| **Diamond** | `DIAMOND`는 Item 취급 | Wallet/Inventory 하이브리드 로직 | V2에서는 `Currency`와 `Item`의 경계를 명확히 해야 함. |

---

## 2.1 최신 API 리스트 기준 검증 (2026-01-19)
**기준 문서**: [docs/v2_specs/03_api/v1_legacy_api_list_ko.md](v1_legacy_api_list_ko.md)

- **Case A (Roulette)**: 확인됨
    - `payload`가 Optional이며 기본값으로 `ROULETTE_COIN`을 사용.
    - 근거: [app/api/routes/roulette.py](../../../app/api/routes/roulette.py#L26-L35)
- **Case B (Season Pass)**: 부분 확인
    - `auto_claim`이 `int`로 정의됨, `reward_label`은 Optional.
    - 근거: [app/schemas/season_pass.py](../../../app/schemas/season_pass.py#L33-L63)
- **Case C (Inventory & Shop)**: 확인됨
    - `payload: dict` 사용 및 Idempotency-Key가 Optional 처리.
    - 근거: [app/api/routes/inventory_shop.py](../../../app/api/routes/inventory_shop.py#L62-L113)
- **Case D (Admin Vault Ops)**: 보류
    - 최신 API 리스트에 직접 근거 링크가 없어 별도 점검 필요.

---

## 3. 공통 발견 사항 (General Findings)

1.  **Implicit Typing (암묵적 타입)**
    *   Backend의 많은 엔드포인트(특히 `shop`, `inventory`)가 `response_model`을 `dict`나 `Any`로 설정하여 스웨거 문서가 생성되지 않거나 부정확함.
    *   Frontend는 `any` 캐스팅(`as any`)을 통해 데이터를 억지로 끼워 맞추는 코드가 다수 존재 (`seasonPassApi.ts` L70).

2.  **Case Style Mismatch**
    *   FE: `camelCase` (standard JS)
    *   BE: `snake_case` (standard Python)
    *   **문제**: 자동 변환 미들웨어가 없어, FE 코드 내에서 `reward_type` 처럼 snake_case를 직접 쓰는 혼종 코드가 발생.

3.  **V2 SoT 위반**
    *   `ticket_type` 매직 스트링 (`ROULETTE_COIN`) 사용. -> V2는 `ROULETTE_TICKET` 등 표준화된 상수로 관리 필요.
    *   API 경로 패턴 불일치 (`/api/roulette` vs `/api/game/roulette`).

---

## 4. 해결 제안 (Action Plan)

1.  **Schema First 개발**: Backend에서 Pydantic V2로 `Strict` 스키마를 먼저 정의하고, 이를 `openapi-ts` 등을 통해 FE 타입으로 자동 생성/동기화.
2.  **Case Converter 도입**: BE 미들웨어에서 `CamelCase` ↔ `snake_case` 자동 변환 적용.
3.  **FE `any` 제거**: 마이그레이션 단계에서 `as any` 사용을 린트로 금지하고, 정확한 DTO 매핑 강제.
