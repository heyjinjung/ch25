# Golden V2 Error Messages Audit (Strict Vault Policy)

**문서 타입**: 가이드 / 감사(Audit)
**최종 업데이트**: 2026-01-28
**상태**: 완료

이 문서는 Golden V2 시스템에서 발생하는 주요 에러 코드와 그에 따른 제한 규칙을 정리합니다. 특히 "강력한 금고 정책(Strict Vault Policy)"에 따른 제재 사항을 집중적으로 다룹니다.

---

## 1. 전역 정책 제재 (Strict Vault Policy)

| 에러 코드 | HTTP 상태 | 설명 | 제재 조건 |
| :--- | :--- | :--- | :--- |
| `BENEFITS_SUSPENDED` | 403 | **혜택 중단 상태** | 최근 7일(KST 기준) 내에 입금 내역이 없는 유저 (`cc_deposit` 합계 < 1) |

**제재 내용**: 
- **상점(Shop)**: 모든 상품 구매 차단.
- **게임(Game)**: 룰렛, 주사위, 복권 등 모든 유료 게임 플레이 차단.
- **인벤토리(Inventory)**: 바우처(Voucher) 사용 및 아이템 교환 차단.
- **금고(Vault)**: 보유 한도가 30,000 KRW로 축소됨 (한도 초과 시 적립 불가).

---

## 2. 출금 관련 제한 (Withdrawal Rules)

금고(Vault)에서 외부로 출금 신청(`vault/withdraw`) 시 적용되는 규칙입니다.

| 에러 코드 | HTTP 상태 | 설명 | 상세 규칙 |
| :--- | :--- | :--- | :--- |
| `DEPOSIT_REQUIRED_TODAY` | 403 | **당일 입금 필수** | 출금 신청 당일(KST 09:00 리셋) 입금 내역이 있어야 함. |
| `PLAY_COUNT_INSUFFICIENT_{N}` | 403 | **활동성 부족 (게임)** | 최근 3일간 누적 게임 플레이 횟수가 `{N}`회 미만. (일반: 30, 주의: 100, 고액: 15) |
| `VAULT_SPENT_INSUFFICIENT_{N}` | 403 | **활동성 부족 (사용)** | 당일 금고 사용액(게임/상점)이 `{N}` KRW 미만. (일반: 1만, 주의: 3만, 고액: 2만) |
| `MIN_WITHDRAWAL_AMOUNT_{N}` | 400 | **최소 신청 금액 미달** | 1회 신청 최소 금액(10,000) 또는 회차별 최소 유지 밸런스(`{N}`) 미달. |
| `WITHDRAWAL_REQUEST_ALREADY_PENDING` | 409 | **중복 신청 불가** | 이미 승인 대기 중인(`PENDING`) 출금 요청이 존재함. |
| `INSUFFICIENT_FUNDS` | 400 | **잔액 부족** | 출금 가능액(Locked - Reserved)이 신청 금액보다 적음. |

---

## 3. 상점 및 게임 이용 (Shop & Games)

| 에러 코드 | HTTP 상태 | 설명 | 발생 원인 |
| :--- | :--- | :--- | :--- |
| `INSUFFICIENT_BALANCE` | 400 | **금고 잔액 부족** | 구매에 필요한 금고(VAULT) 잔액이 부족함. |
| `NOT_ENOUGH_TOKENS` | 400 | **티켓 부족** | 게임 플레이에 필요한 티켓(`ROULETTE_TICKET` 등)이 부족함. |
| `PRODUCT_NOT_FOUND` | 404 | **상품 없음** | 존재하지 않거나 비활성화된 상품(SKU)에 대한 구매 시도. |
| `FEATURE_NOT_ACTIVE` | 400 | **기능 비활성** | 해당 기능(룰렛 등)이 현재 운영 스케줄상 비활성 상태임. |
| `INSUFFICIENT_ITEM_QUANTITY` | 400 | **인벤토리 수량 부족** | 바우처 사용 시 보유한 아이템 수량이 부족함. |

---

## 4. 시스템 및 기타 (System)

- `USER_NOT_FOUND` (404): 유효하지 않은 유저 식별자.
- `INVALID_CONFIG` (400): 서버 관리자의 설정 오류 (가중치 합계 오류 등).
- `IDEMPOTENCY_KEY_REQUIRED` (400): 중복 요청 방지를 위한 헤더(`X-Idempotency-Key`) 누락.
- `LOCK_NOT_ACQUIRED` (503): 트래픽 폭주로 인한 데이터베이스 락 획득 실패.

---

## 5. 유저 가이드 문구 제안 (UI Guide)

유저가 에러 발생 시 상황을 쉽게 이해할 수 있도록 UI에서 아래와 같은 문구 노출을 권장합니다.

- **`BENEFITS_SUSPENDED`**: "최근 7일간 입금 내역이 없어 서비스 이용이 일시 제한되었습니다. 입금 후 즉시 해제됩니다."
- **`DEPOSIT_REQUIRED_TODAY`**: "오늘은 아직 입금 내역이 없습니다. 출금을 위해 먼저 입금을 진행해 주세요."
- **`PLAY_COUNT_INSUFFICIENT`**: "활동량이 부족합니다. 최근 3일간 게임을 {N}회 이상 플레이해야 출금이 가능합니다."
