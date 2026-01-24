# 통합 경제 및 성장 시스템 설계 (Unified Economy & Progression System Design)

## 1. 개요 (Overview)
이 문서는 **4대 경제 축**인 **금고(Vault)**, **티켓(Ticket)**, **시즌 레벨(Level)**, **다이아몬드(Diamond)**의 아키텍처와 구현 현황을 총괄하는 **Master Reference**입니다.
각 재화는 서로 다른 **리텐션 주기(Retention Cycle)**를 담당하며 유기적으로 작동합니다.
이 문서는 개발팀의 **구현 지도(Implementation Map)**로서 기능합니다.

---

## 2. 핵심 축 (Core Pillars)

| 구분 (Pillar) | 정의 (Definition) | 역할 및 목적 (Role & Purpose) | 관리 주체/서비스 |
| :--- | :--- | :--- | :--- |
| **금고 (Vault)** | **자산 (Asset)**. | **외부 플랫폼 출금**. 관리자 수동 확인 후 지급되는 '실제 가치'. | `VaultService` |
| **티켓 (Ticket)** | **연료 (Fuel)**. | **입장권/소모품**. 게임 플레이를 위해 반드시 필요한 자원. | `GameWalletService` |
| **시즌 레벨 (Season Level)** | **장기 목표 (Long-term)**. | **시즌 롱텀 리텐션**. 유저가 시즌 내내 달성해야 할 성취 목표. | `SeasonPassService` |
| **다이아몬드 (Diamond)** | **단기 보상 (Short-term)**. | **데일리/위클리 리텐션**. 매일 접속하고 플레이하게 만드는 즉각적인 유인책. | `InventoryService` (Item: `DIAMOND`) |

---

## 3. Pillar별 상세 구조 및 구현 체크리스트 (Detailed Implementation Checklist)

### A. 금고 (Vault) - The Economic Asset
*목적: 외부 랭킹(입금)에 대한 실질적 보상. 게임 수익이 적립되고 출금 가능한 자산.*

#### 🛠️ Backend (Logic)
- [x] **Service (Phase 1 SoT)**: `app/services/vault_service.py`
    - **SoT**: `user.vault_locked_balance` (모든 게임 적립/차감은 여기로 반영)
    - `record_game_play_earn_event(...)`: 게임 결과 기반으로 금고 적립/패널티를 **멱등하게** 기록
    - `Vault2Service`는 Phase 2/3 준비용(bookkeeping)으로 일부 이벤트를 추가 기록하지만, Phase 1 동작의 SoT는 아님
- [x] **Game Flow 연결**:
    - `DiceService.play` / `RouletteService.play`에서 `VaultService.record_game_play_earn_event(...)`를 직접 호출
    - 공통 로그는 `app/services/game_common.py`의 `log_game_play(...)`가 담당
    - [x] **Verified**: 게임 결과에 따라 Vault 적립(+200) 또는 패널티(-50) 적용 확인 (V-04).

#### 🎮 게임별 적립/패널티 컨피그 (정확한 값/로직)

- **적용 위치(SoT)**: `user.vault_locked_balance` (레거시 미러: `user.vault_balance`)
- **멱등성(Idempotency)**: `VaultEarnEvent.earn_event_id = GAME:{GAME_TYPE}:{game_log_id}` (중복 호출 시 0 반환)
- **우선순위**: DB `VaultProgram.config_json["game_earn_config"]` 값 우선 → 없으면 하드코딩 fallback
- **Multiplier 규칙**: `vault_accrual_multiplier >= 1.0`만 허용하며, 음수(-50)에는 더 크게 적용되지 않도록 `max(multiplied, original)`로 캡

