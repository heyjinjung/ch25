# 신규회원 Vault 해금(E2E) 운영 점검 런북

목표: 관리자 external-ranking 업서트에서 `deposit_amount`를 증가시켰을 때,
- `user.vault_balance`가 0으로 내려가고
- `user.cash_balance`가 증가하며
- `user_cash_ledger`에 `reason = VAULT_UNLOCK` 원장이 1건 생성되는지
끝까지(E2E) 확인합니다.

## 사전조건
- `docker compose up -d`로 `backend`, `db`가 실행 중
- DB 접속 정보가 기본값이 아니라면 스크립트 인자를 조정
  - root 비밀번호 기본값: `rootpassword`
  - DB 이름 기본값: `xmas_event`

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
- 대상 유저의 `vault_balance`를 10,000으로 시드하고 `cash_balance`를 0으로 초기화
- `VAULT_UNLOCK` 원장만 삭제해 결과를 결정적으로 만듦
- `POST /admin/api/external-ranking/`으로 `deposit_amount`를 0 → 1로 올려 훅을 트리거
- DB에서 vault/cash/원장 건수를 조회하고 실패 시 즉시 중단

## 참고: 어드민 업서트 API
- URL: `POST http://localhost:8000/admin/api/external-ranking/`
- Body 예시:
  - `[{"user_id": 1, "deposit_amount": 1, "play_count": 0, "memo": "E2E"}]`
