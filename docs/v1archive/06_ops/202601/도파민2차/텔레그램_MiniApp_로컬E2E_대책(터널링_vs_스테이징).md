# 텔레그램 Mini App 로컬 E2E (터널링으로 HTTPS 노출 확정판)

**작성일**: 2026-01-14
**목적**: 텔레그램 Mini App 구조(인앱 진입 + initData 검증 + HTTPS 도메인 제약) 때문에 로컬에서 실제 E2E가 막히는 문제를, **터널링 1가지 루프**로 “반복 가능”하게 만든다.

---

## 0) TL;DR (이 문서 결론)
- 로컬 E2E는 **서버/스테이징 없이도 가능**하다. 대신 텔레그램이 접속할 수 있도록 로컬을 **공개 HTTPS URL로 터널링**해야 한다.
- 이 레포 구성에서는 터널링을 `localhost:3000`(프론트 컨테이너)로 거는 게 가장 단순하다.
  - 프론트가 `/api/`를 백엔드로 프록시해서, 텔레그램 인앱에서도 same-origin으로 API가 붙는다.
- 운영 사고 방지: **운영 봇 토큰 사용 금지**(개발용 봇/토큰 사용 강력 권장).

---

## 0.1 팀 표준(확정): Cloudflare Tunnel (Windows 기준)
- 팀 표준 도구는 **Cloudflare Tunnel(cloudflared)** 로 고정한다.
  - 이유: 윈도우에서 설치/실행이 단순하고, `https://*.trycloudflare.com` HTTPS URL을 즉시 받을 수 있어 “캡처용 재현 절차”가 가장 깔끔하다.

---

## 1) 왜 로컬 E2E가 기본적으로 막히나 (현황)
- 텔레그램 Mini App은 클라이언트가 전달하는 `initData`를 서버가 검증해야 하며, 이는 **텔레그램이 발급한 서명 데이터**가 아니면 통과 불가.
- Mini App은 텔레그램 인앱에서 **HTTPS URL**로 열린다.
- 본 프로젝트는 텔레그램 인증을 [app/api/routes/telegram.py](app/api/routes/telegram.py) 의 `/api/telegram/auth`를 “단일 진입점”으로 사용한다.

즉, `http://localhost`만으로는 “진짜 텔레그램 컨텍스트(E2E)”를 재현하기 어렵다.

---

## 2) 준비물(필수/권장)

### 2.1 필수
- 로컬에서 프론트+백이 실행 가능한 상태
- 터널링 도구 1개
  - **Cloudflare Tunnel (팀 표준)**

### 2.2 강력 권장(사고 방지)
- **개발용 Telegram Bot** (운영 bot 토큰 사용 금지)
  - 이유: 터널링은 로컬을 외부에 공개한다. 운영 토큰을 쓰면 실수 한 번이 운영 사고로 이어진다.

---

## 2.3 Windows 설치/실행 명령(캡처용, Cloudflare Tunnel)

### A) 설치(winget)
PowerShell(관리자 권한 불필요한 경우가 많음)에서:

```powershell
winget install --id Cloudflare.cloudflared -e
cloudflared --version
```

### B) 로컬 기동(필수 전제)
이 레포 기준 “프론트 단일 진입점”이 `localhost:3000`이므로, 먼저 컨테이너를 올린다:

```powershell
docker compose up -d --build
```

### C) 터널 실행(HTTPS URL 발급)

```powershell
cloudflared tunnel --url http://localhost:3000
```

- 출력 로그에 `https://...trycloudflare.com` 형태의 URL이 표시된다.
- 이 URL이 **텔레그램이 Mini App을 여는 주소(=BotFather에 넣을 주소)** 다.
- Windows에서 아래 로그가 떠도, 마지막에 `Registered tunnel connection`이 나오고 실제 URL 접속이 되면 정상이다.
  - `ERR Cannot determine default origin certificate path... cert.pem`
  - `cloudflared does not support loading the system root certificate pool on Windows...`

