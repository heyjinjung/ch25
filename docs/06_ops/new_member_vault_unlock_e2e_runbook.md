# 신규회원 Vault 해금(E2E) 운영 점검 런북

목표: 관리자 external-ranking 업서트에서 `deposit_amount`를 증가시켰을 때,
- `user.vault_locked_balance`가 감소하고 (`vault_balance` mirror도 함께 동기화)
- `user.cash_balance`가 증가하며
- `user_cash_ledger`에 `reason = VAULT_UNLOCK` 원장이 1건 생성되는지
끝까지(E2E) 확인합니다.

## 사전조건
- `docker compose up -d`로 `backend`, `db`가 실행 중
- Admin API 인증
  - 로컬 개발 환경이 `TEST_MODE=1`이면 토큰 없이도 동작합니다.
  - 그렇지 않다면 어드민 토큰을 사용해야 하며, 이 런북의 PowerShell 스크립트는 현재 토큰 주입을 지원하지 않습니다(필요 시 스크립트 확장).
- DB 접속 정보가 기본값이 아니라면 스크립트 인자를 조정
  - root 비밀번호 기본값: `root`
  - DB 이름 기본값: `xmas_event_dev`

## 실행
PowerShell에서:

- 기본(user_id=1 사용):
- 기본(기본값 user_id=1, 없으면 첫 유저 자동 선택/생성):
  - `powershell -ExecutionPolicy Bypass -File scripts/e2e_vault_unlock_from_external_ranking.ps1`

- 다른 유저로 실행:
  - `powershell -ExecutionPolicy Bypass -File scripts/e2e_vault_unlock_from_external_ranking.ps1 -UserId 123`

- DB 정보가 다를 때:
  - `powershell -ExecutionPolicy Bypass -File scripts/e2e_vault_unlock_from_external_ranking.ps1 -MysqlRootPassword <pw> -MysqlDatabase <db>`

## 무엇을 하는가(요약)
- `new_member_dice_eligibility`를 활성화 상태로 upsert
- 대상 유저의 `vault_locked_balance`를 시드하고 `vault_balance`를 mirror로 동일 값으로 세팅, `cash_balance`를 0으로 초기화
- `VAULT_UNLOCK` 원장만 삭제해 결과를 결정적으로 만듦
- `POST /admin/api/external-ranking/`으로 `deposit_amount`를 0 → 50,000(기본값)으로 올려 훅을 트리거
  - Tier A: 10,000 증가 시 5,000 해금
  - Tier B: 50,000 증가 시 10,000 해금
- DB에서 vault/cash/원장 건수를 조회하고 실패 시 즉시 중단

## 참고: 어드민 업서트 API
- URL: `POST http://localhost:8000/admin/api/external-ranking/`
- Body 예시:
  - Tier A 예시: `[{"user_id": 1, "deposit_amount": 10000, "play_count": 0, "memo": "E2E"}]`
  - Tier B 예시: `[{"user_id": 1, "deposit_amount": 50000, "play_count": 0, "memo": "E2E"}]`

## (선택) Vault2 전이 tick 호출
Vault2 스캐폴딩의 상태 전이(LOCKED→AVAILABLE, 옵션으로 AVAILABLE→EXPIRED)를 실제로 돌리고 싶다면,
관리자 엔드포인트를 통해 tick을 실행할 수 있습니다.

- URL: `POST http://localhost:8000/admin/api/vault2/tick?limit=500`
- 반환: `{ "updated": N }`

주의
- 이 tick은 `vault2_status` 레코드의 전이만 처리합니다.
- 현재 v1 경제(locked 감소 + cash 지급)에는 영향을 주지 않습니다.
- 전이 대상은 `vault2_status.expires_at <= now`인 LOCKED 상태여야 합니다.