| 게임 | 입력 outcome | DB 컨피그 키(우선) | fallback 판정 | 최종 금고 반영 |
| --- | --- | --- | --- | --- |
| **DICE** | `WIN`/`DRAW`/`LOSE` | `game_earn_config.DICE.WIN|DRAW|LOSE` | WIN=+200, LOSE=-50, DRAW=0 | `vault_locked_balance += amount` |
| **ROULETTE** | `SEGMENT_{RouletteSegment.id}` | `game_earn_config.ROULETTE.SEGMENT_{id}` | `payout_raw.reward_amount == 0`이면 -50, 아니면 +200 | `vault_locked_balance += amount` |

- **주의(룰렛 SEGMENT 키)**: outcome은 `slot_index`가 아니라 `RouletteSegment.id`(DB PK) 기반으로 만들어짐
  - 룰렛 서비스에서 `outcome = f"SEGMENT_{chosen.id}"`로 전달
  - 따라서 DB에서 특정 구간만 -50로 만들려면 `SEGMENT_{해당 segment.id}`를 정확히 맞춰야 함

- **⚠️ IMPORTANT (체크희망)**: 위 `game_earn_config`는 운영 중에도 어드민에서 수정 가능하도록 되어 있음
    - 어드민 API: `PUT /admin/api/vault-programs/{program_key}/config` (레거시: `PUT /api/admin/vault-programs/{program_key}/config`)
    - 다만 “어드민 UI에서 이 값을 실제로 편집할 수 있는 화면이 있는지”는 확인 필요(체크희망)

#### 🗄️ Database (Schema)
- [x] **Table**: `vault_balance`
    - `locked_balance`: 게임 플레이로 해금해야 할 자산.
    - `withdrawable_balance`: 즉시 출금 가능한 자산.
- [x] **Table**: `vault_earn_event`: 게임별 수익 발생 로그 (`game_type`, `amount`).
- [x] **Table**: `vault_withdrawal_request`: 출금 요청 상태 관리.

#### 🔌 API (Endpoints)
- `GET /api/vault/status`: 내 금고 잔액 및 해금 현황 조회.
- `POST /api/vault/withdraw`: 출금 신청.
- (Admin) `POST /api/admin/vault/approve`: 출금 승인.
- [x] **Verified**: 입금 당일 출금 조건, 최소 금액, 승인/거절 로직 검증 완료 (V-02, V-03).

#### 📺 Frontend (UI)
- [x] **Page**: `src/pages/VaultPage.tsx` (메인 대시보드)
- [x] **Components**:
    - `src/components/vault/VaultMainPanel.tsx`: 다이얼/금고 시각화.
    - `src/components/vault/VaultAccrualModal.tsx`: 게임 승리 시 팝업.
- [x] **API Client**: `src/api/vaultApi.ts`

> ✅ **2026-01-06 업데이트**: VaultService 보상 계산 로직 수정 완료 (POINT/XP/기타 보상 분기 로직 적용)

---

