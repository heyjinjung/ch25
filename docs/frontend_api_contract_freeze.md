# 프론트 교체 시 변경 금지 계약 (API + 인증)

목적: UI를 완전히 새로 만들어도 **백엔드/API/DB는 변경 없이 유지**하기 위해, 현재 프론트가 기대하는 API 계약과 인증 흐름을 고정한다.

- 범위: 사용자 로그인, 룰렛/주사위/복권, 시즌패스, 팀배틀
- 원칙: **엔드포인트/필드명/타입/인증 헤더/401 처리**는 변경하지 않는다.

---

## 1) 인증(토큰) 계약

### 저장/키
- 저장소: `localStorage`
- 대표 키
  - `xmas_access_token` (정식)
  - `token` (레거시 호환; 반드시 유지)
  - `xmas_user` (사용자 정보)
  - `xmas_auth_version` = `v2`

근거 구현
- [src/auth/authStore.ts](src/auth/authStore.ts)

### 요청 헤더
- 모든 보호 API 호출은 아래 헤더를 지원해야 함
  - `Authorization: Bearer <token>`

근거 구현
- 사용자 API 클라이언트: [src/api/httpClient.ts](src/api/httpClient.ts)
- 공용 API 클라이언트: [src/api/apiClient.ts](src/api/apiClient.ts)

### 401/403 처리(필수 동작)
- 응답이 `401` 또는 `403`이면:
  1) 로컬 토큰/유저 정보 삭제 (`clearAuth()`)
  2) 브라우저를 `"/login"` 으로 이동

근거 구현
- [src/api/httpClient.ts](src/api/httpClient.ts)
- [src/api/apiClient.ts](src/api/apiClient.ts)

### 라우팅 가드(RequireAuth)
- 토큰이 없으면 `"/login"`으로 이동하며, 원래 목적지(`state.from`)를 저장

근거 구현
- [src/components/routing/RequireAuth.tsx](src/components/routing/RequireAuth.tsx)

### 로그인 후 리다이렉트
- `location.state.from`이 있으면 해당 경로로, 없으면 기본 `"/landing"`

근거 구현
- [src/pages/LoginPage.tsx](src/pages/LoginPage.tsx)

---

## 2) 로그인 API

### POST /api/auth/token
요청(`LoginRequest`)
- `external_id?: string`
- `password?: string`
- (옵션) `user_id?: number`

응답(`LoginResponse`)
- `access_token: string`
- `token_type?: string`
- `user: AuthUser`

근거 구현
- [src/api/authApi.ts](src/api/authApi.ts)

---

## 3) 룰렛 API

### GET /api/roulette/status
프론트가 사용하는 필드(중요)
- `remaining_spins: number`
- `token_type: GameTokenType`
- `token_balance: number`
- `feature_type: string`
- `segments: Array<{ label: string; reward_type: string; reward_amount: number; slot_index?: number; weight?: number; is_jackpot?: boolean }>`

### POST /api/roulette/play
프론트가 사용하는 필드(중요)
- `result: string` (OK가 아니면 message로 노출)
- `segment: { label, reward_type, reward_amount, slot_index?, weight?, is_jackpot? }`
- `season_pass?: object | null` (옵션)

근거 구현
- [src/api/rouletteApi.ts](src/api/rouletteApi.ts)

---

## 4) 주사위 API

### GET /api/dice/status
프론트가 사용하는 필드(중요)
- `remaining_plays: number`
- `token_type: GameTokenType`
- `token_balance: number`
- `feature_type: string`

### POST /api/dice/play
프론트가 사용하는 필드(중요)
- `result: string`
- `game.user_dice: number[]`
- `game.dealer_dice: number[]`
- `game.outcome: "WIN" | "LOSE" | "DRAW"`
- `game.reward_type: string`
- `game.reward_amount: number`
- `season_pass?: object | null` (옵션)

근거 구현
- [src/api/diceApi.ts](src/api/diceApi.ts)

---

## 5) 복권 API

### GET /api/lottery/status
프론트가 사용하는 필드(중요)
- `remaining_tickets: number`
- `token_type: GameTokenType`
- `token_balance: number`
- `feature_type: string`
- `prize_preview: Array<{ id: number; label: string; reward_type: string; reward_amount: number | string; stock?: number | null; is_active?: boolean }>`

### POST /api/lottery/play
프론트가 사용하는 필드(중요)
- `result: string`
- `prize: { id, label, reward_type, reward_amount, stock?, is_active? }`

근거 구현
- [src/api/lotteryApi.ts](src/api/lotteryApi.ts)

---

## 6) 시즌패스 API

### GET /api/season-pass/status
- 응답은 현재 프론트가 `raw.progress.*`, `raw.levels`, `raw.season.*`, `raw.today` 형태를 파싱한다.
- 최소 요구(프론트가 참조하는 키)
  - `progress.current_level`, `progress.current_xp`, `progress.next_level_xp`
  - `levels[]`: `level`, `required_xp`, `reward_label` 또는 (`reward_type`/`reward_amount`)
  - `season.max_level`, (옵션) `season.base_xp_per_stamp`
  - (옵션) `today.stamped`

### GET /api/season-pass/internal-wins
응답(`InternalWinStatusResponse`)
- `total_wins: number`
- `threshold: number`
- `remaining: number`

### POST /api/season-pass/claim
요청
- `{ level: number }`
응답
- `{ level: number; reward_label: string; message?: string }`

### POST /api/season-pass/stamp
요청
- `{ source_feature_type: string; xp_bonus: number }`
응답
- `{ added_stamp, xp_added, current_xp, current_level, leveled_up, rewards?, message? }`

근거 구현
- [src/api/seasonPassApi.ts](src/api/seasonPassApi.ts)

---

## 7) 팀배틀 API

### GET /api/team-battle/seasons/active
- 응답: `TeamSeason | null`

### GET /api/team-battle/teams
- 응답: `Team[]`

### POST /api/team-battle/teams/join
요청
- `{ team_id: number }`
응답
- `TeamJoinResponse`

### POST /api/team-battle/teams/auto-assign
- 응답: `TeamJoinResponse`

### POST /api/team-battle/teams/leave
- 응답: `{ left: boolean }`

### GET /api/team-battle/teams/leaderboard
쿼리
- `season_id?: number`
- `limit: number`
- `offset: number`
응답
- `LeaderboardEntry[]`

### GET /api/team-battle/teams/:teamId/contributors
쿼리
- `season_id?: number`
- `limit: number`
- `offset: number`
응답
- `ContributorEntry[]`

### GET /api/team-battle/teams/me
- 응답: `TeamMembership | null`

근거 구현
- [src/api/teamBattleApi.ts](src/api/teamBattleApi.ts)

---

## 8) 프론트 교체(리뉴얼) 시 권장 작업 방식

- UI는 완전 교체 가능(컴포넌트/레이아웃/테마/라우팅 구조 변경 포함)
- 단, 아래는 **그대로 재사용/유지** 권장
  - API 호출 모듈(`src/api/*`)과 토큰 인터셉터
  - `RequireAuth` + `LoginPage`의 from 리다이렉트 로직

이 문서의 목적은 “UI 리뉴얼” 작업이 백엔드를 흔들지 않도록 계약을 명확히 하는 것이다.
