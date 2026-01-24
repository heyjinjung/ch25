# Telegram 기존 계정 연동 v1 (start_param 링크 토큰)

## 0) 진행 현황
- [x] 링크 토큰 발급 API: `POST /api/telegram/link-token`
- [x] Telegram Auth 연동 처리: `POST /api/telegram/auth`의 `start_param=link_...`
- [x] JWT 타입 분리(액세스/링크): `typ=access` / `typ=tg_link`
- [x] DB 컬럼/마이그레이션: `telegram_link_nonce`, `telegram_link_nonce_expires_at`
- [x] 프론트에서 startParam 전달: `RequireAuth.tsx`, `ConnectPage.tsx`
- [ ] (선택) 운영 UI: “Telegram 연동 링크 발급” 화면 추가(어드민/유저)
- [ ] (v2) 탈취 리스크 완화: 추가 인증 단계 설계

## 1) 배경/문제
- Telegram Mini App(TMA) 로그인(`/api/telegram/auth`)은 `telegram_id`로 user를 찾는다.
- 기존 “웹/외부랭킹 기반” 유저가 Telegram에 **미연동 상태**로 바로 들어오면, 서버가 **새 user를 생성**한다.
- 결과적으로 `external_ranking_data.deposit_amount`(입금액/입금횟수 판단 근거)가 **기존 user_id에 남아서**, 신규/기존 판별이 틀어지고 신규 온보딩(보너스) 악용/오판 리스크가 생긴다.

## 2) 목표
- Telegram 진입 시 “기존 유저”가 새 user로 분리되지 않도록 **기존 user에 `telegram_id`를 attach** 한다.
- 운영 기준(외부랭킹 입금 이력)과 **동일한 user_id** 위에서 신규/기존 판별이 되도록 한다.
- 팀원이 누구나 재현/검증할 수 있게 API/체크리스트를 남긴다.

## 3) v1 설계 요약 (권장 플로우)
**핵심 아이디어**: 기존 계정(외부 ID)으로 로그인한 상태에서, 짧게 만료되는 **1회성 링크 토큰**을 발급하고, Telegram deep link의 `startapp`(= `start_param`)으로 전달한다.

### 시퀀스
1. (기존 계정) 클라이언트가 `/api/auth/token`으로 로그인해 JWT를 받는다.
2. 같은 JWT로 `/api/telegram/link-token` 호출 → `start_param=link_<token>` 발급
3. 사용자가 Telegram deep link로 TMA 실행 (URL에 `startapp=<start_param>`)
4. TMA가 `/api/telegram/auth` 호출 시 `start_param`을 함께 전달
5. 서버는 `link_<token>`을 검증하고, 해당 user에 `telegram_id`를 attach (이때 **새 user 생성 없음**)

## 4) 보안/악용 방지 (v1 최소)
- **JWT `typ` 분리**: 링크 토큰은 `typ=tg_link`, 액세스 토큰은 `typ=access`(legacy는 `typ` 없음도 허용)
- **1회성 nonce**: 발급 시 `user.telegram_link_nonce` 저장, 인증 시 nonce 일치 확인 후 즉시 제거
- **짧은 만료**: 기본 10분 (`TELEGRAM_LINK_TOKEN_EXPIRE_MINUTES`)
- **이미 연동된 계정 차단**: `telegram_id`가 있으면 `/api/telegram/link-token` 발급 불가

> 리스크(잔존): 토큰이 만료 전 탈취되면 공격자가 자신의 Telegram을 피해자 계정에 연결할 수 있다.  
> v2에서 “추가 확인 단계(비밀번호/2차 코드/텔레그램 DM 확인/입금 시그니처)” 등을 검토.

## 5) 구현 범위(코드)

### 백엔드
- JWT 구분/링크 토큰: `app/core/security.py`
  - `create_access_token(..., typ="access")`
  - `create_telegram_link_token(..., typ="tg_link")`
  - `decode_access_token()`는 `typ` 검사(legacy typ 없음 허용)
- 링크 토큰 발급/연동 처리: `app/api/routes/telegram.py`
  - `POST /api/telegram/link-token`
  - `POST /api/telegram/auth`에서 `start_param=link_...` 처리
- 설정값: `app/core/config.py`
  - `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBAPP_SHORT_NAME`, `TELEGRAM_LINK_TOKEN_EXPIRE_MINUTES`
- DB 컬럼: `app/models/user.py`
  - `telegram_link_nonce`, `telegram_link_nonce_expires_at`

### 프론트엔드
- Telegram start_param 전달: `src/components/routing/RequireAuth.tsx`, `src/pages/ConnectPage.tsx`
  - `useTelegram().startParam`을 `telegramApi.auth(initData, startParam)`에 전달

## 6) API 스펙(요약)

### 6.1 `POST /api/telegram/link-token`
- 인증: 필요(Bearer access token)
- 목적: `start_param` 발급(= Telegram deep link에 들어갈 payload)
- 응답:
  - `expires_at_utc`: 만료 시각
  - `start_param`: 예) `link_<JWT>`
  - `open_url`: (설정값 있으면) 예) `https://t.me/<bot>/<shortname>?startapp=<start_param>`

### 6.2 `POST /api/telegram/auth`
- 입력:
  - `init_data`: Telegram WebApp initData
  - `start_param`: (옵션) link/ref payload
- 동작:
  - `start_param`이 `link_`면 기존 계정 연동을 먼저 시도(성공 시 새 user 생성 없음)
  - 아니면 기존 로직대로 신규 user 생성/기존 user 갱신

## 7) 팀 QA 체크리스트(로컬/스테이징)
1. 마이그레이션 적용
   - `alembic upgrade head`
2. (기존 계정) 로그인 토큰 발급
   - `POST /api/auth/token` (external_id/password)
3. 링크 토큰 발급
   - `POST /api/telegram/link-token` with Authorization Bearer
4. Telegram에서 `open_url` 또는 `start_param`을 이용해 TMA 실행
5. TMA 자동 로그인 후 DB 확인
   - 기존 user row에 `telegram_id`가 채워졌는지
   - `external_ranking_data.user_id`가 동일한지(끊김 없는지)
6. 신규 온보딩 판별 확인
   - `GET /api/new-user/status`가 deposit 이력 있는 경우 `eligible=false`인지

## 8) 배포 순서(권장)
1. 백엔드 배포 + DB 마이그레이션
2. 프론트 배포(RequireAuth에서 startParam 전달)
3. 운영 설정(선택)
   - `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBAPP_SHORT_NAME` 세팅 시 `open_url` 자동 생성됨
