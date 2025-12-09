# 온보딩 가이드 (2025-12 업데이트)

새로 합류한 개발자가 바로 환경을 올리고 최근 변경사항을 이해할 수 있도록 핵심만 모았습니다. PowerShell 기준이며 macOS/Linux는 동일한 명령을 쉘에 맞게 치환하면 됩니다.

## 프로젝트 한눈에 보기
- Backend: FastAPI + SQLAlchemy + Alembic, MySQL 8(옵션: Redis 7), JWT 발급 `/api/auth/token`(external_id로 자동 생성 가능), `ENV=local` 시 CORS `*`.
- Frontend: React 18 + TypeScript 5 + Vite 6 + Tailwind, React Query 5, Axios. 관리자 UI는 `/admin`(임시 로그인 `admin/1234`).
- 주요 도메인: 오늘의 Feature 게이트(`/api/today-feature`), 룰렛/주사위/복권, 시즌패스(XP 스탬프), 외부 랭킹 수동 입력/보상, **게임 토큰 지갑/원장**(ROULETTE_COIN, DICE_TOKEN, LOTTERY_TICKET) 관리자 지급·차감·로그.
- 시즌패스 현재 스펙: base_xp_per_stamp=20, 레벨 7단계(곡선/보상은 `season_pass_level`; 기본 시드 `scripts/seed_ranking_seasonpass.sql`). 게임별 XP 계산은 서비스 로직/DB 설정값에 따릅니다.

## 선행 설치물
- Python 3.11+, Node 18+, npm 10+, MySQL 8.x (3306). 선택: Redis 7, Docker/Compose v2.
- Git, PowerShell(Windows) 또는 bash/zsh(macOS/Linux).

## 환경 변수 정리
### Backend `.env` (없으면 `.env.local` 복사)
- `DATABASE_URL`: `mysql+pymysql://root:root@localhost:3306/xmas_event_dev` (로컬 MySQL 기준)
- `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
- `ENV=local`, `CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]`
- `TEST_MODE=true` → today-feature 무시 + 게임 토큰 부족 시 자동 보충(QA 전용). **현장 실행 시 반드시 false.**
- `XP_FROM_GAME_REWARD=true` → 게임 보상 포인트를 시즌패스 XP로 반영
- `LOG_LEVEL=DEBUG`, `TIMEZONE=Asia/Seoul`

### Frontend `.env.development` (Vite 자동 로드)
- `VITE_API_URL=http://localhost:8000/api`
- `VITE_ADMIN_API_URL=http://localhost:8000/admin/api`
- `VITE_GATE_TODAY_FEATURE=false`(게이트 해제), `VITE_ENABLE_DEMO_FALLBACK=true`(API 실패 시 데모 데이터), `VITE_ENABLE_DEBUG=true`
- 관리자 로그인: ID `admin` / PW `1234` (로컬 스토리지 토큰)

### 환경 변수 한눈에
- 현장/실서버: Backend `TEST_MODE=false`, `ENV=production`, 실 DB URL. Frontend `VITE_GATE_TODAY_FEATURE=true`, `VITE_ENABLE_DEMO_FALLBACK=false`, `VITE_ENABLE_DEBUG=false`, `VITE_ENV=production`, API URL을 실 서버로 지정.
- QA/개발: Backend `TEST_MODE=true`(게임 토큰 부족 자동 보충 + 게이트 무시), Frontend `VITE_GATE_TODAY_FEATURE=false`, `VITE_ENABLE_DEMO_FALLBACK=true`.
- 테스트 모드 출처: `app/core/config.py`의 `test_mode`; 게임 토큰 소모 시 QA 편의로 자동 보충(`GameWalletService.require_and_consume_token`). 프런트 게이트는 `VITE_GATE_TODAY_FEATURE` / `VITE_ENABLE_DEMO_FALLBACK`로 별도 제어.

## 로컬 실행 (네이티브)
1) DB 준비(택1)
- Docker: `docker run --name xmas-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=xmas_event_dev -e MYSQL_USER=xmasuser -e MYSQL_PASSWORD=xmaspass -p 3306:3306 -d mysql:8.0`
- 직접 설치 시 DB 생성: `CREATE DATABASE xmas_event_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

2) Backend
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.local .env   # 필요한 값 수정
alembic upgrade head    # 최신 스키마 적용
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
확인: http://localhost:8000/ , Swagger http://localhost:8000/docs

3) Frontend
```powershell
npm install
# VITE_API_URL 등 필요 시 .env.development 수정
npm run dev -- --host --port 5173
```
확인: 사용자 http://localhost:5173 , 관리자 http://localhost:5173/admin (admin/1234)
- 게임 토큰 지급: `/admin/game-tokens`
- 게임 토큰 원장/플레이 로그: `/admin/game-token-logs`

4) 빠른 스모크
```powershell
curl http://localhost:8000/api/today-feature
curl -X POST http://localhost:8000/api/auth/token `
  -H "Content-Type: application/json" `
  -d "{\"external_id\":\"test-qa-999\"}"
```

## Docker Compose 실행
```powershell
docker compose up -d --build
docker compose exec backend alembic upgrade head  # 스키마 적용(자동 아님)
```
- 포트: backend 8000, frontend 3000(프록시 없이), nginx 80/443, DB 3307.
- 프런트 빌드 인자: `VITE_API_URL`, `VITE_ADMIN_API_URL`(docker-compose.yml args 참고).

## 시드 / 테스트 데이터
- 시즌패스 레벨 및 외부 랭킹 테이블 보정:  
  ```
  docker compose cp scripts/seed_ranking_seasonpass.sql db:/tmp/seed_ranking_seasonpass.sql
  docker compose exec db sh -c "mysql -uroot -proot xmas_event_dev < /tmp/seed_ranking_seasonpass.sql"  # root PW는 .env에 맞게 수정
  ```
- 사용자 생성은 `/api/auth/token` 호출 시 external_id로 자동 생성 가능.
- 게임 토큰/원장: 테이블 `user_game_wallet`, `user_game_wallet_ledger`; 관리자 화면 `/admin/game-tokens`(지급/차감), `/admin/game-token-logs`(지갑/플레이로그/원장 조회). API는 `app/api/admin/routes/admin_game_tokens.py` 참고.
- 시즌패스: base_xp_per_stamp=20, 7레벨 곡선(`season_pass_level`); 기본 시드는 `scripts/seed_ranking_seasonpass.sql`. 현장 수치 변경 시 테이블만 업데이트하면 됩니다.

## 자주 쓰는 명령
- 백엔드 테스트: `pytest -q`
- 프런트 타입체크: `npx tsc --noEmit`
- 프런트 테스트: `npm run test`
- 로그 테일(Windows): `Get-Content logs/app.log -Wait`

## 참고 파일 위치
- Backend 진입점/핵심: `app/main.py`, `app/api/routes/*`, `app/services/game_wallet_service.py`, `app/services/season_pass_service.py`, `app/services/admin_external_ranking_service.py`
- Frontend 핵심: `src/router/AdminRoutes.tsx`, `src/admin/pages/GameTokenGrantPage.tsx`, `src/admin/pages/GameTokenLogsPage.tsx`, `src/api/httpClient.ts`, `src/admin/api/adminGameTokenApi.ts`
- DB 마이그레이션: `alembic/versions/20251207_0006_add_user_game_wallet.py`(지갑), `20251208_0007_add_external_ranking_tables.py`, `20251208_0008_add_user_credentials_and_level.py`

필요한 내용이 더 있다면 README와 `docs/` 하위 세부 문서를 참고하세요. 