### D) 토큰/시크릿 보안 룰(필수)
- `TELEGRAM_BOT_TOKEN`은 문서/레포/캡처/대화 로그에 쓰지 말고 **로컬에서만** 사용한다.
- 터널 테스트가 끝나면 `cloudflared`를 종료해서 공개 URL을 즉시 닫는다.

### E) `.env` 꼬임 방지(Windows 원복 루프)

> 결론: 로컬에서 `.env`를 잠깐 바꿔도 **CI 운영배포의 서버 `.env`와는 별개**다.
> 그래도 실수 방지를 위해 “백업→교체→원복”을 절차로 고정한다.

**원칙**
- 테스트 봇을 나중에 폐기하더라도 토큰은 시크릿이다. 로컬에서만 쓰고, 테스트 종료 후 흔적을 지운다.
- 백업 파일은 `env.bak/` 아래에 둔다. (레포의 `.gitignore`가 `env.bak/` 디렉토리를 무시)

**1) 최초 1회: 현재 `.env` 백업 만들기**

```powershell
New-Item -ItemType Directory -Force env.bak
Copy-Item .env env.bak\.env.base -Force
```

**2) 테스트용 `.env` 만들기(예: 테스트 봇 토큰 포함)**

```powershell
Copy-Item env.bak\.env.base env.bak\.env.tgtest -Force
# env.bak\.env.tgtest 를 열어서 아래 3가지를 테스트용으로 맞춘다
# - TELEGRAM_BOT_TOKEN: 테스트 봇 토큰
# - TELEGRAM_BOT_USERNAME: 테스트 봇 username(예: jm114_bot)
# - TELEGRAM_MINI_APP_URL: cloudflared가 뱉은 https://...trycloudflare.com
# (프론트 딥링크가 운영 봇으로 튀지 않게) VITE_TELEGRAM_BOT_USERNAME / VITE_TELEGRAM_WEBAPP_SHORT_NAME도 로컬 값으로 설정
```

**3) 테스트 시작: `.env`를 테스트용으로 교체**

```powershell
Copy-Item env.bak\.env.tgtest .env -Force
docker compose up -d --build
```

**4) 테스트 종료: `.env` 원복(기본값 복구)**

```powershell
Copy-Item env.bak\.env.base .env -Force
docker compose up -d
```

**5) 테스트 봇 폐기 후(권장)**
- `env.bak\.env.tgtest` 파일 삭제(토큰 흔적 제거)

---

## 3) 로컬 실행 구성(이 레포 기준)

### 3.1 포트/라우팅(핵심)
- `docker-compose.yml` 기준
  - 프론트: `localhost:3000`
  - 백엔드: `localhost:8000`
- 프론트(nginx)가 `/api/`를 백엔드로 프록시한다: [nginx/frontend.conf](nginx/frontend.conf)

따라서 “텔레그램에서 여는 URL”을 프론트 하나로 고정하고, API도 같은 도메인(`/api/...`)으로 붙이면 제일 안정적이다.

---

## 4) 실행 절차(권장 루프: `localhost:3000` → 터널링)

### 4.1 로컬 컨테이너 기동
1) `.env`가 준비되어 있어야 한다(로컬 DB/토큰 등은 로컬용 값).
2) 기동

```bash
docker compose up -d --build
```

3) 로컬 확인(브라우저)
- `http://localhost:3000/health` 또는 메인 페이지 로드 확인
- `http://localhost:3000/api/health`(또는 백엔드 헬스) 확인

### 4.2 터널링 선택

#### 옵션 A) Cloudflare Tunnel (팀 표준)
목표: `https://xxxxx.trycloudflare.com` 같은 공개 HTTPS URL을 얻어서 `localhost:3000`으로 포워딩.

1) cloudflared 설치
2) 실행 예시(간단 모드)

```bash
cloudflared tunnel --url http://localhost:3000
```

3) 출력되는 `https://...` URL을 기록

