# Unified Economy & Progression System Design

## 1. Overview
This document serves as the **Master Reference** for the architecture and implementation status of the **4 Core Economic Pillars**: **Vault**, **Ticket**, **Season Level**, and **Diamond**.
Each currency manages a distinct **Retention Cycle** and operates organically within the system.
This document functions as the **Implementation Map** for the development team.

---

## 2. Core Pillars

| Pillar | Definition | Role & Purpose | Managed By/Service |
| :--- | :--- | :--- | :--- |
| **Vault** | **Asset** | **Withdrawal to External Platform**. 'Real Value' paid after admin manual approval. | `VaultService` |
| **Ticket** | **Fuel** | **Entry Token/Consumable**. Essential resource required for gameplay. | `GameWalletService` |
| **Season Level** | **Long-term Goal** | **Seasonal Long-term Retention**. Achievement goal users pursue throughout the season. | `SeasonPassService` |
| **Diamond** | **Short-term Reward** | **Daily/Weekly Retention**. Immediate incentive to drive daily login and play. | `GameWalletService` (Type: `DIAMOND`) |

---

## 3. Detailed Implementation Checklist per Pillar

### A. Vault - The Economic Asset
*Purpose: Substantial reward for external ranking (deposits). An asset that accumulates game earnings and can be withdrawn.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/vault2_service.py`
    - `handle_game_win(user_id, amount)`: Accrues dividends upon game win.
    - `request_withdrawal(user_id)`: Creates a withdrawal request.
- [x] **Event Handling**: `app/services/game_common.py`
    - `log_game_result()`: Trigger for calling Vault Service upon game completion.

#### 🗄️ Database (Schema)
- [x] **Table**: `vault_balance`
    - `locked_balance`: Assets to be unlocked through gameplay.
    - `withdrawable_balance`: Assets available for immediate withdrawal.
- [x] **Table**: `vault_earn_event`: Log of earnings per game (`game_type`, `amount`).
- [x] **Table**: `vault_withdrawal_request`: Withdrawal request status management.

#### 🔌 API (Endpoints)
- `GET /api/vault/status`: Query my vault balance and unlock status.
- `POST /api/vault/withdraw`: Request withdrawal.
- (Admin) `POST /api/admin/vault/approve`: Approve withdrawal.

#### 📺 Frontend (UI)
- [x] **Page**: `src/pages/VaultPage.tsx` (Main Dashboard)
- [x] **Components**:
    - `src/components/vault/VaultMainPanel.tsx`: Dial/Vault visualization.
    - `src/components/vault/VaultAccrualModal.tsx`: Popup upon game win.
- [x] **API Client**: `src/api/vaultApi.ts`

---

### B. Ticket - The Fuel
*Purpose: Essential currency for gameplay. Prevents addiction and controls content consumption speed.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/game_wallet_service.py`
    - `check_balance(user_id, token_type)`: Check entry eligibility.
    - `consume(user_id, token_type, amount)`: Deduct upon game start.
- [x] **Reward Service Integration**: `app/services/reward_service.py`
    - `grant_ticket()`: Batch grant logic via `BUNDLE` or `TICKET_BUNDLE` reward types.
- [x] **Model**: `app/models/game_wallet.py`
    - Enum: `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`.

#### 🗄️ Database (Schema)
- [x] **Table**: `user_game_wallet`
    - `user_id`, `token_type`, `balance`.
- [x] **Table**: `user_game_wallet_ledger`: Ticket acquisition/consumption log.

#### 🔌 API (Endpoints)
- `GET /api/wallet/status`: Query my wallet (ticket) balance.
- `POST /api/wallet/consume`: (Server-side Only) Internal call from game logic.

#### 📺 Frontend (UI)
- [x] **Hooks**: `src/hooks/useUser.ts` (Includes wallet status in user info).
- [ ] **Components**:
    - `src/components/layout/AppHeader.tsx`: Display ticket balance in top bar.
    - `src/components/common/InboxButton.tsx`: Ticket gift notification.

---

