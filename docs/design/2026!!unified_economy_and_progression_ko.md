# 통합 경제 및 성장 시스템 설계 (Unified Economy & Progression System Design)

> **Verification Report**: [Checklist Result](file:///c:/Users/JAVIS/.gemini/antigravity/brain/37116fed-604f-4988-8864-fc71e551cde7/verification_report.md)

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
| **다이아몬드 (Diamond)** | **단기 보상 (Short-term)**. | **데일리/위클리 리텐션**. 매일 접속하고 플레이하게 만드는 즉각적인 유인책. | `GameWalletService` (Type: `DIAMOND`) |

---

## 3. Pillar별 상세 구조 및 구현 체크리스트 (Detailed Implementation Checklist)

### A. 금고 (Vault) - The Economic Asset
*목적: 외부 랭킹(입금)에 대한 실질적 보상. 게임 수익이 적립되고 출금 가능한 자산.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/vault2_service.py`
    - `handle_game_win(user_id, amount)`: 게임 승리 시 배당금 적립.
    - `request_withdrawal(user_id)`: 출금 요청 생성.
- [x] **Event Handling**: `app/services/game_common.py`
    - `log_game_result()`: 게임 완료 시 Vault Service 호출 트리거.
    - [x] **Verified**: 게임 패배 시에도 Vault Accrual (Pity Bonus) 작동 확인 (V-04).

#### 🗄️ Database (Schema)
- [x] **Table**: `vault_balance`
    - `locked_balance`: 게임 플레이로 해금해야 할 자산.
    - `withdrawable_balance`: 즉시 출금 가능한 자산.
- [x] **Table**: `vault_earn_event`: 게임별 수익 발생 로그 (`game_type`, `amount`).
- [x] **Table**: `vault_withdrawal_request`: 출금 요청 상태 관리.

#### 🔌 API (Endpoints)
- `GET /api/vault/status`: 내 금고 잔액 및 해금 현황 조회.
- `POST /api/vault/withdraw`: 출금 신청.
- `POST /api/vault/withdraw`: 출금 신청.
- (Admin) `POST /api/admin/vault/approve`: 출금 승인.
- [x] **Verified**: 입금 당일 출금 조건, 최소 금액, 승인/거절 로직 검증 완료 (V-02, V-03).

#### 📺 Frontend (UI)
- [x] **Page**: `src/pages/VaultPage.tsx` (메인 대시보드)
- [x] **Components**:
    - `src/components/vault/VaultMainPanel.tsx`: 다이얼/금고 시각화.
    - `src/components/vault/VaultAccrualModal.tsx`: 게임 승리 시 팝업.
- [x] **API Client**: `src/api/vaultApi.ts`

---

### B. 티켓 (Ticket) - The Fuel
*목적: 게임 플레이를 위한 필수 재화. 과몰입 방지 및 콘텐츠 소비 속도 조절.*

#### 🛠️ Backend (Logic)
- [x] **Service**: `app/services/game_wallet_service.py`
    - `check_balance(user_id, token_type)`: 입장 가능 여부 확인.
    - `consume(user_id, token_type, amount)`: 게임 시작 시 차감.
- [x] **Reward Service Integration**: `app/services/reward_service.py`
- [x] **Reward Service Integration**: `app/services/reward_service.py`
    - `grant_ticket()`: `BUNDLE`이나 `TICKET_BUNDLE` 보상 타입을 통한 일괄 지급 로직.
    - [x] **Verified**: Bundle (All-in-one) 지급 및 게임 내 Ticket 보상 즉시 지급 확인 (T-04, T-05).
- [x] **Model**: `app/models/game_wallet.py`
    - Enum: `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET`.

#### 🗄️ Database (Schema)
- [x] **Table**: `user_game_wallet`
    - `user_id`, `token_type`, `balance`.
- [x] **Table**: `user_game_wallet_ledger`: 티켓 획득/소모 로그.

#### 🔌 API (Endpoints)
- `GET /api/wallet/status`: 내 지갑(티켓) 잔액 조회.
- `POST /api/wallet/consume`: (Server-side Only) 게임 로직에서 내부 호출.

#### 📺 Frontend (UI)
- [x] **Hooks**: `src/hooks/useUser.ts` (유저 정보 내 지갑 상태 포함).
- [ ] **Components**:
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
- [x] **Model Update**: `app/models/game_wallet.py`에 `DIAMOND` 토큰 타입 추가 완료.

#### 🗄️ Database (Schema)
- [x] **Table**: `mission`
    - `reward_type`: `DIAMOND`로 설정.
- [x] **Table**: `user_mission_progress`: 진행 상황 및 수령 여부.
- [x] **Table**: `user_game_wallet`: `DIAMOND` 잔액 관리.
- [x] **Verified**: 미션 완료 시 Diamond 지급 로직 (D-01).

#### 🔌 API (Endpoints)
- `GET /api/mission/list`: 데일리/위클리 미션 목록.
- `POST /api/mission/claim`: 미션 완료 보상(다이아) 수령.

#### 📺 Frontend (UI)
- [x] **Page**: `src/pages/MissionPage.tsx`: 미션 목록 및 수령 UI.
- [x] **Card**: `src/components/mission/MissionCard.tsx`: 다이아몬드 아이콘 표시.
- [x] **Store**: `src/stores/missionStore.ts`: 미션 상태 관리.

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

## 5. 부록: 리워드 및 통화 매핑 (Reward & Currency Map)
`RewardService`(`app/services/reward_service.py`)에서 처리되는 리워드 타입의 실제 매핑 정보입니다.

| Reward Type | Internal Action | 비고 |
| :--- | :--- | :--- |
| **POINT** | `SeasonPassService.add_bonus_xp` | (Deprecated) 과거에는 XP로 변환되었으나, **현재는 무시됨**. 오직 입금만이 XP를 발생시킴. |
| **CC_POINT** | **Manual Processing** | 외부 플랫폼 포인트. 시스템상 지급 로직은 없고 로그만 남깁니다. |
| **BUNDLE** / **TICKET_BUNDLE** | `grant_ticket` (Multiple) | 레벨업 보상 등. 룰렛 코인 + 다이스 토큰 등을 세트로 지급합니다. |
| **COUPON** | `grant_coupon` | 외부 쿠폰 시스템 연동 (현재 Deferred). |
| **TICKET_ROULETTE** | `GameTokenType.ROULETTE_COIN` | 룰렛 이용권. |
| **TICKET_DICE** | `GameTokenType.DICE_TOKEN` | 주사위 이용권. |
| **TICKET_LOTTERY** | `GameTokenType.LOTTERY_TICKET` | 복권 이용권. |
| **DIAMOND** | `GameTokenType.DIAMOND` | (New) 미션 보상 전용 재화. |
