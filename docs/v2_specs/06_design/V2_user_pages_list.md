# V2 User 페이지 구현 점검 및 플로우 체크

문서 타입: 가이드
버전: v1.1
작성일: 2026-01-21
작성자: GitHub Copilot
대상 독자: 백엔드/프론트엔드 개발자, DevOps

## 1. 목적

- V2 유저(서비스) 프론트엔드 화면의 **구현 현황(UI)**, **API 준비 상태(백엔드)**, **후속 작업(불일치/누락)**을 한 번에 추적한다.

## 2. 범위

- V2 유저용 UI 화면 및 라우팅(`src/v2/pages/*`, `src/v2/router/V2UserRoutes.tsx`)
- V2 유저 API(`app/v2/api/routes.py`)
- V2 프론트 API/훅(`src/v2/api/*`, `src/v2/hooks/useV2*.ts`)

## 3. 용어 정의

- UI 상태: ✅ 완료 / 🚧 미구현(계획) / 🧪 POC
- API 상태: **Real** / **Stub** / **Missing** / **Check**

- 기준일: 2026-01-21
- SoT(화면/라우팅 계획): `docs/v2_specs/06_design/v2_frontend_master_plan_ko.md`
- Backend 실제 구현(유저 API): `app/v2/api/routes.py`
- Frontend 실제 클라이언트(API/Hooks): `src/v2/api/*`, `src/v2/hooks/useV2*.ts`

---

## 4. 현재 구조 요약 (Facts)

- `src/v2/pages/home`, `src/v2/pages/game`에 V2 유저 페이지(홈/게임허브/룰렛/주사위/복권)가 구현됨.
- 유저용 라우터는 `src/v2/router/V2UserRoutes.tsx`로 존재하며 `/v2/*`로 연결됨(`src/router/AppRouter.tsx`).
- V2 레이아웃은 `src/v2/components/layout/V2AppLayout.tsx`로 구성되며 V1 스타일 하단 네비를 사용함.
- 게임 상태 API는 `src/v2/api/v1CompatAdapter.ts`를 통해 V2 → V1 폴백( NO_FEATURE_TODAY 대응 ) 구조로 동작.

---

## 5. 화면 리스트 및 구현 현황

표의 의미는 V2 Admin 문서와 동일하게 유지합니다.

| 필드 | 의미 |
| :--- | :--- |
| Route | 계획/목표 라우팅(주로 `/v2/...`) |
| UI 상태 | ✅ 완료 / 🚧 미구현(계획) / 🧪 POC |
| API 상태 | **Real** / **Stub** / **Missing** / **Check** |

> **Stub**: 서버에 라우트는 있으나 더미 응답(SoT 준수용) 또는 Alias 수준

---

### 5-1. Auth / Entry

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Login / Entry** | `/v2/login` | ✅ 완료 | **Check** | V2 로그인 페이지는 존재. 401 리다이렉트는 기본적으로 `/v2/login`으로 이동하도록 구성됨(`src/v2/api/client.ts`). |

---

### 5-2. Home / Lobby

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Lobby (Home)** | `/v2/home` | ✅ 완료 | **Real/Check** | FE: `src/v2/pages/home/HomePage.tsx`, `src/v2/components/layout/V2AppHeader.tsx`. 주요 호출: `GET /api/v2/vault/status`(Missing) → `GET /api/vault/status`(Real, 폴백), `GET /api/v2/mission/`(Real). Feed API는 현재 사용하지 않음. |

---

