# 2026-01-16 Dice Battle UI & Vault Logic Refactor

## 1. 개요
- 주사위 게임(Dice) UI를 단순 목록형에서 "전투(Battle Mode)" 컨셉으로 전면 개편.
- 게임 리워드와 Vault 적립 간의 불일치(암시적 +200/-50 적립)를 제거하여 설정(Config) 기반의 명확한 경제 로직 수립.
- 로컬 Docker 환경에서의 Nginx SSL 인증서 문제 해결 및 전체 재빌드.

## 2. 주요 변경 사항

### A. Frontend: Dice Game UI (Battle Mode)
- **파일**: `src/components/game/DiceView.tsx`, `src/pages/DicePage.tsx`
- **변경 내용**:
  - **전투 연출 추가**: 유저 vs 딜러(보스) 컨셉 적용.
    - HP Bar: 주사위 결과에 따라 체력바 애니메이션 적용.
    - Camera Shake: 승리/패배 시 화면 흔들림 효과(Framer Motion).
    - Projectile: 승패에 따른 타격 이펙트 추가.
  - **한글화(Localization)**: 영문 텍스트 전체 한글화 완료.
    - MY SQUAD -> 내 스쿼드
    - ENEMY BOSS -> 적 보스
    - SCORE -> 전투력 / 위협 수준
    - WIN/LOSE/DRAW -> 승리/패배/무승부
  - **결과 연출**: 무승부(DRAW) 시에도 전투 상태바 및 애니메이션이 정상 동작하도록 수정.

### B. Backend: Vault Earn Logic Refactor
- **파일**: `app/services/vault_service.py`
- **변경 내용**:
  - `record_game_play_earn_event` 메서드 내 하드코딩된 Fallback 로직(`WIN=+200`, `LOSE=-50`, `기타=+200`) 제거.
  - **새로운 규칙**:
    - `payout` 정보의 `reward_type`이 `POINT` 또는 `CC_POINT`인 경우에만 `reward_amount`만큼 Vault에 적립.
    - 그 외(Ticket, Item, 꽝 등)의 경우 Vault 적립금은 `0`.
    - Dice "EVENT" 모드는 기존 DB Config(`game_earn_config`)를 따름.
    - Dice "NORMAL" 모드 및 기타 게임(Roulette/Lottery)은 철저히 개별 게임 결과의 Payout 데이터에 의존.

### C. Infrastructure: Local Docker Environment
- **파일**: `docker-compose.local.yml`
- **변경 내용**:
  - 로컬 Windows 환경에서 Nginx SSL 인증서 마운트 문제로 인한 무한 재시작 해결.
  - 로컬 `nginx` 컨테이너 설정을 `nginx/nginx.local.conf` (SSL Off, Port 8080) 사용하도록 강제 override.
  - 전체 컨테이너 재빌드 및 헬스 체크 완료.

## 3. 검증 결과 (Verification)
- **Frontend Build**: `npm run build` 성공 (Type Check Pass).
- **Logic Script**: `verify_game_rewards.py` 실행 결과:
  - Dice WIN -> Config 설정값(500) 정상 적립.
  - Roulette Ticket 당첨 -> Vault 적립 0 (기존 +200 이슈 해결).
  - Lottery Point 당첨 -> 정상 적립.
- **Docker**: `up -d --build` 후 모든 컨테이너(Backend, Frontend, Nginx, DB, Redis) `Healthy`/`Started` 상태 확인.

## 4. 향후 계획 (Next Steps)
- 운영 서버 배포 시 `alembic upgrade head` 및 `docker compose up -d --build` 수행 필요.
- Dice Config(`DiceConfig` 테이블)가 비어있을 경우 보상이 0이 될 수 있으므로, 어드민에서 Config 값 확인 권장.