### C. Season Level - The Long-term Status
*Purpose: Honor grade that grows in proportion to **Deposit Amount (External Ranking)**.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/season_pass_service.py`
    - `add_bonus_xp(xp_amount)`: XP accrual and level-up check.
    - `claim_reward(level)`: Payout level achievement reward.
- [x] **Integration**: `app/services/admin_external_ranking_service.py`
    - **Trigger**: Call `add_bonus_xp` upon deposit data update (e.g., 20 XP per 100,000 KRW).
- [ ] **Deprecation**: `app/services/game_common.py` (ENV-based game XP triggers scheduled for removal).

#### 🗄️ Database (Schema)
- [x] **Table**: `season_pass_progress`
    - User progress: `current_level`, `current_xp`, `season_id`.
- [x] **Table**: `external_ranking_data`
    - XP Source of Truth: `deposit_amount`.
- [x] **Table**: `season_pass_config` (Season Meta)
    - `start_date`, `end_date`, `max_level`.
- [x] **Table**: `season_pass_level` (Reward Table)
    - `required_xp`, `reward_type`, `auto_claim`.
- [x] **Table**: `season_pass_reward_log` (Claim History)
    - Log to prevent duplicate claims.

#### 🔌 API (Endpoints)
- **User API**:
    - `GET /api/season-pass/status`: Query season level and XP bar.
    - `POST /api/season-pass/claim`: Manual claim of level reward.
- **Admin API**:
    - `POST /api/admin/external-ranking/update`: Inject deposit data (XP trigger).
    - `GET /api/admin/seasons`: Manage season list.
    - `POST /api/admin/seasons`: Create/Edit season.

#### 📺 Frontend (UI)
- **User Pages**:
    - [x] `src/pages/SeasonPassPage.tsx`: Full season roadmap & reward claim.
- **User Components**:
    - [x] `src/components/season/SeasonProgressWidget.tsx`: Mini widget (XP bar).
- **Admin Pages** (For Operators):
    - [x] `src/admin/pages/ExternalRankingPage.tsx`: Manual deposit input & ranking management.
    - [x] `src/admin/pages/SeasonListPage.tsx`: Season schedule & reward settings.
- **Hooks & APIs**:
    - [x] `src/hooks/useSeasonPass.ts`
    - [x] `src/admin/api/adminExternalRankingApi.ts`
    - [x] `src/admin/api/adminSeasonApi.ts`

---

### D. Diamond - The Short-term Engagement
*Purpose: Immediate reward for mission completion and activities. Source for purchasing tickets.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/mission_service.py`
    - `check_progress()`: Check mission completion conditions.
    - `claim_reward()`: Payout reward (Diamond).
- [x] **Model Update**: Added `DIAMOND` token type to `app/models/game_wallet.py`.

#### 🗄️ Database (Schema)
- [x] **Table**: `mission`
    - `reward_type`: Set to `DIAMOND`.
- [x] **Table**: `user_mission_progress`: Progress status and claim status.
- [x] **Table**: `user_game_wallet`: Manage `DIAMOND` balance.

#### 🔌 API (Endpoints)
- `GET /api/mission/list`: Daily/Weekly mission list.
- `POST /api/mission/claim`: Claim mission completion reward (Diamond).

#### 📺 Frontend (UI)
- [x] **Page**: `src/pages/MissionPage.tsx`: Mission list & claim UI.
- [x] **Card**: `src/components/mission/MissionCard.tsx`: Display Diamond icon.
- [x] **Store**: `src/stores/missionStore.ts`: Mission state management.

---

## 4. Economy Loop Diagram

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
        Mission[Mission: Login/Play] --"Complete"--> Diamond[💎 Diamond]
        Diamond --"Shop Purchase"--> TicketFromShop[Ticket Bundle]
    end

    subgraph "Core Loop (Gameplay)"
        TicketFromLevel & TicketFromShop --> Ticket[🎫 Tickets (Fuel)]
        Ticket --"Consume"--> Game[Game Play: Dice/Roulette]
        Game --"Win"--> Vault[💰 Vault (Asset)]
        Vault --"Request"--> Admin
        Admin --"Payout"--> Cash[Real Cash USDT]
    end
```

---

## 5. Appendix: Reward & Currency Map
Actual mapping information for reward types processed in `RewardService` (`app/services/reward_service.py`).

| Reward Type | Internal Action | Notes |
| :--- | :--- | :--- |
| **POINT** | `SeasonPassService.add_bonus_xp` | Game win rewards, etc. **Actually converted to XP**. (Exception: Admin manual grant) |
| **CC_POINT** | **Manual Processing** | External platform point. Logged only; no system payout logic. |
| **BUNDLE** / **TICKET_BUNDLE** | `grant_ticket` (Multiple) | Level-up bundle rewards. Batch grant of Roulette Coins + Dice Tokens, etc. |
| **COUPON** | `grant_coupon` | External coupon system integration (Currently Deferred). |
| **TICKET_ROULETTE** | `GameTokenType.ROULETTE_COIN` | Roulette Ticket. |
| **TICKET_DICE** | `GameTokenType.DICE_TOKEN` | Dice Ticket. |
| **TICKET_LOTTERY** | `GameTokenType.LOTTERY_TICKET` | Lottery Ticket. |
| **DIAMOND** | `GameTokenType.DIAMOND` | (New) Mission reward dedicated currency. |
