---
Project: Golden
Type: Report
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# Golden 대시보드 수집 지표 확정 (v1)

본 문서는 Phase 2 "대시보드 수집 지표 확정" 산출물입니다.
기존 운영/대시보드 API에서 제공 중인 지표를 Golden 관점으로 확정합니다.

---

## 1) 실시간/일간 핵심 지표 (요약 카드)
- 금일 활성 유저 수 (today_active_users)
- 금일 게임 플레이 수 (today_game_plays)
- 금일 티켓 사용량 (today_ticket_usage)
- 외부 랭킹 입금 합계/건수 (today_deposit_sum, today_deposit_count)
- 금고 총 잔액 (total_vault_balance)
- 인벤토리 부채 총액 (total_inventory_liability)

## 2) 리텐션/위험 지표
- D-2 웰컴 리텐션율 (welcome_retention_rate)
- 이탈 위험군 수 (churn_risk_count)
- 스트릭 위험군 수 (streak_risk_count)

## 3) 이벤트/개입 모니터링 지표
- LOSS_STREAK 이벤트 수 (일/주)
- ASSET_DEPLETION 이벤트 수 (일/주)
- SESSION_END 이벤트 수 (일/주)
- 실험군 분배 비율 (Control/FreeSpin/Cashback/Mission)

## 4) 정산/효율 지표
- 금고 지급액 합계 (total_vault_paid)
- 입금 대비 지급 비율 (vault_payout_ratio)

## 5) 참고 API/스키마
- Admin Dashboard: dashboard metrics / events status
- Daily overview: 리텐션 위험 & 정산 요약

---

## 운영 메모
- 지표는 KST 기준 일 단위로 집계
- 실험군 분배는 해시 기반 고정 할당
- 대시보드 상세 드릴다운은 metric_details 사용
