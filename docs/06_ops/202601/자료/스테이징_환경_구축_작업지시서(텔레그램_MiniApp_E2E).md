# 스테이징 환경 구축 작업지시서 (Telegram Mini App E2E)

**작성일**: 2026-01-14
**목적**: Telegram Mini App의 “인앱 E2E(진입→initData 인증→핵심 기능 호출)”를 **항상 같은 URL에서 재현 가능**하게 만들어, 개발/QA/운영 대응 속도를 올린다.

> 본 문서는 [docs/06_ops/202601/텔레그램_MiniApp_로컬E2E_대책(터널링_vs_스테이징).md](docs/06_ops/202601/%ED%85%94%EB%A0%88%EA%B7%B8%EB%9E%A8_MiniApp_%EB%A1%9C%EC%BB%ACE2E_%EB%8C%80%EC%B1%85(%ED%84%B0%EB%84%90%EB%A7%81_vs_%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%A7%95).md)의 “스테이징(고정 도메인)”을 실제로 만드는 절차서다.

---

## 0) TL;DR (최소 완료 조건)
- 고정 도메인 1개(예: `stg-cc-jm.com`) + HTTPS 적용
- 스테이징 전용 Telegram Bot/토큰/username 분리(운영 토큰 사용 금지)
- DB 분리(강추: 별도 DB 또는 별도 서버; 최소: 별도 스키마)
- 스테이징에서 아래 3개가 되면 “스테이징 E2E 루프 완성”
  1) Mini App 진입
  2) `/api/telegram/auth` 인증 성공
  3) 로그인 후 핵심 API 1개(예: `/api/vault/status`) 성공

---

## 1) 설계 원칙(운영 사고 방지)
- **운영/스테이징 완전 분리**
  - Telegram Bot 토큰 분리
  - DB 분리
  - 도메인 분리
- 스테이징은 “테스트를 위한 운영 복제”가 아니라, **재현 가능한 검증 환경**이 목적
- 스테이징에는 운영 데이터(PII/결제/실사용자)를 넣지 않는다

---

## 2) 사전 결정사항(먼저 정해야 작업이 안 흔들림)

### 2.1 도메인
- 스테이징 도메인 후보(예)
  - `stg-cc-jm.com`
  - `staging-cc-jm.com`
  - `stg.xxxx.com`

### 2.2 인프라 형태(2안 중 1개 선택)
- 안1) **운영 서버와 동일 서버에 스테이징을 같이 올림**(권장 X)
  - 장점: 비용 최소
  - 단점: 사고 위험(포트/리버스프록시/시크릿 혼선), 자원 경합
- 안2) **별도 스테이징 서버**(권장)
  - 장점: 분리 명확, 사고 위험 낮음
  - 단점: 비용

### 2.3 DB 분리 방식(3안 중 1개 선택)
- A) 별도 DB 서버(최상)
- B) 같은 DB 서버지만 별도 DB(강추)
- C) 같은 DB지만 별도 스키마(최소)

---

## 3) 구축 체크리스트(단계별)

### Step 1) 스테이징 도메인 + HTTPS
- [ ] DNS A 레코드가 스테이징 서버 IP를 가리킴
- [ ] nginx에서 `server_name`에 스테이징 도메인 설정
- [ ] Let’s Encrypt 등으로 HTTPS 인증서 적용
- [ ] `https://stg-.../health` 또는 `https://stg-.../api/health`가 200 확인

### Step 2) 스테이징 Telegram Bot 준비(BotFather)
- [ ] 스테이징 전용 Bot 생성
- [ ] Bot username 확보(예: `xxx_stg_bot`)
- [ ] 스테이징 도메인을 Web App 허용 도메인으로 등록
- [ ] Mini App(웹앱) URL이 스테이징 도메인을 가리키는지 확인

> 실수 방지: 운영 토큰을 스테이징에 넣는 순간 사고가 난다. “운영/스테이징 토큰 분리”는 체크리스트로 강제.

