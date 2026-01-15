# 핵심 경제체계 용어 정리 (Core Economy Glossary)

문서 타입: 용어집(Glossary) / 운영·개발 공통 기준
버전: v1.1
작성일: 2026-01-16
작성자: 
대상: 운영/기획/개발(Backend/Frontend)
상태: SoT(용어) / 동작·정책 SoT는 `unified_economy_and_progression_ko.md`를 우선

## 1. 목적 (Purpose)
- 경제/보상/성장(시즌패스) 관련 용어를 “하나의 언어”로 통일해 운영·개발 커뮤니케이션 비용을 낮춘다.
- SoT(진실의 근원) 테이블/필드/로그를 함께 명시해, 장애/정산/운영 문의 시 빠르게 근거를 찾게 한다.

## 2. 범위 (Scope)
- 포함: 금고(Vault), 현금(Cash), 포인트(POINT/CC_POINT), 시즌 XP(GAME_XP), 게임 토큰(티켓/키), 인벤토리(다이아/기프티콘/바우처), 보상 타입/로그/멱등성 키.
- 제외: 외부 결제/환불, 팀배틀/랭킹 보상(별도 문서), Vault2(프로그램 전이)의 활성화 정책 결정.

## 3. 표준 규칙 (Standards)

### 3.1 SoT 우선순위(중요)
- **금고 SoT**: `user.vault_locked_balance`
- **시즌 XP/레벨 SoT**: `season_pass_progress.current_xp/current_level`
- **게임 토큰 SoT**: `user_game_wallet(balance)`
- **인벤토리(아이템/기프티콘/바우처) SoT**: `user_inventory_item` + `user_inventory_ledger`
- **주의(레거시)**: `user.cash_balance`는 “현금 SoT”이긴 하나, **신규 포인트성 보상(POINT/CC_POINT)은 금고로만 적립**(cash 신규 write 금지)

### 3.2 단위/표기 규칙
- `POINT/CC_POINT`의 `reward_amount`: 금액(정수)이며, UI에서는 관례적으로 “원/포인트”로 표기될 수 있으나 **정산/정의는 금액(원) 기준으로 본다**.
- `GAME_XP`의 `reward_amount`: XP(정수)이며, 금액이 아니다.

### 3.3 골든아워 배율 규칙
- 골든아워 배율은 **금고 적립 금액에만 적용**되며, XP에는 적용하지 않는다.

---

## 4. 용어 정의 (Definitions)

### 4.1 핵심 자산/계정(경제)

| 용어(권장) | 코드/키워드 | SoT(테이블.필드) | 정의 | 로그/레저(대표) | 주의사항 |
| --- | --- | --- | --- | --- | --- |
| 금고(잠금) | Vault Locked | `user.vault_locked_balance` | 포인트/현금성 보상이 최종 누적되는 단일 잔액 | `vault_earn_event(earn_event_id, amount, source, earn_type)` | “포인트=금고”로 혼동하지 말고, **금고는 금고 로그로만 판단** |
| 금고(가용) | Vault Available | `user.vault_available_balance` | 잠금에서 가용으로 전이된 출금 가능 잔액(Phase 2 스캐폴드) | (정책/전이 로그는 Vault2 쪽에 존재) | 현재 정책상 비활성/미사용일 수 있음(활성/폐기 결정 필요) |
| 금고(레거시 미러) | vault_balance | `user.vault_balance` | 과거 잔액 미러/호환용 필드 | - | 읽기 전용 권장(혼선 방지) |
| 현금 잔액 | Cash Balance | `user.cash_balance` | 출금 가능 잔액(현금 SoT) | `user_cash_ledger(delta, balance_after, reason, meta_json)` | **신규 보상 지급 경로로 사용 금지**(레거시/운영툴/디버그 외) |
| 환전(출금) | Exchange / Withdraw | (정책) | 금고 누적액을 외부 환전 가능한 흐름으로 전환/신청하는 개념 | (운영/프로그램 로그) | 최소 환전 가능액(예: 10,000원) 같은 정책이 존재 |

### 4.2 보상 타입(Reward Types)

| 용어(권장) | reward_type | 지급 경로(요약) | 정의 | 주의사항 |
| --- | --- | --- | --- | --- |
| 없음 | `NONE` | - | 보상 없음 | no-op |
| 금고 적립(포인트) | `POINT` | Vault로 적립 | “현금성 금액” 보상 | `cash_balance`로 직접 지급 금지 |
| 금고 적립(외부포인트) | `CC_POINT` | Vault로 적립 | 외부 포인트 계열 보상 | `POINT`와 동일 취급(금고) |
| 시즌 XP | `GAME_XP` | SeasonPass로 적립 | 경험치 전용 보상 타입 | 금고/포인트와 절대 혼동 금지 |
| 다이아 | `DIAMOND` | Inventory로 적립 | 상점 결제/교환권 구매 재화 | GameTokenType에 `DIAMOND`가 있어도 SoT는 인벤토리 |
| 기프티콘(배민) | `GIFTICON_BAEMIN` | Inventory 지급대기 | 배민 상품권 | item_type은 `BAEMIN_GIFTICON_{금액}` |
| 기프티콘(컴포즈) | `GIFTICON_COMPOSE` | Inventory 지급대기 | 컴포즈 커피 | item_type은 `COMPOSE_AMERICANO_GIFTICON_{금액}` |
| 기프티콘(씨씨코인) | `CC_COIN`/`CC_COIN_GIFTICON` | Inventory 지급대기 | 씨씨코인 계열 | item_type은 `CC_COIN_GIFTICON` |
| 티켓 지급(룰렛) | `TICKET_ROULETTE`/`ROULETTE_TICKET` | Wallet | 룰렛 토큰 지급 | 실제 토큰은 `ROULETTE_COIN` |
| 티켓 지급(주사위) | `TICKET_DICE`/`DICE_TICKET` | Wallet | 주사위 토큰 지급 | 실제 토큰은 `DICE_TOKEN` |
| 티켓 지급(복권) | `TICKET_LOTTERY`/`LOTTERY_TICKET` | Wallet | 복권 토큰 지급 | 실제 토큰은 `LOTTERY_TICKET` |
| 키 지급 | `GOLD_KEY`/`DIAMOND_KEY` | Wallet | 키 토큰 지급 | 룰렛 탭/권한 정책 주의 |
| 번들 | `BUNDLE`/`TICKET_BUNDLE` | 복합 | 복수 토큰/포인트 묶음 | `reward_amount` 값에 따라 구성(RewardService 기준) |
| 쿠폰(비활성) | `COUPON` | - | 현재 no-op | 운영/코드상 비활성 |

