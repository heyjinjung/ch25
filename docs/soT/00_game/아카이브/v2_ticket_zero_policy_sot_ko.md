문서 타입: 게임 정책/로직
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 기획/개발 팀
상태: SoT

# V2 Ticket Zero Policy SoT (티켓 제로: 긴급 구호 정책)

## 1. 목적
모든 재화를 소진하여 게임을 더 이상 즐길 수 없는 유저(파산 상태)에게 **최소한의 재기 기회**를 제공하여 이탈을 방지한다.

## 2. 발동 조건 (Trigger Conditions)
다음 조건을 **모두(AND)** 만족해야 한다.

1.  **Zero Balance**: 사용 가능한 `POINT`, `Ticket` 잔액이 모두 0이어야 한다.
2.  **No Pending Rewards**: 미수령한 미션 보상이나 우편함 아이템이 없어야 한다.
3.  **Cooldown**: 마지막 티켓 제로 수령 후 **24시간**이 경과해야 한다.

## 3. 지급 정책 (Grant Policy)

| 구분 | 내용 |
| :--- | :--- |
| **제공 보상** | `ROULETTE_TICKET` x 1 |
| **지급 방식** | 메인 화면 진입 시 "LUCKY SAVE" 팝업 노출 후 즉시 지급 |
| **악용 방지** | 동일 IP/기기 내 다계정 수령 제한 (Fraud Filter 연동) |

## 4. 로직 상세 (Logic Detail)
1.  **Check**: 유저가 메인/게임 로비에 진입(`GET /status` 호출) 시 백엔드가 잔액 검사.
2.  **Condition**: `Wallet + Inventory == 0` 확인.
3.  **Offer**: Response에 `bailout_available: true` 플래그 반환.
4.  **Claim**: 유저가 팝업의 "구조 요청" 버튼 클릭 -> `POST /api/retention/bailout` 호출.
5.  **Log**: `Action: BAILOUT_GRANT`, `Amount: 1 Ticket` 기록.

## 5. 변경 이력
- v1.0 (2026-01-19, Antigravity Agent): 기존 구두 정책 문서화 및 SoT 등재.
