# V2 User 페이지 구현 점검 및 플로우 체크

**목적**: V2 유저(서비스) 프론트엔드 화면의 **구현 현황(UI)**, **API 준비 상태(백엔드)**, 그리고 **후속 작업(불일치/누락)**을 한 번에 추적하기 위한 문서입니다.

- 기준일: 2026-01-20
- SoT(화면/라우팅 계획): `docs/v2_specs/06_design/v2_frontend_master_plan_ko.md`
- Backend 실제 구현(유저 API): `app/v2/api/routes.py`
- Frontend 실제 클라이언트(API/Hooks): `src/v2/api/*`, `src/v2/hooks/useV2*.ts`

---

## 0. 현재 구조 요약 (Facts)

- `src/v2/pages/` 폴더는 존재하지만 현재 비어있어, 유저용 **V2 페이지 컴포넌트가 미구현** 상태입니다.
- 마스터 플랜에는 `src/v2/router/V2Routes.tsx`를 가정하고 있으나, 현재 리포 스캔 기준으로는 **유저용 V2 라우터 파일이 확인되지 않음**(어드민 라우터만 존재).
- 반면, 유저 기능의 **API 클라이언트/훅은 이미 존재**하여, 화면만 올리면 연동 가능한 영역이 많습니다.

---

## 1. 화면 리스트 및 구현 현황

표의 의미는 V2 Admin 문서와 동일하게 유지합니다.

| 필드 | 의미 |
| :--- | :--- |
| Route | 계획/목표 라우팅(주로 `/v2/...`) |
| UI 상태 | ✅ 완료 / 🚧 미구현(계획) / 🧪 POC |
| API 상태 | **Real** / **Stub** / **Missing** / **Check** |

> **Stub**: 서버에 라우트는 있으나 더미 응답(SoT 준수용) 또는 Alias 수준

---

### 1-1. Auth / Entry

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Login / Entry** | `/v2/login` *(계획)* | 🚧 미구현 | **Check** | 마스터 플랜 상 계획. 현재 `src/v2/api/client.ts`의 401 리다이렉트는 기본적으로 `/login`(레거시)로 이동(비고 참고 필요). |

---

### 1-2. Home / Lobby

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Lobby (Home)** | `/v2/home` *(계획)* | 🚧 미구현 | **Stub/Missing** | 마스터 플랜의 `GET /api/v2/feed/public`는 현재 BE에 없음. 대신 `GET /api/v2/feed/list`가 **Stub**로 존재. |

---

### 1-3. Game Rooms

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Roulette** | `/v2/game/roulette` *(계획)* | 🚧 미구현 | **Real** | FE: `src/v2/api/gameApi.ts` → `GET /api/v2/roulette/status`, `POST /api/v2/roulette/play` / BE: 동일 경로 존재 |
| **Dice** | `/v2/game/dice` *(계획)* | 🚧 미구현 | **Real/Missing** | FE: `GET /api/v2/dice/status`, `POST /api/v2/dice/play`(Real). 추가로 FE에 `POST /api/v2/dice/double-up` 호출이 있으나 BE 라우트가 없어 **Missing**. |
| **Lottery** | `/v2/game/lottery` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/lottery/status`, `POST /api/v2/lottery/play` / BE: 동일 경로 존재 |

---

### 1-4. Inventory

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Inventory** | `/v2/inventory` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/inventory`, `POST /api/v2/inventory/use` / BE: 동일 경로 존재. 다만 BE는 `Idempotency-Key`(또는 `X-Idempotency-Key`) 필수. |
| **Inventory Items (alias)** | *(내부/옵션)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/inventory/items`는 alias로 존재(아이템 배열만 반환). |
| **Exchange / Craft** | `/v2/exchange` *(계획)* | 🚧 미구현 | **Stub** | BE: `POST /api/v2/exchange/craft`는 Stub(`{"success": true}`) |

---

### 1-5. Shop (Exchange)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Shop** | `/v2/shop` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/shop/products`, `POST /api/v2/shop/purchase` / BE: 동일 경로 존재. BE는 구매 시 `Idempotency-Key`(또는 `X-Idempotency-Key`) 필수. |

---

### 1-6. Missions / Streak

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Missions** | `/v2/missions` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/mission/`, `POST /api/v2/mission/{id}/claim`, `POST /api/v2/mission/daily-gift` / BE: 동일 경로 존재. 단, `POST /mission/{id}/claim`는 `X-Idempotency-Key` 헤더 필수. |
| **Streak Rules** | *(Missions 하위)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/mission/streak/rules` / BE: 동일 경로 존재(설정 없으면 기본 rules 반환) |
| **Streak Claim** | *(Missions 하위)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/mission/streak/claim` / BE: 동일 경로 존재 |
| **Streak Status (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/streak/status`는 `GET /api/v2/mission/streak/rules` alias |
| **Mission List (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/mission/list`는 `GET /api/v2/mission/` alias |
| **Mission Claim (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `POST /api/v2/mission/claim`는 더미 응답(`{"success": true}`) |

---

### 1-7. Inbox (Message Inbox)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Inbox** | `/v2/inbox` *(계획)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/inbox`, `PATCH /api/v2/inbox/read` / BE: 동일 경로 존재. V2 Admin 메시지 팬아웃(inbox 테이블) 기반. |

---

### 1-8. Team Battle

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Team Battle Lobby** | `/v2/team-battle` *(계획)* | 🚧 미구현 | **Real/Stub** | Real: `GET /api/v2/team-battle/seasons/active`, `GET /api/v2/team-battle/teams`, `POST /api/v2/team-battle/teams/join`, `POST /api/v2/team-battle/teams/leave`, `GET /api/v2/team-battle/teams/me`, `GET /api/v2/team-battle/teams/leaderboard` / Stub: `GET /api/v2/team-battle/status`, `GET /api/v2/team-battle/rankings`, `POST /api/v2/team-battle/join` |

---

### 1-9. Ticket Zero

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Ticket Zero Status** | *(모달/위젯)* | 🚧 미구현 | **Real** | FE: `GET /api/v2/ticket-zero/status` / BE: 동일 경로 존재 |
| **Ticket Zero Bailout** | *(모달 액션)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/ticket-zero/bailout` / BE: 동일 경로 존재 |
| **Ticket Zero Claim (alias)** | *(옵션)* | 🚧 미구현 | **Stub** | BE: `POST /api/v2/ticket-zero/claim`는 bailout alias |

---

### 1-10. Golden (Retention / Intervention)

| 페이지명 | 경로 (Route) | UI 상태 | API 상태 | 비고 |
| :--- | :--- | :---: | :---: | :--- |
| **Golden Intervention Resolve** | *(내부 액션)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/golden/intervention/resolve` / BE: 동일 경로 존재 |
| **Golden Reengagement Queue** | *(내부 액션)* | 🚧 미구현 | **Real** | FE: `POST /api/v2/golden/reengagement/queue` / BE: 동일 경로 존재 |
| **Golden Status** | *(위젯/배너)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/golden/status`는 더미(`{"status": "inactive"}`) |
| **Golden History** | *(히스토리)* | 🚧 미구현 | **Stub** | BE: `GET /api/v2/golden/history`는 빈 배열 반환 |

---

## 2. 불일치/누락 (Follow-ups)

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

## 3. 다음 액션 (추천 순서)

1) 유저용 라우터/페이지 골격 생성 (`src/v2/router/V2Routes.tsx`, `src/v2/pages/**`) — *문서 범위 밖이지만 UI 구현 전제*
2) 위 “불일치/누락” 1~5 정리(특히 Dice double-up, idem 헤더, inventory payload)
3) Feed/Vault는 SoT 확정 후 BE/FE 경로 재정렬
