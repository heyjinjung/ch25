---
Project: Golden
Type: Report
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-18
---

# 모니터링 지표/알람 기준 (v1)

본 문서는 Phase 4 Step 1의 산출물로, **대시보드 지표 매핑**과 **알람 기준(초안)**, **운영 메모**를 정리합니다.

---

## 1) 지표 매핑 (대시보드 ↔ 이벤트)
- LOSS_STREAK: 이벤트 수 (일/주) → `LOSS_STREAK 이벤트 수`
- ASSET_DEPLETION: 이벤트 수 (일/주) → `ASSET_DEPLETION 이벤트 수`
- SESSION_END: 이벤트 수 (일/주) → `SESSION_END 이벤트 수`
- 실험군 분배: Control/FreeSpin/Cashback/Mission → `실험군 분배 비율`

참조: [docs/09_marketing/golden/04_report/golden_dashboard_metrics_v1.md](docs/09_marketing/golden/04_report/golden_dashboard_metrics_v1.md)

---

## 2) 알람 기준 (초안)
- 일 단위 급증: 전일 대비 +X% (TBD)
- 주 단위 급증: 최근 4주 평균 대비 +Y% (TBD)
- 실험군 분배 편차: 목표 분배 대비 ±Z%p (TBD)

---

## 3) 운영 메모 기록
- 기준 확정일:
- 담당자:
- 적용 범위:
- 비고:
