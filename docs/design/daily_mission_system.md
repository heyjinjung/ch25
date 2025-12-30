# Comprehensive Optimization & Mission System Design

This document outlines the design for the engagement-driven mission system and the 8 core optimization points for the TMA project.

## 🚀 Part 1. Project Optimization & Security

Based on the 8 feedback points, we focus on performance, UX/UI, reward logic, and security.

### 1. Performance Optimization (App Loading)
- **Problem**: Slow app loading.
- **Actions**:
    - Analyze bundle size using Vite build report.
    - Implement `React.lazy` and `Suspense` for heavy pages (Roulette, Dice, CRM).
    - Optimize images in `public/assets` and `public/images` (convert to WebP).
    - Enable Brotli/Gzip compression more aggressively in Nginx.

### 2. Logout Button & Flow
- **Component**: Add `LogoutButton` to CRM profile or Header.
- **TMA Strategy**: Use a "Login Required" screen with a "Login with Telegram" button to allow explicit session control even if `initData` is present.

### 3. Game Reward Logic Update
- **Change**: Update `GAME_EARN_DICE_LOSE_BONUS` to **-50** (Penalty on loss).

### 4. Dice Game UI Refactoring
- **Actions**: Reduce vertical padding, move controls closer to animation, and make the overall height "one-screen" friendly.

### 5. PvP History Implementation
- **Goal**: Implement a global feed of recent wins/losses from all users as shown in the reference pvp image.

### 6. Telegram Security & Auto-Login (URGENT)
- **Actions**: 
    - Strictly validate `initData` in backend.
    - Implement a "Welcome/Connect" step for first-time users.
    - Fix auto-access without "Join/Start" confirmation.

### 7. Automatic Profile Integration
- **Frontend**: Display the "Profile" card (Username, Level, Balance) immediately upon TMA launch in the Header.

---

## 💎 Part 2. Mission & Level System Integration Design

The current Level System (Season Pass) and the proposed Daily Mission system overlap significantly. We consolidate these by making **"Completing Missions = Earning XP = Leveling Up"**.

### 1. Unified Concept: Mission = Season Pass Stamps
- **Legacy**: Simple "Stamps" were earned via specific actions to level up.
- **Improved**: Each Mission (Daily/Weekly/Special) acts as a stamp. Completing a mission grants **[Direct Reward (Diamonds, etc.) + Season XP]** simultaneously.

### 2. Consolidated Reward Structure

| Mission Type | Direct Reward (Sample) | Season XP | Reset Cycle |
| :--- | :--- | :--- | :--- |
| **Daily Check-in** | 1 Diamond | 100 XP | Daily |
| **Play 5 Games** | 5 Diamonds | 200 XP | Daily |
| **Share to Story** | 5 Diamonds | 300 XP | Daily |
| **Weekly 500 Games**| 50 Diamonds | 1000 XP | Weekly |
| **Join Channel** | 5 Diamonds | 500 XP | One-time |

### 3. Technical Consolidation (Backend)
- **Service Synergy**: When `MissionService` handles a completion, it automatically adds XP to the user's active `SeasonPassProgress`.
- **Double Joy**: Users feel double rewarded—once by the mission's direct reward and again by the level-up reward from the Season Pass.

### 4. UI Consolidation (Frontend)
- **Mission Dashboard Header**: Show the current Season Level and XP progress bar.
- **Mission Cards**: Display both the direct item reward and the XP gain.
- **Unified Navigation**: The 'Missions' menu absorbs or deeply links with 'Season Pass', allowing users to see their level rewards directly within the mission context.

### 5. Expected Benefits
- **Simplification**: Users have ONE clear destination to see what they need to do.
- **Enhanced Motivation**: Constant sense of progress via both immediate mission items and long-term level milestones.
- **Efficiency**: Centralizes action-tracking logic into the Mission Engine.

---

## 💎 Part 3. Daily Mission Detailed Design

## 2. Core Categories
- **Daily**: Resets every 24 hours (KST/UTC based). Focuses on gameplay and daily check-ins.
- **Weekly**: Resets every 7 days. Focuses on cumulative progress (e.g., total games played).
- **Special**: One-time or event-based tasks (e.g., "Join Official Channel", "Invite 5 Friends").

## 3. Mission Types & Rewards (Reference Image)

| Task Name | Category | Reward | Logic |
| :--- | :--- | :--- | :--- |
| **Subscribe to channel** | Special | 5 Diamonds | Verified via Telegram Bot API `getChatMember`. |
| **Invite 5 friends** | Special | 50 Diamonds | Tracked via referral link/invite code. |
| **Daily reward** | Daily | 1 Diamond | Simple one-click claim per day. |
| **Play 5 games** | Daily | 5 Diamonds | Counter resets daily. |
| **Play 10 games** | Daily | 10 Diamonds | Counter resets daily. |
| **Share to Stories** | Special/Daily | 5 Diamonds | Triggered by TMA `shareToStories` API callback. |
| **Play 500 games** | Weekly | 50 Diamonds | Cumulative count over a week. |
| **Collect collection** | Special | ??? | Based on item inventory status. |

## 4. Technical Architecture