### B. 티켓 (Ticket) - The Fuel
*목적: 게임 플레이를 위한 필수 재화. 과몰입 방지 및 콘텐츠 소비 속도 조절.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/game_wallet_service.py`
    - `check_balance(user_id, token_type)`: 입장 가능 여부 확인.
    - `consume(user_id, token_type, amount)`: 게임 시작 시 차감.
- [x] **Reward Service Integration**: `app/services/reward_service.py`
    - `grant_ticket()`: `BUNDLE`이나 `TICKET_BUNDLE` 보상 타입을 통한 일괄 지급 로직.
    - [x] **Verified**: Bundle (All-in-one) 지급 및 게임 내 Ticket 보상 즉시 지급 확인 (T-04, T-05).
- [x] **Model**: `app/models/game_wallet.py`
        - Enum: `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`, `GOLD_KEY`, `DIAMOND_KEY`, `DIAMOND`.
        - 참고: `DIAMOND`는 enum에 존재하지만, 미션 보상의 SoT는 인벤토리(`user_inventory_item`)입니다.

#### 🎟️ Trial Grant (Ticket-Zero Mitigation) - TRIAL_TOKEN 전략 (2026-01-04)
- **SoT 우선순위**: 운영/구현 기준의 최신본은 `docs/06_ops/202601/...unified_economy_and_progression_ko.md`를 우선합니다.
- **변경 배경**: 무료 티켓(`ROULETTE_COIN` 등) 지급 시 작업장/악용 유저가 즉시 현금성 게임에 진입하는 리스크 차단.
- **핵심 변경**: Ticket Zero 발생 시 **`TRIAL_TOKEN`**(체험 토큰) 지급으로 우회 경로를 제공합니다.
    - 기존: 실전 티켓 직접 지급(중단)
    - 신규: `TRIAL_TOKEN` 3장 지급
- **체험 루프 (Resurrection Loop)**:
    1. `TRIAL_TOKEN`으로 **체험 룰렛(Practice Mode)** 플레이
    2. 승리 시 **`DIAMOND`**(다이아) 획득(확률)
    3. 상점에서 다이아로 **일반 게임 연료**(`ROULETTE_COIN` / `DICE_TOKEN`) 교환권 구매
    4. 교환권 사용 후 실전 게임 진입 → 금고(`Vault`) 적립
- **운영 효과**:
    - 현금성 게임 진입 전 “채굴 단계”를 강제하여 악용 효율 급감
    - 유저 무력감을 “획득 루프”로 완화

#### 🗄️ Database (Schema)
- [x] **Table**: `user_game_wallet`
    - `user_id`, `token_type`, `balance`.
- [x] **Table**: `user_game_wallet_ledger`: 티켓 획득/소모 로그.

#### 🔌 API (Endpoints)
- `GET /api/wallet/status`: 내 지갑(티켓) 잔액 조회.
- `POST /api/wallet/consume`: (Server-side Only) 게임 로직에서 내부 호출.

#### 📺 Frontend (UI)
- [x] **Hooks**: `src/hooks/useUser.ts` (유저 정보 내 지갑 상태 포함).
- [x] **Components**:
    - `src/components/layout/AppHeader.tsx`: 상단 바에 티켓 잔액 표시.
    - `src/components/common/InboxButton.tsx`: 티켓 선물 알림.

---

### C. 시즌 레벨 (Level) - The Long-term Status
*목적: **입금 금액(External Ranking)**에 비례하여 성장하는 명예 등급.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/season_pass_service.py`
    - `add_bonus_xp(xp_amount)`: XP 적립 및 레벨업 체크.
    - `claim_reward(level)`: 레벨 달성 보상 지급.
- [x] **Integration**: `app/services/admin_external_ranking_service.py`
    - **Trigger**: 입금 데이터 업데이트 시 `add_bonus_xp` 호출 (10만 원당 20 XP).
    - [x] **Verified**: 입금액 기반 XP 적립 확인 (L-01).
- [x] **Strict Rule Enforcement**:
    - **No Game XP**: 게임(룰렛/복권) 보상으로 지급되는 `POINT`는 XP로 변환되지 않고 무시됨 (L-03 Strict).
    - **Keys**: 골드/다이아 키 사용 시 획득한 `POINT`는 XP가 아닌 **Vault(Cash)**로 적립됨 (V-05).

#### 🗄️ Database (Schema)
- [x] **Table**: `season_pass_progress`
    - 유저 진행도: `current_level`, `current_xp`, `season_id`.
- [x] **Table**: `external_ranking_data`
    - XP Source of Truth: `deposit_amount` (입금액).
- [x] **Table**: `season_pass_config` (Season Meta)
    - `start_date`, `end_date`, `max_level`.
- [x] **Table**: `season_pass_level` (Reward Table)
    - `required_xp`, `reward_type`, `auto_claim`.
- [x] **Table**: `season_pass_reward_log` (Claim History)
    - 중복 수령 방지용 로그.

