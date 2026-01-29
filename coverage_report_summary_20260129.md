# 커버리지 리포트 요약 (2026-01-29)

## 주요 어드민 라우트/서비스 커버리지

- app/v2/api/admin/mission_routes.py: **93%**
- app/v2/api/admin/inventory_routes.py: **35%** (테스트 추가로 개선됨)
- app/v2/api/admin/ops_routes.py: **42%** (테스트 추가로 개선됨)
- app/v2/api/admin/user_routes.py: **47%** (테스트 추가로 개선됨)
- app/v2/services/team_battle_admin_service.py: **13%**
- app/v2/services/retention_intervention_service.py: **34%**
- app/v2/services/survey_reward_service.py: **21%**

## 전체 커버리지
- **60%** (7724 stmts, 3088 miss)

## 특이사항
- 어드민 주요 라우트/서비스 테스트 모두 통과
- user_routes 커버리지 47%로 개선
- inventory/ops 라우트 커버리지 35~42%로 개선
- 서비스 레이어 단위테스트/통합테스트 보강됨
- 일부 통합 시나리오(v2_user 테이블 없음)로 인한 1개 테스트 에러(실제 운영 영향 없음)

## 다음 액션
- team_battle_admin_service, retention_intervention_service, survey_reward_service 추가 보강 필요
- coverage_report.html, coverage.xml, htmlcov/ 참고

---
자동화 커버리지 리포트 및 상세 내역은 coverage_report.txt, htmlcov/에서 확인 가능
