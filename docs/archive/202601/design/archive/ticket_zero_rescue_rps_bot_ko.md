# 티켓 제로 구출(가위바위보 Bot) v1 상세 기술서

문서 목적: “티켓이 0일 때 광고 대신 미니 콘텐츠(봇 가위바위보)로 티켓 1장을 구출” 기능을 **Telegram Mini App** 환경에서 안전하게 구현하기 위한 기술 사양서.

---

## 0) 한 줄 요약
- **조건(티켓 0)**이 충족되면 미니앱에서 **봇 대화로 이동** → **가위바위보 1판** → **승리 시 해당 게임 티켓 1장 지급** → 미니앱 복귀 후 **티켓 상태 UI 자동 갱신**.

---

## 1) 목표 / 비목표

### 1.1 목표
- 광고 없이 “티켓 0 → 즉시 복귀” 경험 제공(이탈 감소).
- 운영 비용(무제한 지급) 폭증을 막는 **최소 방어(일일 캡/쿨다운/1회성 코드)** 포함.
- Telegram Mini App 특성(뷰포트/세션/딥링크)에서 자연스럽게 작동.
- 서버가 결과를 결정/검증하여 **클라이언트 조작 방지**.

### 1.2 비목표(v1)
- 실제 “광고 SDK/리워드” 연동(대체).
- 봇에서 결제/Stars/인앱 결제까지 연결.
- 1판 이상(BO3) 확장(필요하면 v1.1에서).

---

## 2) 용어
- **티켓**: `user_game_wallet`의 `token_type` 별 보유량(예: `DICE_TOKEN`, `ROULETTE_COIN`, `LOTTERY_TICKET`)
- **티켓 제로**: 특정 token_type의 `balance == 0`
- **구출(Rescue)**: 티켓 제로 상태에서 미니 콘텐츠 성공 시 **해당 token_type 1장 지급**
- **세션 코드(code)**: Telegram `startapp/start_param` 길이 제한을 피하기 위해 쓰는 **짧은 1회성 코드**

---

## 3) 사용자 플로우(UX)

### 3.1 트리거(미니앱)
1) 사용자가 특정 게임 화면 진입/플레이 시도  
2) API status 응답에서 `token_balance == 0` 감지  
3) UI에 “티켓 제로 구출” CTA 노출

### 3.2 미니앱 → 봇 이동
- CTA 클릭 → 서버에 `rescue/start` 요청 → 응답으로 `open_url` 또는 `start_param` 수신  
- 미니앱에서 `Telegram.WebApp.openTelegramLink(open_url)`로 bot 대화 화면 오픈

### 3.3 봇에서 가위바위보 진행
1) 봇 `/start rescue_<code>` 수신  
2) 봇이 세션 유효성 확인(만료/이미사용/유저불일치)  
3) 봇이 “가위/바위/보” 3버튼(InlineKeyboard) 전송  
4) 유저가 버튼 클릭 → callback_query  
5) 봇이 서버에 `rescue/resolve` 호출(서버가 결과 결정)  
6) 봇이 결과 표시
- 승리: “티켓 1장 지급 완료” + “미니앱 돌아가기” 버튼
- 패배: “실패” + (운영 정책에 따라) “재도전(쿨다운 후)” 또는 “내일 다시”

### 3.4 미니앱 복귀
- 사용자가 “미니앱 돌아가기” 버튼 클릭(웹앱 버튼)
- 미니앱은 관련 query(invalidate)로 **티켓 상태 재조회**하여 UI 업데이트

---

## 4) 서버 설계(백엔드)

### 4.1 엔드포인트(권장)

#### 4.1.1 `POST /api/ticket-zero/rescue/start`
- 인증: 필요(Bearer)
- 입력:
  - `token_type`: `"DICE_TOKEN" | "ROULETTE_COIN" | "LOTTERY_TICKET"` (확장 가능)
- 검증:
  - `user.telegram_id` 존재(텔레그램 연동 필수)
  - 해당 `token_type` 지갑 잔고 `0`
  - 일일 제한/쿨다운/동시 진행 세션 제한
- 처리:
  - **짧은 code 생성**(예: 10~16자 base62)
  - DB에 rescue session 저장(만료 시각 포함)
  - `start_param = rescue_<code>` 발급
  - (선택) `open_url` 생성: `https://t.me/<bot_username>?startapp=rescue_<code>`
- 응답 예시:
```json
{
  "start_param": "rescue_a1B2c3D4e5",
  "open_url": "https://t.me/cc_jm_2026_bot?startapp=rescue_a1B2c3D4e5",
  "expires_at_utc": "2025-12-31T12:00:00Z",
  "token_type": "DICE_TOKEN",
  "daily_remaining": 2,
  "cooldown_seconds": 0
}
```

#### 4.1.2 `POST /api/ticket-zero/rescue/resolve` (봇 전용)
- 인증: 봇-서버 간 인증 필요(권장: 내부망 + 서명 헤더 또는 별도 BOT_API_KEY)
- 입력:
  - `code`: `"a1B2c3D4e5"`
  - `telegram_id`: `123456789`
  - `user_choice`: `"ROCK" | "PAPER" | "SCISSORS"`
- 검증:
  - code 존재/만료/사용여부
  - session.user_id의 `telegram_id == 요청 telegram_id`
  - 여전히 잔고가 0인지(운영 선택: “시작 시점 0만” vs “해결 시점도 0”)