### 5-3. Game Rooms

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Game Hub** | `/v2/game` | 🧪 POC | **Check** | 디자인 재작업 예정. 현재는 게임 링크 진입용 UI. |
| **Roulette (4종)** | `/v2/game/roulette` | ✅ 완료 | **Real** | FE: `src/v2/pages/game/RoulettePage.tsx` → `getV2RouletteStatus(activeTab)`, `playV2Roulette`. 호출: `GET /api/v2/roulette/status?ticket_type=...`, `POST /api/v2/roulette/play` (BE: `app/v2/api/routes.py`에 존재). 4종 티켓: `ROULETTE_TICKET`, `GOLD_KEY_TICKET`, `DIAMOND_TICKET`, `TRIAL_TICKET`. V2 미가용 시 `src/v2/api/v1CompatAdapter.ts`가 `GET /api/roulette/status`, `POST /api/roulette/play`로 폴백. |
| **Dice** | `/v2/game/dice` | ✅ 완료 | **Real/Missing** | FE: `src/v2/pages/game/DicePage.tsx` → `getV2DiceStatus`, `playV2Dice`. 호출: `GET /api/v2/dice/status`, `POST /api/v2/dice/play` (BE: `app/v2/api/routes.py`에 존재). `POST /api/v2/dice/double-up`는 FE에만 존재(***Missing***). |
| **Lottery** | `/v2/game/lottery` | ✅ 완료 | **Real** | FE: `src/v2/pages/game/LotteryPage.tsx` → `getV2LotteryStatus`, `playV2Lottery`. 호출: `GET /api/v2/lottery/status`, `POST /api/v2/lottery/play` (BE: `app/v2/api/routes.py`에 존재). V2 미가용 시 `src/v2/api/v1CompatAdapter.ts`가 `GET /api/lottery/status`로 폴백. |

---

### 5-4. Inventory

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Inventory** | `/v2/inventory` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/inventory`, `POST /api/v2/inventory/use` / BE: 동일 경로 존재. 다만 BE는 `Idempotency-Key`(또는 `X-Idempotency-Key`) 필수. |
| **Inventory Items (alias)** | *(내부/옵션)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/inventory/items`는 alias로 존재(아이템 배열만 반환). |
| **Exchange / Craft** | `/v2/exchange` *(계획)* | 🚧 미구현 | **Stub** | BE: `POST /api/v2/exchange/craft`는 Stub(`{"success": true}`) |

---

### 5-5. Shop (Exchange)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Shop** | `/v2/shop` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/shop/products`, `POST /api/v2/shop/purchase` / BE: 동일 경로 존재. BE는 구매 시 `Idempotency-Key`(또는 `X-Idempotency-Key`) 필수. |

---

