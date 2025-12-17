# XMAS 1Week Event System
FastAPI 백엔드와 Vite 기반 React 프런트로 구성된 원위크 이벤트/레벨/게임 토큰 서비스입니다. 오늘의 Feature 게이트, 룰렛·주사위·복권, 레벨, 외부 랭킹, 게임 토큰 지갑/원장(ROULETTE_COIN/DICE_TOKEN/LOTTERY_TICKET) 기능을 제공합니다.

## 빠른 시작 (로컬)
1) `.env.local`을 `.env`로 복사 후 DB·`TEST_MODE` 확인 → MySQL 8 실행 → `alembic upgrade head`로 스키마 적용  
2) 백엔드: `python -m venv venv && .\venv\Scripts\Activate.ps1 && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000`  
3) 프런트: `npm install && npm run dev -- --host --port 5173` (필요 시 `.env.development`에서 `VITE_API_URL` 수정)  
4) 접속: 사용자 http://localhost:5173 , 관리자 http://localhost:5173/admin (ID `admin` / PW `2wP?+!Etm8#Qv4Mn`)  
5) 게임 토큰 지급/로그 화면: `/admin/game-tokens`, `/admin/game-token-logs`

## 문서 바로가기
- 온보딩/로컬 개발: `docs/ONBOARDING.md`
- 시스템/아키텍처/API/DB 상세: `docs/01_overview`, `docs/02_architecture`, `docs/03_api`, `docs/04_db`, `docs/05_modules`
- 외부 핸드오프 & 배포: `docs/external_dev_handoff.md`, `docs/DEPLOYMENT.md`, `docs/DEPLOYMENT_QUICKSTART.md`
- 프런트 가이드: `docs/frontend/*.md`

## 최근 주요 변경 (2025-12)
- 게임 토큰 지갑/원장 테이블 및 관리자 지급/차감/원장 API(`app/api/admin/routes/admin_game_tokens.py`) + UI(`src/admin/pages/GameTokenGrantPage.tsx`, `GameTokenLogsPage.tsx`), 토큰 타입 CC_COIN 추가
- 외부 랭킹 수동 입력/보상 테이블(`external_ranking_*`) 및 관리자 화면
- 팀 배틀(Team Battle) API/화면, 레벨/XP 코어 추가
- 유저 `nickname/password_hash/level` 컬럼 추가(관리자 CRUD 대비)

자세한 실행·시드·테스트 흐름은 `docs/ONBOARDING.md`를 참고하세요.