### Step 3) 스테이징 앱 환경변수 세팅
- 스테이징에서 최소 필요한 항목(필수)
  - `TELEGRAM_BOT_TOKEN` (스테이징 토큰)
  - `TELEGRAM_BOT_USERNAME` (스테이징 봇)
  - `TELEGRAM_MINI_APP_URL` (예: `https://stg-cc-jm.com`)
  - `TELEGRAM_WEBHOOK_URL` (예: `https://stg-cc-jm.com`)
  - `ENVIRONMENT=staging` (권장)

- 참고: 운영 배포 워크플로우는 [ .github/workflows/deploy.yml ](.github/workflows/deploy.yml)에서 `.env`를 자동 생성한다.
  - 스테이징은 “운영 워크플로우 복제”보다는 **스테이징 전용 시크릿/전용 배포 방식**을 추천

### Step 4) 스테이징 DB 연결
- [ ] 스테이징 DB가 준비됨
- [ ] 스테이징 `DATABASE_URL`이 운영과 다름
- [ ] 마이그레이션 실행 후 `alembic current` 확인

### Step 5) Nginx 라우팅(단일 도메인)
- [ ] `/` 는 프론트
- [ ] `/api` 는 백엔드
- [ ] (있다면) `/admin` 및 `/admin/api` 라우팅도 의도대로 동작

---

## 4) 배포 운영안(권장)

### 4.1 최소 리스크 운영안
- 스테이징 배포는 운영 CI와 분리한다.
  - 운영: 현재 [ .github/workflows/deploy.yml ](.github/workflows/deploy.yml)
  - 스테이징: 별도 워크플로우(예: `deploy-stg.yml`) 또는 수동 배포 스크립트

> 이 문서에서는 “코드 변경 없이” 작업지시서만 제공한다. 워크플로우/스크립트 추가는 별도 작업으로 진행.

### 4.2 권장 스테이징 배포 루프(팀용)
- (1) main 또는 temp-merge2에서 특정 태그/브랜치로 스테이징 배포
- (2) 배포 후 아래 “E2E Smoke Checklist” 수행
- (3) 통과하면 운영 반영(또는 PR 머지)

---

## 5) E2E Smoke Checklist (스테이징에서 매번 확인)

### 5.1 진입/인증
- [ ] 텔레그램에서 스테이징 봇을 통해 Mini App 열기
- [ ] 첫 진입에서 `/api/telegram/auth`가 200으로 성공
- [ ] 재진입 시에도 실패하지 않음(세션/토큰 관련 확인)

### 5.2 핵심 기능 1개
- [ ] 인증 후 `/api/vault/status` 200

### 5.3 링크/딥링크(startapp) 1개(가능하면)
- [ ] `/api/telegram/link-token` 발급 → `startapp=link_xxx` 플로우로 링크 성공

---

## 6) 장애/실패 시 1분 트리아지(가장 자주 깨지는 지점)

### 6.1 Mini App이 안 열림
- [ ] BotFather Web App 도메인에 스테이징 도메인이 등록되어 있는지
- [ ] HTTPS 유효(인증서 만료/체인 문제)

### 6.2 `/api/telegram/auth` 400(인증 실패)
- [ ] 스테이징 서버의 `TELEGRAM_BOT_TOKEN`이 “스테이징 봇 토큰”인지
- [ ] 프론트가 실제 텔레그램 인앱에서 열렸는지(브라우저 직접 접속이면 initData 불일치 가능)

### 6.3 `/api/*`가 404 또는 HTML로 떨어짐
- [ ] nginx 라우팅(`/api` upstream) 깨짐
- [ ] 프론트 빌드/경로 설정 문제

---

## 7) 보안 체크리스트(권장)
- [ ] 스테이징은 기본 인증(Basic Auth) 또는 IP allowlist 적용(특히 `/admin`)
- [ ] 스테이징 로그/DB에 운영 사용자 정보가 들어오지 않게 차단
- [ ] 스테이징 토큰/시크릿은 GitHub Secrets(또는 서버 시크릿)로만 관리

---

## 8) 다음 작업(요청 시 진행 가능)
- 스테이징 전용 배포 워크플로우(`deploy-stg.yml`) 설계/추가
- 스테이징에서 “운영과 혼선 방지”를 위한 `ENVIRONMENT=staging` 분기(로그/표시/보호장치)
- 로컬에서도 E2E를 돌리고 싶으면: 터널링(개인용) 절차를 팀 룰로 고정