#### 🔌 API (Endpoints)
- **User API**:
    - `GET /api/season-pass/status`: 시즌 레벨 및 XP 바 조회.
    - `POST /api/season-pass/claim`: 레벨 보상 수동 수령.
- **Admin API**:
    - `POST /api/admin/external-ranking/update`: 입금액 데이터 주입 (XP 트리거).
    - `GET /api/admin/seasons`: 시즌 목록 관리.
    - `POST /api/admin/seasons`: 시즌 생성/수정.

#### 📺 Frontend (UI)
- **User Pages**:
    - [x] `src/pages/SeasonPassPage.tsx`: 전체 시즌 로드맵 & 보상 수령.
- **User Components**:
    - [x] `src/components/season/SeasonProgressWidget.tsx`: 미니 위젯 (경험치 바).
- **Admin Pages** (For Operators):
    - [x] `src/admin/pages/ExternalRankingPage.tsx`: 입금액 수동 입력 및 랭킹 관리.
    - [x] `src/admin/pages/SeasonListPage.tsx`: 시즌 스케줄 및 보상 설정.
- **Hooks & APIs**:
    - [x] `src/hooks/useSeasonPass.ts`
    - [x] `src/admin/api/adminExternalRankingApi.ts`
    - [x] `src/admin/api/adminSeasonApi.ts`

---

### D. 다이아몬드 (Diamond) - The Short-term Engagement
*목적: 미션 수행 및 활동에 대한 즉각적 보상. 티켓 구매의 원천.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/mission_service.py`
    - `check_progress()`: 미션 조건 달성 확인.
    - `claim_reward()`: 보상(다이아몬드) 지급.
- [x] **Reward Delivery**: `app/services/reward_service.py`
    - `reward_type == "DIAMOND"`는 **지갑이 아니라 인벤토리 아이템**(`item_type="DIAMOND"`)로 지급됨.

#### 🗄️ Database (Schema)
- [x] **Table**: `mission`
    - `reward_type`: `DIAMOND`로 설정.
- [x] **Table**: `user_mission_progress`: 진행 상황 및 수령 여부.
- [x] **Table**: `user_inventory_item`: `DIAMOND` 잔액(수량) 관리 (SoT).
- [x] **Table**: `user_inventory_ledger`: 다이아 지급/소비 로그.
- [x] **Verified**: 미션 완료 시 Diamond 지급 로직 (D-01).

> 참고: `GameTokenType.DIAMOND` enum은 남아있지만, **SoT는 인벤토리**입니다.

#### 🔌 API (Endpoints)
- `GET /api/mission/`: 데일리/위클리/특별 미션 + 진행도 조회.
- `POST /api/mission/{mission_id}/claim`: 미션 보상 수령.
- `POST /api/mission/daily-gift`: 일일 환영 선물(원탭) 수령.

#### 📺 Frontend (UI)
- [x] **Page**: `src/pages/MissionPage.tsx`: 미션 목록 및 수령 UI.
- [x] **Card**: `src/components/mission/MissionCard.tsx`: 다이아몬드 아이콘 표시.
- [x] **Store**: `src/stores/missionStore.ts`: 미션 상태 관리.
- [x] **Admin Page**: `src/admin/pages/AdminMissionPage.tsx`: 어드민 미션 관리
  > ✅ **2026-01-06 업데이트**: REWARD_TYPES 상수 적용, 보상 타입 드롭다운 및 테이블 표시 개선 (POINT, GAME_XP, 기프티콘 지원)

#### 🧾 Shop / Voucher (연계)
- [x] **Shop Purchase**: `app/services/shop_service.py`
    - DIAMOND는 **인벤토리에서 차감**되어 상품을 구매.
    - 구매 결과로 **바우처(예: `VOUCHER_DIAMOND_KEY_1`)가 인벤토리에 지급**됨.
- [x] **Voucher Use**: `app/services/inventory_service.py`
    - 바우처 사용 시 **지갑(GameWallet)**에 키(`DIAMOND_KEY`/`GOLD_KEY`)가 지급됨.
- [x] **Admin Inventory**: `src/admin/components/UserInventoryModal.tsx`
  > ✅ **2026-01-06 업데이트**: 전체 아이템 타입 12종 추가 (GIFTICON_BAEMIN, CC_COIN_GIFTICON, Keys, Tickets, Vouchers)

---

## 4. 경제 순환 다이어그램 (Economy Loop)

```mermaid
graph TD
    %% Pillars
    subgraph "Admin / External"
        Ranking[External Ranking Input<br>Deposit Amount]
        Admin[Vault Approval]
    end

    subgraph "Deposit Loop (Strategic Growth)"
        UserDeposit[User Deposit to CC Casino] --> Ranking
        Ranking --"Sync"--> XP[Season XP]
        XP --> Level[Season Level Up]
        Level --"Reward"--> TicketFromLevel[Bonus Tickets]
        Level --"Honor"--> Badge[Profile Badge]
    end

    subgraph "Engagement Loop (Daily Retention)"
        Mission[Mission: Login/Play] --"Complete"--> Diamond[💎 Diamond (Inventory)]
        Diamond --"Shop Purchase"--> Voucher[🎟️ Voucher (Inventory)]
        Voucher --"Use"--> Key[🔑 Key (Wallet)]
    end

    subgraph "Core Loop (Gameplay)"
        TicketFromLevel --> Ticket[🎫 Tickets (Fuel)]
        Ticket --"Consume"--> Game[Game Play: Dice/Roulette]
        Key --> Game
        Game --"Win"--> Vault[💰 Vault (Asset)]
        Vault --"Request"--> Admin
        Admin --"Payout"--> Cash[Real Cash USDT]
    end
