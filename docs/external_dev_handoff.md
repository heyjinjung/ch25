# External Dev Handoff Guide

This repo can be developed on another local machine with Docker. Follow these steps to stand up the same stack and avoid known pitfalls.

## Stack at a Glance
- Frontend: Vite + React + TypeScript (`src/`), served by nginx container on port 3000.
- Backend: FastAPI + Uvicorn (`app/`), on port 8000.
- DB: MySQL 8 (port 3307 on host), Redis 7.
- Auth: `/api/auth/token` issues JWT by `external_id` (password optional). Admin login form uses `admin/1234`.
- Season pass/ranking: relies on tables `season_pass_*` and `external_ranking_*`; daily/weekly stamp logic is in `app/services/admin_external_ranking_service.py` and `app/services/season_pass_service.py`.

## Prerequisites
- Docker/Docker Compose (v2). Node is not required on host (builds happen in container), but if you run frontend locally, use Node 18+ (warns about React Router 7 needing Node 20; 18 works for now).
- Git, PowerShell (Windows) or bash (macOS/Linux).

## Environment Files
- Copy `.env.example` to `.env` if missing. Important values (defaults):
  - `ENV=local`
  - DB inside compose: `MYSQL_ROOT_PASSWORD=root`, `MYSQL_USER=xmasuser`, `MYSQL_PASSWORD=xmaspass`, `MYSQL_DATABASE=xmas_event_dev`
  - CORS is permissive in local; frontend base URL is `http://localhost:3000`, backend `http://localhost:8000`.
- For frontend-only local run, Vite uses `VITE_API_BASE_URL` or falls back to `http://localhost:8000/api`.

## Run / Rebuild (containers)
PowerShell:
```
docker compose build --no-cache
docker compose up -d
```
Bash:
```
docker compose build --no-cache && docker compose up -d
```
Notes:
- `docker-compose.yml` has an obsolete `version` key warning (harmless).
- nginx container expects SSL certs and restarts in loop; ignore and hit frontend directly on http://localhost:3000.

## Database Setup
Shell into DB or run inline SQL via `docker compose exec db sh -c "mysql ..."` (PowerShell redirection `<` does not work; use `docker compose cp`).

1) If schema is missing stamp/daily columns, apply:
```
docker compose exec db sh -c "mysql -uroot -proot xmas_event_dev -e \
  \"ALTER TABLE external_ranking_data ADD COLUMN IF NOT EXISTS daily_base_deposit INT NOT NULL DEFAULT 0; \
  ALTER TABLE external_ranking_data ADD COLUMN IF NOT EXISTS daily_base_play INT NOT NULL DEFAULT 0; \
  ALTER TABLE external_ranking_data ADD COLUMN IF NOT EXISTS last_daily_reset DATE NULL; \
  ALTER TABLE season_pass_stamp_log ADD COLUMN IF NOT EXISTS period_key VARCHAR(40) NULL; \
  ALTER TABLE season_pass_stamp_log DROP INDEX IF EXISTS uq_stamp_user_season_date; \
  ALTER TABLE season_pass_stamp_log ADD UNIQUE INDEX uq_stamp_period (user_id, season_id, source_feature_type, period_key);\""
```

2) Seed season pass level curve (idempotent):
```
docker compose exec db sh -c "cat <<'SQL' | mysql -uroot -proot xmas_event_dev
DELETE FROM season_pass_level;
INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) VALUES
  (1,1,0,'COIN',100,0),
  (1,2,20,'COIN',200,0),
  (1,3,50,'COIN',300,0),
  (1,4,80,'COIN',500,0),
  (1,5,120,'COIN',800,0);
SQL"
```

3) Test users (idempotent):
```
docker compose exec db sh -c "cat <<'SQL' | mysql -uroot -proot xmas_event_dev
INSERT INTO user (id, external_id, status, created_at, updated_at, nickname, level) VALUES
 (1,'user1','ACTIVE',NOW(),NOW(),'user1',1)
ON DUPLICATE KEY UPDATE status='ACTIVE';
INSERT INTO user (id, external_id, status, created_at, updated_at, nickname, level) VALUES
 (999,'test-qa-999','ACTIVE',NOW(),NOW(),'test-qa-999',1)
ON DUPLICATE KEY UPDATE status='ACTIVE';
SQL"
```

4) If you prefer full seed script, copy then run:
```
docker compose cp scripts/seed_ranking_seasonpass.sql db:/tmp/seed_ranking_seasonpass.sql
docker compose exec db sh -c "mysql -uroot -proot xmas_event_dev < /tmp/seed_ranking_seasonpass.sql"
```

## Quick API Smoke Tests (PowerShell)
Issue token:
```
$body = @{ external_id='user1' } | ConvertTo-Json
$resp = Invoke-WebRequest -Uri 'http://localhost:8000/api/auth/token' -Method Post -Body $body -Headers @{ 'Content-Type'='application/json' }
$token = ($resp.Content | ConvertFrom-Json).access_token
```
Season pass status:
```
Invoke-WebRequest -Uri 'http://localhost:8000/api/season-pass/status' -Headers @{ Authorization = "Bearer $token" }
```

## Frontend/UX Notes
- Reward toasts are shown on dice/roulette/lottery when `reward_value > 0`.
- Roulette wheel UI is `src/components/game/RouletteWheel.tsx` (SVG aspect-square). If you see a distorted wheel, hard-refresh browser cache.
- Login page currently accepts only `external_id`; password optional. Admin login form uses `admin/1234` (see `src/admin/pages/AdminLoginPage.tsx`).
- Ranking cards and season-pass cards rely on:
  - `/api/ranking/today?top=10` (external ranking only)
  - `/api/season-pass/status`
  - `/api/season-pass/internal-wins` for internal win progress

## Backend Behavior Highlights
- CORS: in `ENV=local`, allow_origins=["*"] (app/main.py).
- Season pass stamps:
  - Daily/weekly period keys are used to avoid duplicate awards while allowing multi-stamp increments.
  - External ranking upsert awards stamps for: daily deposit delta every 100,000, first daily play, weekly top10.
  - Internal win stamp placeholder counts total wins across dice/roulette/lottery logs.
- Auth: `/api/auth/token` will auto-create a user if `external_id` is provided and not found.

## Known Issues / Workarounds
- nginx container restarts because SSL cert files are absent; access frontend via http://localhost:3000 (frontend container) during development.
- React Router 7 warns about Node < 20; container builds with Node 18 and works but emits EBADENGINE warnings.
- PowerShell redirection `<` does not work with `docker compose exec`; use `docker compose cp` + `mysql < file` inside the container, or heredoc as shown above.

## Where to Change What
- Season pass logic: `app/services/season_pass_service.py`
- External ranking + stamp hooks: `app/services/admin_external_ranking_service.py`
- Roulette wheel UI: `src/components/game/RouletteWheel.tsx`
- Season pass UI: `src/pages/SeasonPassPage.tsx`
- Auth API: `app/api/routes/auth.py`
- HTTP clients: `src/api/httpClient.ts`, `src/api/adminHttpClient.ts`

Keep this guide with the repo when handing off to another AI/developer so they can rebuild the environment quickly and know the current conventions.