### 5-6. Missions / Streak

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Missions** | `/v2/missions` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/mission/`, `POST /api/v2/mission/{id}/claim`, `POST /api/v2/mission/daily-gift` / BE: 동일 경로 존재. 단, `POST /mission/{id}/claim`는 `X-Idempotency-Key` 헤더 필수. |
| **Streak Rules** | *(Missions 하위)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/mission/streak/rules` / BE: 동일 경로 존재(설정 없으면 기본 rules 반환) |
| **Streak Claim** | *(Missions 하위)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/mission/streak/claim` / BE: 동일 경로 존재 |
| **Streak Status (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/streak/status`는 `GET /api/v2/mission/streak/rules` alias |
| **Mission List (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/mission/list`는 `GET /api/v2/mission/` alias |
| **Mission Claim (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `POST /api/v2/mission/claim`는 더미 응답(`{"success": true}`) |

---

### 5-7. Inbox (Message Inbox)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Inbox** | `/v2/inbox` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/inbox`, `PATCH /api/v2/inbox/read` / BE: 동일 경로 존재. V2 Admin 메시지 팬아웃(inbox 테이블) 기반. |

---

### 5-8. Team Battle

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Team Battle Lobby** | `/v2/team-battle` *(계획)* | 🚧 미구현 | **Real/Stub** | Real: `GET /api/v2/team-battle/seasons/active`, `GET /api/v2/team-battle/teams`, `POST /api/v2/team-battle/teams/join`, `POST /api/v2/team-battle/teams/leave`, `GET /api/v2/team-battle/teams/me`, `GET /api/v2/team-battle/teams/leaderboard` / Stub: `GET /api/v2/team-battle/status`, `GET /api/v2/team-battle/rankings`, `POST /api/v2/team-battle/join` |

---

### 5-9. Ticket Zero

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Ticket Zero Status** | *(모달/위젯)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/ticket-zero/status` / BE: 동일 경로 존재 |
| **Ticket Zero Bailout** | *(모달 액션)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/ticket-zero/bailout` / BE: 동일 경로 존재 |
| **Ticket Zero Claim (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `POST /api/v2/ticket-zero/claim`는 bailout alias |

---

### 5-10. Golden (Retention / Intervention)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Golden Intervention Resolve** | *(내부 액션)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/golden/intervention/resolve` / BE: 동일 경로 존재 |
| **Golden Reengagement Queue** | *(내부 액션)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/golden/reengagement/queue` / BE: 동일 경로 존재 |
| **Golden Status** | *(위젯/배너)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/golden/status`는 더미(`{"status": "inactive"}`) |
| **Golden History** | *(히스토리)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/golden/history`는 빈 배열 반환 |

---

## 6. 불일치/누락 (Follow-ups)

아래 항목은 “문서/프론트/백” 중 하나가 어긋나 있어, 실제 유저 UI 구현 전에 정리 권장됩니다.

1) **Dice Double-Up API 불일치**
   - FE: `src/v2/api/gameApi.ts` → `POST /api/v2/dice/double-up`
   - BE: `app/v2/api/routes.py`에 해당 라우트 없음 → **Missing**

2) **Idempotency-Key 헤더 요구 vs FE 미반영(가능성 높음)**
   - BE: `POST /api/v2/mission/{id}/claim`, `POST /api/v2/shop/purchase`, `POST /api/v2/inventory/use`에서 Idempotency Key를 강제
   - FE: `src/v2/api/missionApi.ts`, `src/v2/api/shopApi.ts`, `src/v2/api/inventoryApi.ts`에서 헤더 주입 로직이 없음

3) **Inventory Use Request 필드명 불일치 가능성**
   - FE 타입: `UseInventoryItemRequest { item_type, quantity }`
   - BE 로직: `amount = int(payload.amount or 1)` 형태로 `amount`를 기대

4) **Feed 엔드포인트 불일치(마스터 플랜 vs BE)**
   - Plan: `GET /api/v2/feed/public`
   - BE: `GET /api/v2/feed/list` (Stub)

5) **Vault 관련 유저 API 미구현**
   - Plan: `GET /api/v2/vault/status`, `POST /api/v2/vault/withdraw`
   - BE: `app/v2/api/routes.py` 기준 해당 라우트 없음 → **Missing**

---

## 7. 다음 액션 (추천 순서)

1) Game Hub 디자인 재작업 (`src/v2/pages/game/GameHubPage.tsx`) — *UI 재설계 예정*
2) 위 “불일치/누락” 1~5 정리(특히 Dice double-up, idem 헤더, inventory payload)
3) Feed/Vault는 SoT 확정 후 BE/FE 경로 재정렬

---

## 8. 엔드포인트 검증 체크리스트 (메인/룰렛/주사위/복권)

### 8.1 메인 (Home)

- [ ] FE: `src/v2/components/layout/V2AppHeader.tsx` → `getV2VaultStatus`
- [ ] V2: `GET /api/v2/vault/status` (**Missing**) → V1 폴백 `GET /api/vault/status` (**Real**)
- [ ] FE: `src/v2/hooks/useV2Mission.ts` → `GET /api/v2/mission/` (**Real**)

### 8.2 룰렛 (4종)

- [ ] FE: `getV2RouletteStatus(activeTab)` → `GET /api/v2/roulette/status?ticket_type=...`
- [ ] FE: `playV2Roulette` → `POST /api/v2/roulette/play`
- [ ] BE: `app/v2/api/routes.py`에 `/roulette/status`, `/roulette/play` 존재
- [ ] 티켓 타입: `ROULETTE_TICKET`, `GOLD_KEY_TICKET`, `DIAMOND_TICKET`, `TRIAL_TICKET`
- [ ] V2 미가용 시 폴백: `GET /api/roulette/status`, `POST /api/roulette/play`

### 8.3 주사위

- [ ] FE: `getV2DiceStatus` → `GET /api/v2/dice/status`
- [ ] FE: `playV2Dice` → `POST /api/v2/dice/play`
- [ ] BE: `app/v2/api/routes.py`에 `/dice/status`, `/dice/play` 존재
- [ ] Missing: `POST /api/v2/dice/double-up` (FE만 존재)

### 8.4 복권

- [ ] FE: `getV2LotteryStatus` → `GET /api/v2/lottery/status`
- [ ] FE: `playV2Lottery` → `POST /api/v2/lottery/play`
- [ ] BE: `app/v2/api/routes.py`에 `/lottery/status`, `/lottery/play` 존재
- [ ] V2 미가용 시 폴백: `GET /api/lottery/status`

---

## 9. 변경 이력

- v1.1 (2026-01-21, GitHub Copilot): 메인/룰렛(4종)/주사위/복권 엔드포인트 검증 반영, Game Hub 디자인 재작업 예정 표기
- v1.0 (2026-01-20, 작성자 미상): 최초 작성