#### 옵션 B) ngrok (빠른 시작)
1) ngrok 설치/로그인(필요 시)
2) 실행

```bash
ngrok http 3000
```

3) 표시되는 `https://...` URL을 기록

---

## 5) BotFather 설정 체크리스트(최소)

> 핵심: 텔레그램이 Mini App을 열 URL을 “터널 HTTPS URL”로 맞춘다.

- [ ] 개발용 봇을 만든다(강력 권장)
- [ ] Web App(또는 Mini App) URL에 **터널링으로 받은 `https://...`** 를 설정한다
- [ ] 터널 URL이 바뀌면(특히 ngrok 무료) BotFather 설정도 같이 바뀌어야 한다

---

## 6) E2E 확인 체크리스트(이것만 되면 성공)

### 6.1 인앱 진입
- [ ] 텔레그램에서 개발용 봇으로 Mini App 열기

### 6.2 인증
- [ ] 프론트가 `/api/telegram/auth`를 호출해서 200으로 인증 성공

### 6.3 핵심 API 1개
- [ ] 인증 후 `/api/vault/status` 같은 핵심 API 1개가 정상 200

---

## 7) 실패 시 1분 트리아지(자주 터지는 3가지)

### 7.1 Mini App이 안 열림
- HTTPS URL이 맞는지(터널 URL)
- BotFather에 설정된 URL이 최신인지(ngrok는 자주 바뀜)

### 7.1.1 “운영 봇/운영 도메인으로 이동”
증상:
- 텔레그램에서 버튼을 누르면 운영 봇/운영 도메인으로 이동

원인(로컬에서 가장 흔함):
- `TELEGRAM_MINI_APP_URL`이 운영 도메인으로 고정되어 있음(로컬 bot 컨테이너가 /start 버튼 URL을 여기서 읽음)
- 프론트 빌드에 `VITE_TELEGRAM_BOT_USERNAME`이 주입되지 않아 기본값(운영)을 사용

해결:
- `.env`에 아래를 로컬값으로 맞춘 뒤 `docker compose up -d --build`로 반영
  - `TELEGRAM_BOT_USERNAME` (예: `jm114_bot`)
  - `TELEGRAM_WEBAPP_SHORT_NAME` (예: `ccjm`)
  - `TELEGRAM_MINI_APP_URL` (예: `https://xxxx.trycloudflare.com`)
  - `VITE_TELEGRAM_BOT_USERNAME`, `VITE_TELEGRAM_WEBAPP_SHORT_NAME`

### 7.2 `/api/telegram/auth`가 400(인증 실패)
- 텔레그램 인앱에서 열린 게 맞는지(브라우저 직접 접속이면 initData가 없음)
- 백엔드가 올바른 봇 토큰으로 initData를 검증하고 있는지(운영 토큰/개발 토큰 혼선)

### 7.3 `/api/*`가 404 또는 HTML로 떨어짐
- 터널링을 `localhost:3000`에 걸었는지(프론트 라우팅)
- 프론트 nginx가 `/api/`를 백엔드로 프록시하는지([nginx/frontend.conf](nginx/frontend.conf))

### 7.4 `/api/health`가 502 (특히 backend만 재시작한 직후)
증상:
- `http://localhost:3000/api/health` 가 `502 Bad Gateway`
- `http://localhost:8000/api/health` 는 `200` 정상

원인(로컬 Docker에서 흔함):
- frontend nginx가 `backend`를 **컨테이너 IP로 1회 resolve**해서 기억해둔 뒤,
  backend 컨테이너가 재시작되며 IP가 바뀌면 **stale IP로 접속 시도 → connection refused → 502**

해결:
- [nginx/frontend.conf](nginx/frontend.conf) 에서 `/api/`, `/admin/api/`의 `proxy_pass`를 **변수 기반**으로 만들어 nginx가 Docker DNS를 재해석하도록 처리
- 변경 반영을 위해 `frontend` 재빌드/재시작

검증(Windows PowerShell):

