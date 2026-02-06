# Golden V2 Game Engagement & Team Battle Master SoT

**문서 정보**
- **문서 타입**: 인게이지먼트 및 팀배틀 통합 마스터 SoT (Engagement & Team Battle Master)
- **버전**: v1.0
- **최종 업데이트**: 2026-02-06
- **상태**: 🟢 완료
- **대상**: 개발팀, 기획팀, QA팀, 운영팀

---

## 1. 개요
본 문서는 Golden V2의 신규 유저 미션, 팀배틀 시스템, 실시간 개입(Intervention) 트리거 및 긴급 구호(Bailout) 정책을 하나로 통합한 마스터 가이드입니다. 5개의 개별 인게이지먼트 및 팀배틀 SoT 문서를 기반으로 하며, 유저 리텐션 강화와 공정한 경쟁 시스템 운영을 위한 핵심 지침을 제공합니다.

---

## 2. 신규 유저 미션 로직 (New User Missions)
*참조: [v2_new_user_mission_logic_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_new_user_mission_logic_sot_ko.md)*

신규 가입 유저의 조기 정착을 위해 설계된 전용 미션 체계입니다.

### 2.1 미션 구성 및 보상
- **Welcome (즉시)**: 
    - 가입 축하금 (`welcome_signup`): 3,000 POINT.
    - 텔레그램 연동 (`welcome_telegram`): 룰렛티켓 1장.
- **Starter (달성)**: 
    - 게임 플레이 (룰렛/다이스): 각 1회 완료 시 EXP 100 또는 티켓 지급.
    - 첫 당첨 (`start_first_win`): 1,000 POINT.
    - 첫 입금 (`start_first_deposit`): Starter Pack A (번들).
- **커뮤니티**: 텔레그램 채널 가입 확인 (`verifyChannel`) 시 피자 기프티콘 1만원권 지급.

### 2.2 자격 및 UX 표준
- **유효 기간**: 가입 시점으로부터 **정확히 7일 (168시간)**.
- **FAB 타이머**: 메인 화면에 실시간 카운트다운(`HH:MM:SS`)을 포함한 골드/옐로우 테마의 플로팅 버튼 노출. 만료 1시간 전 점멸 효과 적용.
- **만료 처리**: 168시간 경과 시 신규 유저 탭 및 혜택 즉시 종료.

---

## 3. 팀배틀 시스템 표준 (Team Battle Specs)
*참조: [v2_team_battle_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_team_battle_sot_ko.md), [v2_team_battle_rebuild_plan_v1.0.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_team_battle_rebuild_plan_v1.0.md)*

팀 단위 경쟁을 통해 보상을 획득하는 고도화된 게임 모드입니다.

### 3.1 시즌 및 팀 구성
- **롤링 시즌**: 활성 시즌이 없을 경우 **2일 주기**의 롤링 시즌을 자동 생성.
- **팀 인원 제한**: 팀당 최대 **7명** (`TEAM_MAX_MEMBERS = 7`).
- **참여 제한**: 시즌 시작 후 **48시간** 이내에만 팀 선택 가능.
- **자동 배정**: 특정 조건 만족 시 시스템이 유저를 적절한 팀에 `auto-assign` 함.

### 3.2 점수 산정 및 정산 (Settlement)
- **포인트 규칙**: 판당 기본 5점 (`POINTS_PER_PLAY`), 일일 획득 캡(`DAILY_PLAY_CAP`) 적용.
- **보상 기준**: 최소 **350점** 이상 기여 시 보상 참여 자격 부여.
- **현행 보상**: 수동 지급(Manual) 전제로 `manual_coupon` 형태의 결과값 반환 (1등 30만, 2등 20만, 3등 5만).
- **고급 보상 (Recent Depositors)**: 최근 3일 이내 입금 유저가 350점/500점 도달 시 금고 포인트 및 유료 티켓 번들 추가 자동 지급.

---

## 4. 실시간 개입 및 분석 정책 (Golden Intervention)
*참조: [v2_sot_game_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_sot_game_ko.md)*

유저의 게임 로그(`V2GameLog`)를 실시간으로 분석하여 운영 개입 여부를 결정합니다.

### 4.1 트리거 및 액션 (Triggers)
- **연패 감지 (`TRG_LOSE_5`)**: 5연속 패배 시 `golden_intervention_worker`가 개입 로그 생성.
- **잔액 급감 (`TRG_BAL_DROP_50`)**: 이전 세션 대비 잔액이 50% 이상 감소 시 경고.
- **이탈 위험도 (Churn Risk)**: 최근 10게임 중 패배 7회 이상 또는 합계 손실 50만↑ 발생 시 **HIGH** 위험군으로 분류, 즉시 개입 권고.

### 4.2 데이터 흐름 및 CSV 표준
- **입력**: Admin을 통한 외부 카지노 로그 CSV 업로드 (`import_job_id` 매핑).
- **분석**: Redis Pub/Sub을 통한 실시간 이벤트 발행 → 분석 워커 처리.

---

## 5. 긴급 구호 정책 (Ticket Zero: Lucky Save)
*참조: [v2_ticket_zero_policy_sot_ko.md](file:///c:/Users/JAVIS/ch/ch25/docs/SOT/game/v2_ticket_zero_policy_sot_ko.md)*

파산 상태인 유저의 이탈을 방지하기 위한 최소한의 재기 기회 제공 정책입니다.

### 5.1 발동 조건 (All AND)
1. **Zero Balance**: 포인트 및 티켓 잔액이 완전한 0일 것.
2. **No Pending Rewards**: 미수령 미션 보상이나 우편함 아이템이 없을 것.
3. **Cooldown**: 마지막 수령 시점으로부터 **24시간** 경과.

### 5.2 지급 및 악용 방지
- **보상**: `ROULETTE_TICKET` 1장.
- **프로세스**: 메인 진입 시 `bailout_available: true` 응답 → "LUCKY SAVE" 팝업 노출 → 유저 요청 시 `BAILOUT_GRANT` 기록 후 지급.
- **차단**: 동일 IP/기기 중복 수령 시 Fraud Filter에 의해 차단됨.

---

## 6. 기술 검증 및 운영 체크리스트
- **[ ] 미션 만료**: 가입 후 168시간 시점에 신규 유저 탭이 서버 응답에서 제거되는가?
- **[ ] 팀배틀 정산**: 350점 미만 유저에게 보상 DTO가 생성되지 않는지 확인했는가?
- **[ ] 개입 트리거**: 5연패 발생 시 `V2GoldenInterventionLog`가 수 초 내에 생성되는가?
- **[ ] 구호 중복**: 24시간 이내에 `Lucky Save` 팝업이 재노출되지 않는가?
- **[ ] KST 정합성**: 시즌 생성 및 포인트 롤링이 KST 00:00(또는 지정 시각)에 정확히 수행되는가?

---

*본 문서는 Golden V2의 유저 인게이지먼트와 경쟁 시스템의 핵심을 정의하는 SoT이며, 모든 미션/팀배틀 로직 확장 시 본 가이드를 최우선으로 준수해야 합니다.*
