# 01_strict_vault_policy.md ✅

## 한줄 요약
**문제**: SoT(Strict Vault Policy)에 따라 7일 무입금 유저(`benefits_suspended=True`)는 상점 구매를 차단해야 하나, 현재 `ShopService.purchase` 및 라우트에서 해당 검사가 누락되어 있습니다. 긴급 패치 필요.

---

## 영향 범위
- 사용자: 제재된 유저가 상점에서 구매 가능 → 정책 위반, 부정행위 가능성
- 코드: `app/v2/services/shop_service.py`, `app/v2/api/routes.py`
- DB: `user` 테이블에 `benefits_suspended` 컬럼 필요 여부 확인

---

## 세부 패치 가이드 (단계별) 🔧

### 1) 사전 확인 (한 번만)
- `app/v2/models/user.py` 또는 DB에서 `benefits_suspended` 컬럼 존재 확인:
  - MySQL: `SHOW COLUMNS FROM user;` 또는 `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user' AND COLUMN_NAME='benefits_suspended';`

### 2) DB 마이그레이션 (컬럼이 없을 경우)
- Create alembic migration (파일명 예: `20260126_add_benefits_suspended_to_user.py`)
- SQL:
```sql
ALTER TABLE `user`
  ADD COLUMN `benefits_suspended` BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX `idx_user_benefits_suspended` ON `user` (`benefits_suspended`);
```
- Rollback: `ALTER TABLE user DROP COLUMN benefits_suspended;`

### 3) 서비스 레이어 패치
- 파일: `app/v2/services/shop_service.py`
- 위치: `purchase()` 함수 진입부
- 변경(예시):
```py
from fastapi import HTTPException

# inside purchase()
if V2UserService.is_benefits_suspended(user_id):
    # log / metrics
    raise HTTPException(status_code=403, detail="benefits_suspended")
```
- 구현 세부: `V2UserService.is_benefits_suspended`가 없다면 `V2UserService.get_user(user_id).benefits_suspended`로 확인

### 4) 라우트 레이어 방어 (중복 방어)
- 파일: `app/v2/api/routes.py` (POST `/api/v2/shop/purchase` 핸들러)
- 변경: 핸들러 초입부에서 `if user.benefits_suspended: return 403` (빠른 실패)

### 5) 로깅/모니터링
- Sentry: capture event with tag `reason:benefits_suspended` when blocked
- Slack/ops: increment metric `shop.purchase_blocked_benefits_suspended`
- Threshold alert: >10 attempts/hour → ops channel

---

## 테스트 케이스 (필수)
- Unit tests:
  - `test_purchase_blocked_when_benefits_suspended` (mock `V2UserService` to return True → `HTTPException(403)`)
  - `test_purchase_allowed_when_not_suspended` (normal path)
- Integration tests:
  - Create user row `benefits_suspended = TRUE`, call `/api/v2/shop/purchase` → assert 403 and no `v2_shop_order` row created
- Regression tests: existing purchase tests must still pass

---

## 운영 체크리스트 (Rollout)
1. QA: run new unit & integration tests locally and in CI
2. Staging: apply migration, run smoke purchases for suspended/non-suspended users
3. Canary: deploy to subset, monitor `purchase` errors & alert metrics
4. Full rollout: after 24h of stable metrics

---

## Verify Checklist ✅
- [ ] Migration applied in staging
- [ ] Unit + integration tests pass
- [ ] Suspended user purchase returns 403 and leaves no order/log
- [ ] Sentry events logged, Slack alert triggers on simulated bursts

---

## Ship Notes & Risks
- Risk: incorrectly suspending users will block legitimate purchases; include support runbook to whitelist or revert `benefits_suspended` for specific users.
- Rollback: revert code changes and remove order-blocking check until investigation complete.

---

> Reference SoT: `v2_strict_vault_policy_sot_ko.md` (policy source of truth)