```powershell
docker compose up -d --build frontend
(Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health).StatusCode

# backend만 재시작해도 200 유지되는지 확인
docker compose restart backend
Start-Sleep -Seconds 2
(Invoke-WebRequest -UseBasicParsing http://localhost:3000/api/health).StatusCode
```

### 7.5 “운영 봇이 뜨는 것 같음” (로컬이 실제로 어떤 봇을 쓰는지 확인)
토큰을 출력하지 않고, Telegram API `getMe`로 현재 컨테이너가 쓰는 봇 사용자명을 확인한다:

```powershell
docker compose exec -T backend python -c "import os,json,urllib.request,sys; t=os.environ.get('TELEGRAM_BOT_TOKEN'); print('TELEGRAM_BOT_TOKEN: MISSING') if not t else None; sys.exit(1) if not t else None; url=f'https://api.telegram.org/bot{t}/getMe'; data=json.load(urllib.request.urlopen(url,timeout=10)); res=(data.get('result') or {}); print('BOT_USERNAME=@'+str(res.get('username'))); print('BOT_NAME='+str(res.get('first_name')))"
```

### 7.6 Mini App에서 버튼을 누르면 “운영 봇(@jm956_bot)”으로 이동함
원인:
- 프론트에서 `https://t.me/<bot>/<short_name>` 링크가 하드코딩되어 있으면, 어떤 봇으로 들어왔든 버튼 클릭 시 그 하드코딩 경로로 이동한다.

해결(로컬에서 테스트 봇으로 전환):
- `.env`에 아래 값을 추가하고 `frontend`를 재빌드한다.

```dotenv
VITE_TELEGRAM_BOT_USERNAME=jm114_bot
# 생략 가능(기본 ccjm)
# VITE_TELEGRAM_WEBAPP_SHORT_NAME=ccjm
```

```powershell
docker compose up -d --build frontend
```

### 7.7 `Error 1033` (Cloudflare Tunnel) — “터널은 열려있는데 접근이 안 됨”
증상:
- 브라우저/텔레그램에서 `Error 1033 / Cloudflare Tunnel error` 화면
- 메시지에 **host가 `*.trycloudflare.com`** 로 표시되며 “unable to resolve” 류 문구

원인(대부분 이 2개):
1) **예전 `trycloudflare` URL로 접근**하고 있음 (터널 URL은 매번 바뀜)
2) `cloudflared` 프로세스가 죽었거나, PC 슬립/네트워크 변경으로 연결이 끊김

해결(1분 루프):
- (1) 로컬 터미널에서 `cloudflared` 로그에 찍힌 **최신 URL** 확인
- (2) BotFather의 Web App/Mini App URL을 최신 URL로 업데이트
- (3) `cloudflared tunnel --url http://localhost:3000` 창을 **닫지 말고 유지**

검증(Windows PowerShell):

```powershell
# 프론트가 살아있는지
(Invoke-WebRequest -UseBasicParsing http://localhost:3000/health).StatusCode

# 터널 URL이 실제로 살아있는지(최신 URL로 바꿔서 실행)
(Invoke-WebRequest -UseBasicParsing https://YOUR-TRY.trycloudflare.com/health).StatusCode
```

> 참고: 에러 화면의 host가 `magnetic-...trycloudflare.com`인데, 네가 최신으로 받은 URL이 `informed-...trycloudflare.com`이면,
> 그건 “터널이 안 열린 게 아니라 **예전 URL을 열었기 때문에**” 1033이 뜨는 게 정상이다.

### 7.8 Mini App “인앱 디버그(eruda)” 켜는 법(수정 없이)
이 레포는 앱 부팅 시점에 아래 조건 중 하나면 eruda 콘솔을 로드한다:
- `?debug=1` (주의: **`#` 앞** 쿼리스트링만 인식)
- `localStorage.debug=1` (디버그가 한 번 켜지면 자동으로 저장됨)
- 텔레그램 `start_param == "debug"`

