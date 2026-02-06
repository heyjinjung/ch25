# 04. Golden V2 Ops & Marketing SoT (Master Expansion v2.2)

**문서 타입**: Operations & Marketing Guide (Authoritative)
**버전**: v2.2 (2026-02-06 - Massive Expansion)
**상태**: ✅ Active SoT (Extreme Detail)

---

## 1. 리텐션 전략 및 데일리 액션 (Retention & Nudge Strategy)

Golden V2 마케팅의 핵심은 유저에게 "매일 접속해야 할 구체적인 이유"를 제공하는 것입니다.

### 1.1 데일리 넛지 (Daily Nudge System)
- **발송 규격**: 매일 2회 (12:00, 19:00 KST).
- **보상 아이템**: `TRIAL_TICKET` (익일 09:00 소멸).
- **메시지 전략**: "지급된 티켓은 내일 아침이면 사라집니다!" - 손실 회피 심리(Loss Aversion) 자극.
- **자동화**: `GoldenSchedulerService`를 통해 활동 유저 세그먼트에게 자동 발송.

### 1.2 잠재고객 전환 캠페인 (Prospect Conversion)
- **대상**: 본사 데이터상 VIP/WHALE이나 V2 미가입자.
- **액션**: 닉네임 매칭 성공 시 "🎉 VIP 웰컴 패키지" 자동 증정 (골든아워 즉시 60분 발동).
- **목표**: 데이터 기반 우량 고객의 V2 조기 안착 유도.

---

## 2. ROI 성과 지표 및 정량화 (Analytics & ROI)

모든 마케팅 지액은 ROI(%)로 전환되어 운영의 효율성을 증명합니다.

### 2.1 캠페인 성과 메트릭 (Campaign Metrics)
| 지표명 | 계산 방식 | 목표값 (Target) |
| :--- | :--- | :--- |
| **User Count** | 개입 대상이 된 고유 유저 수 | - |
| **Total Cost** | 지급된 보상 원가 총합 (KRW) | 예산 범위 내 |
| **Intervention ROI** | (수익 - 비용) / 비용 * 100 | > 150% 권장 |
| **Conversion Rate** | 개입 후 1시간 내 게임 플레이 전환율 | > 35% |

### 2.2 실시간 수익 관제 (Revenue Radar)
대시보드는 다음의 순서로 데이터를 우선하여 표시합니다.
1.  **HQ 마진 데이터**: CSV를 통해 입력된 가장 정확한 실제 수익.
2.  **Game Log 데이터**: 내부에서 집계된 실시간 배팅/당첨액 기반 수익.
3.  **Revenue 배지**: 현재 화면에 표시된 데이터 소스(`HQ_MARGIN` vs `GAME_LOG`)를 명시적으로 상시 노출.

---

## 3. 위기 관리 및 운영 보안 (Crisis & Abuse Control)

### 3.1 어뷰징 감지 및 대응 (Abuse Radar)
- **중복 신고 차단**: `Latency Report` 시 TX ID가 이미 존재하거나 처리 중인 경우 즉시 반려.
- **반복 시도 제안**: 시간당 3회 초과 신고 시 해당 유저의 개입 시스템 접속을 24시간 차단.
- **Clawback UI**: 관제 시스템은 음수 잔액 유저를 붉은색 Glow 인디케이터로 별도 표시하여 운영자의 모니터링 강화.

### 3.2 롤백 및 복구 가이드 (Rollback Plan)
- **상황**: 대량 자동 개입 오작동 또는 시스템 오류.
- **액션**: `V2AdminOpsService.rollback_plan(batch_id)` 실행.
- **결과**: 해당 배치로 지급된 모든 미사용 재화 회수 및 이미 사용된 경우 음수 잔액으로 강제 전환.

---

## 4. 운영 워크플로우 승인 체계 (Approval Flow)

Golden V2는 **Human-in-the-loop** 원칙을 고수합니다.

1.  **Selection**: 운영자가 특정 세그먼트(예: VIP) 전체를 선택하거나 트리거된 개입을 체크.
2.  **Simulation**: 보상 지급 시 예상 ROI와 총 비용을 대시보드에서 사전 시뮬레이션.
3.  **Approval**: 운영자 계정 2차 인증 후 최종 승인 (`SENT`).
4.  **Audit**: 액션 완료 후 감사 로그 테이블에 운영자 ID, 시각, 대상, 비포/애프터 상태 기록.

---
> [!TIP]
> **Zeigarnik Effect**를 극대화하기 위해, `Latency Survival` 신고 완료 후 결과 대기 화면에서 실시간 "확인 진행률"을 시각화하십시오. 이는 사용자의 이탈을 막는 강력한 심리적 고리가 됩니다.