```

---

## 5. 부록: 리워드 및 통화 매핑 (Reward & Currency Map)
`RewardService`(`app/services/reward_service.py`)에서 처리되는 리워드 타입의 실제 매핑 정보입니다.

| Reward Type | Internal Action | 비고 |
| :--- | :--- | :--- |
| **POINT** | (옵션) `SeasonPassService.add_bonus_xp` | 게임 보상(`dice_play/roulette_spin/lottery_play`)의 POINT는 기본적으로 **무시됨**(설정 `xp_from_game_reward=false` 기준). 필요 시 옵션으로 XP 전환 가능. |
| **CC_POINT** | `vault_locked_balance` 즉시 적립 | 외부 플랫폼 포인트성 보상. 즉시 지급 대신 금고(locked)로 적립되며 운영/정산 플로우에 맞춰 처리. |
| **BUNDLE** / **TICKET_BUNDLE** | `grant_ticket` (Multiple) | 레벨업 보상 등. 룰렛 코인 + 다이스 토큰 등을 세트로 지급합니다. |
| **COUPON** | **REMOVED (No-op)** | 폐기됨. `grant_coupon`은 동작하지 않음. |
| **TICKET_ROULETTE** | `GameTokenType.ROULETTE_COIN` | 룰렛 이용권. |
| **TICKET_DICE** | `GameTokenType.DICE_TOKEN` | 주사위 이용권. |
| **TICKET_LOTTERY** | `GameTokenType.LOTTERY_TICKET` | 복권 이용권. |
| **DIAMOND** | `InventoryService.grant_item(item_type="DIAMOND")` | (SoT=Inventory) 미션 보상/상점 결제에 사용. |

> ✅ 체크 결과: **골드/다이아 키 룰렛**에서 세그먼트가 `reward_type="POINT"` & `reward_amount>0`이면,
> `RewardService.deliver`가 아니라 `VaultService.record_trial_result_earn_event(..., force_enable=True)` 경로로 **금고(`user.vault_locked_balance`)에 적립**됩니다.
> 따라서 키 룰렛의 “금고 적립용 포인트”는 `CC_POINT`가 아니라 `POINT`로 설정되어야 합니다.
