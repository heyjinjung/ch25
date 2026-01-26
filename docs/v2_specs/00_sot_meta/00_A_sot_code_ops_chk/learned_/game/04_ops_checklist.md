# 04_ops_checklist.md 🔧

## 한줄 요약
상점 관련 이슈(Strict Vault Policy, Empty Shop, Enum Drift)에 대해 운영자가 따라야 할 체크리스트와 Runbook을 정리합니다.

---

## 공통 사전 준비
- 연락처: 담당자(Dev, SRE, Product, Ops) 목록 업데이트
- 권한: DB 백업/복원 권한, 운영자 UI rollback 권한 확보
- 모니터링: Sentry DSN, Slack Ops 채널, Grafana 대시보드

---

## Incident Runbook: Suspended User Purchase Attempts
1. Alert: `shop.purchase_blocked_benefits_suspended` firing
2. Triage:
   - Inspect Sentry events and logs, extract user_id and request payload
   - Verify user row: `SELECT benefits_suspended, last_deposit_at FROM user WHERE id = ?`
3. Immediate action:
   - If false positive (user shouldn't be suspended): update `benefits_suspended=false` and document reason
   - If attackiness (many attempts): rate-limit IP, notify security
4. Postmortem:
   - Review the suspension criteria, adjust thresholds if needed

---

## Incident Runbook: Empty Shop
1. Alert: `shop.product_count == 0`
2. Triage:
   - Check `v2_shop_products` table for records
   - Check UI Config JSON/DB and Ops UI logs for recent edits
3. Immediate action:
   - Restore from last known good config (DB backup/ops history)
   - If necessary, set maintenance flag and notify users
4. Postmortem:
   - Add validation on ops UI to prevent empty saves

---

## Deployment Checklist (for patches)
- [ ] Create PR with code + tests + migration
- [ ] Run unit tests + integration tests locally
- [ ] Apply migration in staging and run smoke tests
- [ ] Rollout via canary with monitoring for 24h
- [ ] Post-deploy verification (see Verify Checklist in docs)

---

## Verify Checklist (short)
- Suspended purchase → 403, no order written
- Empty shop → alert fires, UI shows maintenance/fallback
- Enum mismatch → CI fails on tests

---

> Keep runbooks concise and link to this doc in the internal ops wiki for quick access.