# 04. Golden V2 Ops & Marketing SoT (Master Expanded)

**문서 타입**: Operations & Marketing Guide (Authoritative)
**버전**: v2.1 (2026-02-06)
**상태**: ✅ Active SoT

---

## 1. 리텐션 및 마케팅 전략 (Marketing Strategy)

### 1.1 데일리 넛지 (Daily Nudge)
매일 고정된 시간에 유저의 접속 명분을 제공하는 핵심 고정 시스템입니다.
- **발송 시각**: 매일 **12:00** (점심), **19:00** (퇴근) KST 2회 실행.
- **보상 규격**: `TRIAL_TICKET` 1장 지급.
- **소멸 로직**: "내일 아침 9시면 사라집니다"라는 메시지를 통해 즉시 참여 유도 (익일 09:00 자동 소각).
- **타겟**: 최근 7일 내 1회 이상 활동한 모든 비제재 유저.

### 1.2 심리적 락인 (Psychological Lock-in)
- **Zeigarnik Effect**: 지연 대응 시 "확인 중" 프로그레스 바를 노출하여 사용자가 결과를 확인하기 위해 계속 접속하게 유도.
- **Wait-time Bonus**: 입금 지연 시간이 길어질수록 비례하여 소정의 포인트나 티켓 보너스를 점진적으로 적립(UI 시각화).

---

## 2. ROI 분석 및 성과 측정 (ROI & Analytics)

모든 운영 액션은 경제적 가치로 환산되어 평가됩니다.

### 2.1 ROI 계산 공식
**ROI (%) = [(실제 수익 - 개입 비용) / 개입 비용] * 100**
- **비용 (Cost)**: `지급 보상량 * Config 원가`. (예: 티켓 1장 = 100원).
- **수익 (Return)**: 개입 시점(`sent_at`)으로부터 **24시간/7일** 내 해당 유저가 발생시킨 `Vault Spent` + `Ad View Value` + `Game Play Value`.

### 2.2 가치 기준 (Value Config)
| 항목 | 가정 가치 (Baseline) | 비고 |
| :--- | :--- | :--- |
| **티켓 원가** | 100 KRW | 시스템 경제 모델 기준 |
| **로그인 가치** | 50 KRW | DAU 기여도 기반 |
| **광고 시청 가치** | 10 KRW | eCPM 평균 환산 |
| **게임 플레이** | 5 KRW | 네트워크 기여도 |

---

## 3. 운영 관제 및 모니터링 가이드 (Monitoring Guide)

### 3.1 실시간 관리 대시보드 (Ops Dashboard)
- **VIP/WHALE 추적**: 본사 마진 기반 세그먼트 유저의 실시간 활동 감지.
- **이탈 위험군 (Risk Users)**: 5연패 이상 유저를 레이더에 빨간색 점으로 표시.
- **수익 현황**: `오늘 수익 = (본사 마진 합계) - (내부 지출 합계)`를 실시간으로 집계하여 표시.

### 3.2 위기 관리 및 대응 (Crisis Control)
- **Abuse Alert**: 단일 유저가 시간당 3회 이상 지연 신고를 시도하거나, 비정상적인 당첨률을 보일 경우 알람 발생.
- **Rollback Procedure**: 오발송이나 시스템 오류 시 `V2AdminOpsService.rollback_plan`을 통해 즉시 보상 회수 및 상태 원복.

---

## 4. 운영 프로세스 및 승인 체계 (Workflow)
1.  **Plan**: 운영자가 `OpsPlan`을 생성하여 목표 세그먼트와 보상 설정.
2.  **Verify**: ROI 시뮬레이터를 통해 예상 비용 확인.
3.  **Execute**: 승인 완료 후 발송.
4.  **Audit**: 감사 로그(`V2AdminAuditService`)에 모든 액션 기록.

---
> [!TIP]
> 성과가 저조한 개입 트리거는 ROI 분석 결과에 따라 즉시 배율을 조정하거나 비활성화해야 합니다. 모든 과거 집계 데이터는 `Archive/` 폴더의 ROI 분석 문서를 참고하십시오.
