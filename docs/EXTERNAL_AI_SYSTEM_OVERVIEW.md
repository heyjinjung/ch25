# XMAS Event System (CC Casino) - System Overview for External AI

**Date:** 2025-12-19
**Target Audience:** External AI Agents / Developers
**Purpose:** To provide a comprehensive understanding of the system's goals, mechanics, and user psychology for effective contribution.

---

## 1. System Overview

The **XMAS Event System** is a gamified event platform designed for **CC Casino**. It serves as a retention and engagement tool, leveraging mini-games, a season pass system, and team battles to keep users active and invested.

### Core Value Proposition
- **Entertainment:** Simple, high-dopamine mini-games (Roulette, Dice, Lottery).
- **Progression:** A visual Season Pass and Leveling system.
- **Competition:** Team Battles and Real-time Rankings.
- **Rewards:** Tangible rewards (tickets, points, external coupons) for activity.

---

## 2. Target Persona & Psychology

**Primary Target:** Korean Males, Ages 20-40.

### Key Characteristics
- **Tech-Savvy:** Familiar with mobile games and web services.
- **Impatient:** Prefers fast feedback loops; hates waiting or complex instructions.
- **Competitive:** Highly sensitive to rankings, tiers, and "winning."
- **Loss Averse:** Motivated by the fear of losing accumulated assets (e.g., the "Vault" system).
- **Visual Preference:** Prefers "Dark Mode" UIs, flashy effects for wins, and clear, bold typography.

### Behavioral Economics Applied
- **Endowment Effect:** The "Vault" shows locked rewards that feel like "mine," motivating users to unlock them.
- **Sunk Cost Fallacy:** Visual progress bars (Season Pass) encourage users to complete levels rather than abandon them.
- **Variable Rewards:** Random outcomes in games (Roulette/Dice) create a dopamine loop (Hook Model).

---

## 3. Key Objectives

### A. User Acquisition (Onboarding)
- **Goal:** Minimize time to "Aha Moment" (First Win/Play).
- **Strategy:**
    - **Simplified Onboarding:** A "First Game Start" modal guides new users immediately upon login.
    - **No-Friction Entry:** Users are nudged to play Roulette first for an instant result.
    - **Visual Cues:** Clear indicators of what to do next (e.g., "Spin Now").

### B. Retention (Engagement Loop)
- **Goal:** Create a daily habit of returning to the platform.
- **Strategy:**
    - **Ticket Economy:** Users need tickets to play. When tickets run out, they are guided to "Recharge" or "Open Vault," creating a monetization or engagement loop.
    - **Team Battle:** Users contribute to a team's score. "Letting the team down" is a social pressure point.
    - **Daily Missions:** Simple tasks (e.g., "Play 3 times") to encourage daily logins.
    - **Push/Pull:** Notifications (if implemented) or internal triggers (boredom) bring users back.

### C. Monetization (Indirect)
- **Goal:** Drive users to the main casino platform or ad-viewing behaviors.
- **Strategy:**
    - **Ticket Scarcity:** The primary friction point. Users must engage with the platform (or pay/deposit in the main casino) to get more tickets.
    - **Vault Unlocking:** Large rewards are locked in a Vault, requiring specific actions (deposits/play volume) to access.

---

## 4. Core Features & Mechanics

### 1. Mini-Games
- **Roulette:** High visual impact, variable rewards. The "Hook" game.
- **Dice:** Simple probability game.
- **Lottery:** Scratch-card style instant win.
- **UX Focus:** "Play Again" buttons appear instantly in the same spot to maintain flow (Velocity of Play).

### 2. Season Pass & Leveling
- **Structure:** Levels 1-7 (and beyond).
- **XP Sources:** Game play, daily logins, team contributions.
- **Rewards:** Tickets, Points, External Coupons (e.g., Convenience Store, Delivery Apps).
- **Visuals:** A prominent progress bar always visible to show proximity to the next reward.

### 3. Team Battle
- **Concept:** Users are assigned to teams (e.g., Red vs. Blue).
- **Mechanic:** All individual game activities contribute to the Team Score.
- **Motivation:** Winning team gets a shared prize pool or buffs.

### 4. The Vault (Geumgo) - New User Retention Core
- **Concept:** A "Loss Aversion" system where rewards are pre-given but locked.
- **Structure:**
    - **Gold Vault (10k):** Free/Easy (Channel Add). "Aha Moment".
    - **Platinum Vault (30k):** Deposit + Attendance. "Loss Aversion" trigger.
    - **Diamond Vault (100k):** High Deposit. "Visual Anchor".
- **Psychology:** "It's already my money, but it will disappear in 7 days."
- **Action:** Drives users to deposit to "save" their expiring assets.

---

## 5. Technical Context (Brief)

- **Frontend:** React, TypeScript, Vite, TailwindCSS.
- **Backend:** FastAPI (Python), MySQL, Redis.
- **Infrastructure:** Dockerized, Nginx reverse proxy.
- **Key APIs:**
    - `/api/auth/token`: JWT Authentication.
    - `/api/season-pass/status`: User progress.
    - `/api/activity/record`: Funnel tracking.

---

## 6. Current Focus Areas (Action Plan)

1.  **Speed:** Optimize React state to remove *any* delay between game result and "Play Again".
2.  **Onboarding:** Refine the "First Play" modal to ensure 100% conversion of new logins to first game play.
3.  **Visual Polish:** Enhance "Win" effects (fireworks, haptics) to satisfy the target persona's need for feedback.
4.  **Funnel Monitoring:** Use the Admin Dashboard to track where users drop off (e.g., Ticket 0 -> Exit vs. Ticket 0 -> Vault Info).

---

*This document is synthesized from internal design docs, retention analysis, and technical guides.*
