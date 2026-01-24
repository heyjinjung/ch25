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
- 일 단위 급증: 전일 대비 +50%
- 주 단위 급증: 최근 4주 평균 대비 +30%
- 실험군 분배 편차: 목표 분배 대비 ±5%p

---

## 3) 운영 메모 기록
- 기준 확정일: 2026-01-18
- 담당자: USER
- 적용 범위: Golden Phase 4 모니터링(LOSS_STREAK/ASSET_DEPLETION/SESSION_END/실험군 분배)
- 비고: 이벤트 급증 임계치는 보수적으로 설정(일/주 급증 +50%/+30%), 분배 편차는 ±5%p