권장(텔레그램 정석, 가장 안정적): **딥링크로 start_param을 debug로 열기**

```
https://t.me/<BOT_USERNAME>/<WEBAPP_SHORT_NAME>?startapp=debug
```

예시:

```
https://t.me/jm114_bot/ccjm?startapp=debug
```

보조(브라우저/캡처용): 터널 URL에 `?debug=1`을 **`#` 앞**에 붙여서 접속

```
https://YOUR-TRY.trycloudflare.com/?debug=1
https://YOUR-TRY.trycloudflare.com/?debug=1#/login
```

보안 주의:
- **URL에 봇 토큰을 넣는 방식은 금지** (로그/히스토리/캡처로 유출 위험)

### 7.9 “로컬 도커 전체 재빌드”하면 테스트계정이 바뀌나?
핵심 결론:
- `docker compose up -d --build` = 이미지 재빌드/재기동, **DB 데이터 유지(볼륨 유지)**
- `docker compose down -v` = 컨테이너+볼륨 삭제, **DB 초기화(테스트계정/데이터 날아감)**

이 레포는 DB가 `mysql_data` 볼륨에 저장된다(`docker-compose.yml`의 `volumes: mysql_data`).

권장 명령(데이터 유지):

```powershell
# 전체 재빌드(데이터 유지)
docker compose up -d --build

# 프론트만 반영(더 빠름)
docker compose up -d --build frontend
```

---

## 8) 보안/운영 사고 방지(필수 룰)
- 터널링 테스트 중에는 **운영 봇 토큰 사용 금지**
- 가능하면 개발용 DB를 사용(운영 DB 절대 연결 금지)
- 테스트 끝나면 터널 즉시 종료(공개 URL 유지 금지)

---

## 9) 서버 배포 시 수정해야 하는 값(핵심만)

### 9.1 서버 런타임 `.env` (백엔드/텔레그램봇 컨테이너가 읽는 값)
`app/core/config.py` 기준 Telegram 관련 SoT 키:
- `TELEGRAM_BOT_TOKEN` (필수, 시크릿)
- `TELEGRAM_BOT_USERNAME` (권장, 딥링크/표시용)
- `TELEGRAM_WEBAPP_SHORT_NAME` (권장, 딥링크/표시용)
- `TELEGRAM_MINI_APP_URL` (운영 도메인. 버튼/안내 URL 생성에 사용)

운영 권장(Webhook 모드):
- `TELEGRAM_USE_WEBHOOK=true`
- `TELEGRAM_WEBHOOK_URL=https://<운영도메인>`
- (선택) `TELEGRAM_WEBHOOK_SECRET_TOKEN` 등

적용 방식:
- 서버에서 `.env` 수정 → `backend`/`telegram_bot` 컨테이너 재시작(또는 `docker compose up -d`)

### 9.2 프론트 `VITE_*` (빌드 타임: 프론트 이미지에 bake-in)
중요: 프론트는 `.env`를 런타임에 읽는 게 아니라, `docker compose build frontend` 시점에 `VITE_*`가 이미지에 박힌다.

서버에서 흔히 바꾸는 값:
- `VITE_API_URL`, `VITE_ADMIN_API_URL`
  - 권장: 공란(미설정)으로 두고 same-origin + nginx 프록시(`/api`, `/admin/api`) 사용
- `VITE_TELEGRAM_BOT_USERNAME`, `VITE_TELEGRAM_WEBAPP_SHORT_NAME`
  - 프론트의 텔레그램 딥링크 UI가 “어느 봇/short_name으로 이동할지” 결정
  - `TELEGRAM_BOT_USERNAME`/`TELEGRAM_WEBAPP_SHORT_NAME`와 불일치하면 “운영 봇으로 튐” 같은 혼선이 생길 수 있음

적용 방식:
- 서버에서 `.env` 수정 후 **반드시 프론트 재빌드**가 필요할 수 있음: `docker compose build frontend && docker compose up -d`