### Backend (Python/FastAPI)
- **Table: `mission`**: Defines mission templates (title, reward_type, reward_amount, goal_value, category).
- **Table: `user_mission_progress`**: Tracks individual user progress (user_id, mission_id, current_value, is_claimed, last_updated_at).
- **Service: `MissionService`**: 
    - `get_available_missions(user_id)`: returns missions with current user progress.
    - `update_progress(user_id, action_type, delta)`: triggered by game service, referral service, etc.
    - `claim_reward(user_id, mission_id)`: validates and grants rewards.

### Frontend (React/Vite)
- **Page: `MissionPage.tsx`**: The main board with tabs (All, Daily, Weekly, Special).
- **Component: `MissionCard.tsx`**: Displays mission deco, progress bar, and Claim/Start buttons.
- **State Integration**: Use `missionStore` (Zustand/Context) to keep progress in sync.

## 5. UI/UX Considerations
- Use vibrant, contrasting colors for "Claim" vs "Start" buttons.
- Implement progress bars for cumulative tasks.
- Add micro-animations (e.g., "shaking" claim button when 100% complete).
- Use `hapticFeedback` on claim success.

---

## 💎 Part 3. Operation-Driven Mission Strategies

Based on the **[Operation Guide 202601]**, we expand the mission system to maximize retention and profitability.

### 1. Asset Grand Cycle (1:4:12) Integration
Transferring the core strategy of "Loss Aversion" and "Long-term Lockup" into mission goals.

- **[Steady] Bridge Week Survival**: Complete at least 3 daily missions every day (12/25~12/31) -> Reward: **30,000 Seed for January + Diamond Key**.
- **[Cumulative] Gold Vault Unlock Quest**: Complete 100 daily missions in a month -> Reward: **+20% Gold Vault withdrawal permission**.
- **[Grand] Diamond Key Collector**: Complete 5 specific special missions within 12 weeks -> Reward: **Final Key for Grand Vault**.

### 2. Cherrypicker Defense & Deposit Conversion
A mechanism to filter "Free Users" and convert them into "Real Users".

- **[Bait] Infinity Ticket Mission**: For Level 1~6 users, "Play 10 Dice games" consistently grants ticket bundles. (Ensures high activity)
- **[Gate] High-Value Reward Guard**: Missions for Points/Coins (Level 7+) will enter a "Pending Admin Approval" state upon completion for manual review.
- **[Convert] Deposit Booster (Proposal)**: "VIP Double XP/Reward Missions" visible only to users with a deposit history in the last 24 hours.

### 3. Dynamic Operational Missions
Admin can adjust mission weights in real-time to control traffic and balance.

- **[Event] Double Vault Time**: Missions grant ×2 Vault accrual multiplier during specific time slots.
- **[Rescue] Ticket Zero Survival**: "Watch Ad/Join Bot Chat" missions appearing only when a user's ticket balance is 0.

### 4. Operational Benefits
- **Data-Driven Guardrails**: Compare mission completion rates with `user_cash_ledger` (Cost) to immediately increase mission difficulty if a cherrypicker wave is detected.
- **Psychological Attachment**: The achievement of "Filling the Vault by completing missions" feeds into the fear of "Losing the Vault if I don't return," ensuring consistent retention.

---

---

## 💎 Part 5. Advanced TMA Technical Integration (Tech-Max)

To ensure maximum retention within the Telegram ecosystem, we leverage deep Native TMA functionalities that go beyond standard web features.

### 1. Viral Social Missions (Built-in Growth)
- **"Share to My Story"**: Use `WebApp.shareToStories(media_url, text)`. Mission is verified via the API callback, rewarding users who brag about their 100k+ Vault wins.
- **"Direct Invite via Inline Query"**: Instead of just copying a link, missions will prompt users to open their contact list via `WebApp.switchInlineQuery`. This targets specific friends directly, increasing conversion.

### 2. Physical & Taptic Engagement (Tactile Satisfaction)
- **"Shake to Roll" Dice Mission**: For specific high-tier missions, require the user to physically shake their phone (using `Accelerometer` API) to throw the dice.
- **Premium Haptics**: Differentiated `HapticFeedback` patterns (light, medium, heavy, success, notification) for different mission tiers to build "muscle memory" of success.

### 3. Continuous Engagement via Bot Guide (The "Nudge")
- **Mission Progress Push**: If a user is at 90% (e.g., 9/10 games), the **Telegram Bot** sends a personalized DM: *"Only 1 game left to unlock your 10 Diamonds! Jump back in now!"* using deep links (`t.me/bot?start=mission_id`).
- **Real-time Group Sync**: The bot tracks activity in the official Telegram Group. A new mission type: "Send 5 messages in the Group today" (verified via Bot's `on_message` hook).

### 4. Zero-Latency Cloud Sync
- **`CloudStorage` Integration**: Use `WebApp.CloudStorage` to cache mission status locally for near-instant UI loading. This reduces server round-trips for non-critical UI states (like "New" mission badges).

### 5. Telegram Stars (Eco-System Synergy)
- **Stars as Mission Boosters**: Users can spend **Telegram Stars** (native virtual currency) to "Quick-Complete" a difficult mission or buy an "XP Double Booster" for 24 hours. This creates a seamless, one-tap monetization loop.

### 6. Technical Components (Expanded)
- **Backend Flow**:
    - `MissionWebhookHandler`: Listens to Telegram Bot events (Group chat activity, Story sharing success).
    - `HapticService (Frontend)`: A dedicated wrapper to trigger native feedback synchronized with mission UI transitions.

---

## 💎 Part 6. Next Steps
