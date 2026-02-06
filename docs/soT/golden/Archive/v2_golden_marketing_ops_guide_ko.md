# Golden Project Marketing & Ops Master Guide

**문서 타입**: Master SOT (Integrated)
**도메인**: Marketing / Retention / Data
**상태**: ✅ Active

---

## 1. 개요 (Overview)

Golden V2의 마케팅 및 운영 전략은 **"Automated Retention"**과 **"Evidence-based ROI"**를 지향합니다. 본 문서는 데일리 넛지, ROI 계산기 및 실험 정책에 대한 마케팅 가이드를 통합합니다.

## 2. 데일리 넛지 (Daily Nudge)

유저의 재방문을 유도하기 위한 자동화된 리텐션 장치입니다.

- **작동 시간**: 매일 12:00, 19:00 KST (사용자 정점 시간대).
- **보상**: `TRIAL_TICKET` (1장).
- **소멸 정책**: 익일 **09:00 KST** 자동 소멸 (Use it or Lose it 전략).
- **타겟팅**: 최근 3일 내 활동 유저 중 당일 미접속자.

## 3. 리텐션 ROI 분석 (ROI Calculator)

개입(Intervention)의 경제적 효율성을 측정합니다.

- **비용 (Cost)**: 지급된 보상의 원가 (예: 티켓당 100원).
- **수익 (Return)**: 개입 후 24시간 내 발생한 금고 사용액, 광고 시청, 게임 횟수.
- **지표**: ROI (%) = (Return - Cost) / Cost * 100.
- **성공 기준**: 단순히 수익 합계보다 **A/B 캠페인 간의 상대적 효율 비교**에 집중.

## 4. 운영 정책 및 안전장치

### 4.1 서킷 브레이커 (Circuit Breaker)
과도한 마케팅 재화 살포로 인한 경제 붕괴를 막기 위해, 전역/단일 유저별 보상 지급 임계치(`Threshold`)를 설정하고 초과 시 자동 차단합니다.

### 4.2 롤백 (Rollback)
오발송되거나 어뷰징으로 판명된 개입 액션은 `V2AdminOpsService`를 통해 즉시 롤백 및 보상 회수를 수행합니다.

## 5. 시스템 연동 파일
- `golden_scheduler_service.py`: 넛지 및 스케줄링.
- `v2_retention_roi_service.py`: ROI 계산 로직.
- `v2_admin_ops_plan_service.py`: 캠페인 실행 및 관리.

---
**관련 아카이브**: `docs/SOT/golden/Archive/` 내 2026_01_29_* 문서 참조