### 4.3 시즌패스/진행(Progression)

| 용어(권장) | 코드/키워드 | SoT(테이블.필드) | 정의 | 로그(대표) | 주의사항 |
| --- | --- | --- | --- | --- | --- |
| 시즌패스 XP | Season XP | `season_pass_progress.current_xp` | 시즌 진행 경험치(SoT) | `season_pass_stamp_log`, `season_pass_reward_log` | XP는 `GAME_XP`로만 증가(POINT와 분리) |
| 시즌 레벨 | Season Level | `season_pass_progress.current_level` | 시즌패스 레벨(SoT) | `season_pass_reward_log(level, claimed_at)` | 자동수령/수동수령 정책은 시즌 레벨 보상 설정에 따름 |
| 스탬프 | Stamp | (시즌패스) | XP 적립의 원인 단위(게임/로그인/미션 등) | `season_pass_stamp_log(period_key)` | 중복 방지 키(period_key) 중요 |

### 4.4 게임 토큰(지갑) / 인벤토리(아이템)

| 용어(권장) | 토큰/아이템 타입 | SoT | 정의 | 주의사항 |
| --- | --- | --- | --- | --- |
| 게임 토큰 지갑 | Wallet | `user_game_wallet(balance)` | 토큰별 잔액 저장(소비/지급) | ledger 합산=balance 정합성 유지 |
| 룰렛 코인 | `ROULETTE_COIN` | Wallet | 룰렛 플레이 토큰 | |
| 다이스 토큰 | `DICE_TOKEN` | Wallet | 주사위 플레이 토큰 | |
| 복권 티켓 | `LOTTERY_TICKET` | Wallet | 복권 구매/플레이 토큰 | |
| 체험 토큰 | `TRIAL_TOKEN` | Wallet | 체험/무료 루프 토큰 | 정책/플래그에 영향 |
| 골드 키 | `GOLD_KEY` | Wallet | 고가/특수 플레이 키 | 특정 룰렛에서 Vault 강제 라우팅과 결합될 수 있음 |
| 다이아 키 | `DIAMOND_KEY` | Wallet | 프리미엄 플레이 키 | |
| 인벤토리 아이템 | Inventory Item | `user_inventory_item` | 다이아/기프티콘/바우처 같은 “보관형 자산” | item_type 네이밍 규칙 준수 |
| 바우처(교환권) | `VOUCHER_*` | Inventory | 사용 시 특정 토큰/보상을 지급하는 교환권 | use 시 멱등성/동시성 이슈 주의 |

### 4.5 미션(운영/보상)

| 용어(권장) | 코드/키워드 | SoT(테이블.필드) | 정의 | 주의사항 |
| --- | --- | --- | --- | --- |
| 미션 정의 | Mission | `mission` | 운영자가 생성/편집하는 미션 정책(보상 타입/수량 포함) | 운영 변경은 어드민 미션 관리에서 수행 |
| 미션 로직 키 | logic_key | `mission.logic_key` | 미션을 식별하는 유니크 키 | 이미 수령한 유저(진행/claimed)에 소급 영향 제한 |
| 유저 미션 진행 | Progress | `user_mission_progress` | 유저별 진행/완료/수령 상태 | `is_claimed`가 지급 여부 SoT |
| 승인 워크플로우 | Approval | `approval_status` | 승인 필요 미션의 지급 통제 | 미승인 지급 차단이 기본 |

---

## 5. 운영/검증 (QA)

### 5.1 운영자가 확인할 때 “어디를 보면 되나?”
- 금고 적립 여부: `user.vault_locked_balance` + `vault_earn_event`
- 시즌 XP 적립 여부: `season_pass_progress` + `season_pass_stamp_log/reward_log`
- 티켓/키 증감: `user_game_wallet` + `user_game_wallet_ledger`
- 인벤토리 지급대기/사용: `user_inventory_item` + `user_inventory_ledger`

### 5.2 흔한 혼동 케이스(방지용)
- “POINT라는 글자가 보이면 금고인가?” → **아님.** 금고는 금고 잔액/금고 이벤트로만 판단.
- “XP가 금고에 들어가나?” → **아님.** XP는 `GAME_XP`로만 시즌패스에 적립.
- “cash_balance가 SoT인데 왜 안 쓰나?” → 경제 통합 정책상 **신규 포인트성 지급을 금고로 단일화**했기 때문.

## 6. 변경 이력
- v1.0 (2026-01-14): 최초 작성(핵심 경제체계 용어 정리)