- 처리(원자성):
  - DB row lock(또는 unique update)로 **1회성 보장**
  - 서버가 `server_choice` 결정(secure RNG)
  - 결과 계산(WIN/LOSE/DRAW)
  - 정책:
    - WIN: 해당 token_type에 `+1` 지급, session `USED/WON` 처리
    - LOSE: session `USED/LOST` 처리(또는 재도전 허용이면 `attempts` 증가)
    - DRAW: v1 권장 정책은 “무승부=재시도 1회” 또는 “무승부=즉시 재선택”
- 응답 예시:
```json
{
  "result": "WIN",
  "user_choice": "ROCK",
  "server_choice": "SCISSORS",
  "granted": 1,
  "token_type": "DICE_TOKEN",
  "new_balance": 1
}
```

#### 4.1.3 `GET /api/ticket-zero/rescue/status` (선택)
- 미니앱에서 “진행 중 세션/쿨다운/일일잔여”를 보여주고 싶을 때 사용

---

## 5) DB 설계(권장 스키마)

### 5.1 `ticket_zero_rescue_session`
- `code` (PK, string 16)
- `user_id` (FK)
- `telegram_id` (캐시용, optional)
- `token_type` (enum/string)
- `status` (`PENDING|WON|LOST|EXPIRED|CANCELLED`)
- `created_at`, `expires_at`, `used_at`
- `attempts` (int, default 0)
- `server_choice` (string, optional)
- `client_ip`, `user_agent` (옵션)

인덱스 권장:
- `(user_id, created_at)` / `(user_id, token_type, created_at)`

### 5.2 `ticket_zero_rescue_log` (옵션)
- 세션별 요청/결과 감사 로그
- 운영 이슈(악용/분쟁) 대응용

---

## 6) Telegram Bot 설계(권장)

### 6.1 구현 방식
현재 코드베이스는 `python-telegram-bot`(Polling) 기반(`app/bot/main.py`). v1은 아래 2가지 중 택1:

1) **Polling 유지(v1 빠른 적용)**  
   - 장점: 배포/인프라 단순  
   - 단점: 서버 프로세스 상시 실행 필요

2) **Webhook 전환(v1.1 권장)**  
   - 장점: 운영 안정/확장/비용 효율  
   - 단점: HTTPS + webhook endpoint 구성 필요

### 6.2 핸들러
- `/start`:
  - 인자 파싱: `startapp` 또는 `start` payload에서 `rescue_<code>` 획득
  - rescue 모드면 가위/바위/보 버튼 전송
- `CallbackQueryHandler`:
  - `callback_data`: `rz:<code>:<move>`
  - 클릭 시 `/api/ticket-zero/rescue/resolve` 호출 후 메시지 수정(edit)

### 6.3 “미니앱 돌아가기” 버튼
- `InlineKeyboardButton(web_app=WebAppInfo(url=settings.telegram_mini_app_url))`
- (선택) 특정 경로로 유도하려면 `?startapp=...`를 활용(단, 길이 제한 고려)

---

## 7) 프론트엔드 설계(권장)

### 7.1 UI 위치
- `TicketZeroPanel`(현재 비활성) 또는 게임 페이지 상단/모달에 “티켓 제로 구출” CTA

### 7.2 동작
- `token_balance == 0`일 때만 CTA 노출
- CTA 클릭 → `POST /api/ticket-zero/rescue/start`
- 응답의 `open_url`을 `Telegram.WebApp.openTelegramLink(open_url)`로 호출
- 미니앱 복귀 시:
  - 관련 status query(`dice-status`, `roulette-status`, `lottery-status`) invalidate

### 7.3 사운드/연출
- 시작 버튼 클릭 시 `playTabTouch`/`playToast` 등 SFX 사용(이미 `useSound` 존재)

---

## 8) 악용 방지(최소 세트)
- **티켓 0 조건**: 해당 token_type 잔고가 0일 때만 시작 가능
- **일일 캡**: (예) token_type별 하루 3회
- **쿨다운**: (예) 실패 후 30~60초
- **1회성 코드**: `resolve` 성공/실패 시 `used_at` 기록(재사용 불가)
- **텔레그램 연동 필수**: `telegram_id` 없는 계정은 시작 불가
- **서버결정형 결과**: client 조작 방지

---

## 9) 로깅/모니터링(운영)
- 세션 생성/해결 결과를 구조화 로그로 남김
- 지표:
  - 시작 대비 완료율, 승률, 지급량, 유저당 시도 횟수
  - 악용 의심(짧은 시간 다계정/다시도 과다)

---

## 10) 테스트 전략

### 10.1 백엔드(pytest)
- `start`의 eligibility(티켓 0/일일캡/쿨다운) 케이스
- `resolve`의 1회성/만료/유저불일치/지갑 지급 검증

### 10.2 프론트(E2E/Cypress)
- 티켓 0 상태 mock → CTA 클릭 → `openTelegramLink` 호출 여부 확인(Spy)
- 지급 이후 status 재조회로 UI 변화 확인(토큰 카운트 증가)

---

## 11) 롤아웃/릴리즈 플랜(v1)
1) DB 마이그레이션 적용
2) 서버 API 배포
3) Bot 배포(최초는 Polling 가능)
4) 프론트에서 CTA 노출(기능 플래그 권장)
5) 운영 파라미터(일일캡/쿨다운/승리보상) 튜닝

