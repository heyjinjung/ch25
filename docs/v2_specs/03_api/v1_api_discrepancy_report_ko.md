문서 타입: Audit Report
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: V2 마이그레이션 팀
상태: Draft

# V1 API Discrepancy Report & Audit

## 1. 개요 (Overview)
Frontend 코드와 Backend 구현체를 대조 분석한 결과, 다수의 **"암시적 계약(Implicit Contract)"**과 **"타입 불일치(Type Mismatch)"**가 발견되었습니다. 이는 V2 마이그레이션 시 반드시 해결해야 할 Critical Blocker입니다.

**검사 대상:**
- Frontend: `src/api`, `src/admin/api`
- Backend: `app/api/routes`, `app/api/admin/routes`
- SoT: `docs/v2_specs`

---

## 2. 주요 불일치 사례 (Discrepancy Cases)

### Case A: Roulette API (`/api/roulette/play`)
| 구분 | Frontend (`rouletteApi.ts`) | Backend (`roulette.py`) | 비고 |
| :--- | :--- | :--- | :--- |
| **Request** | `{ ticketType?: string }` | `{ ticket_type: str = "ROULETTE_COIN" }` | FE는 camelCase, BE는 snake_case이며 Pydantic alias 미사용 시 매핑 안 됨. |
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
| **Validation** | TypeScript Interface 존재 | `payload: dict` (Any Type) | **Critical**: BE에서 Pydantic 스키마를 쓰지 않고 `payload.get`으로 처리 중. |
| **Idempotency** | 헤더 처리 로직 부재 | `header` or `body` 혼용 | 결제/사용 로직에서 멱등성 키가 필수가 아님. |
| **Diamond** | `DIAMOND`는 Item 취급 | Wallet/Inventory 하이브리드 로직 | V2에서는 `Currency`와 `Item`의 경계 명확화 필요. |

### Case D: Admin Vault Ops (`/admin/api/vault...`)
| 구분 | Frontend (`adminVaultApi.ts`) | Backend (`admin_vault_ops.py` vs...) | 비고 |
| :--- | :--- | :--- | :--- |
| **Duplicate Path** | `/admin/api/vault-programs/...` 호출 | `vault_ops` / `vault_programs` 중복 | 동일 기능(Balance Update)이 두 라우터에 분산 구현됨. |
| **Route Prefix** | `/admin/api/...` | Legacy/Canonical 혼용 | 라우터 설정 복잡도 증가, 유지보수 위험. |

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
    *   Backend의 많은 엔드포인트가 `response_model=dict`로 설정되어 스웨거가 깨짐.
    *   Frontend는 `as any`로 타입을 우회하는 코드 만연.

2.  **Case Style Mismatch**
    *   FE(Camel) vs BE(Snake) 불일치로 인해 코드 내 하드코딩된 변환 로직 존재.

3.  **V2 SoT 위반**
    *   `ticket_type` 매직 스트링 사용 (`ROULETTE_COIN` 등).
    *   RESTful 경로 규칙 위반 (`/api/roulette` -> `/api/game/roulette` 등).

4.  **Admin Code Fragmentation**
    *   어드민 로직이 여러 파일에 산재되어 중앙 관리가 어려움.

---

## 4. 해결 제안 (Action Plan)

1.  **Schema First 개발**: Backend Pydantic V2 `Strict` 모드 적용 후 FE 타입 자동 생성.
2.  **Case Converter**: Middleware에서 Camel <-> Snake 자동 변환.
3.  **FE Linter 강화**: `no-explicit-any` 적용.
4.  **Admin Router Unification**: `/admin/api/v2/`로 통합 및 레거시 경로 정리.

---

## 5. 변경 이력
- v1.0 (2026-01-19): 최초 생성 (Based on Deep Audit)
