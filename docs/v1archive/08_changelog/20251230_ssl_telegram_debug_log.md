# 2025-12-30 Deployment & Integration Debug Log

**Objective**: Resolve `cc-jm.com` accessibility, fix 500/502 errors, and stabilize Telegram integration.
**Outcome**: All systems operational. HTTPS active, Telegram bot responsive, and database schema synchronized.

---

## 1. SSL/HTTPS Accessibility (`ERR_CONNECTION_CLOSED`)
*   **Symptom**: Site inaccessible via HTTPS; browser closed connection immediately.
*   **Cause**: Nginx configuration lacked port 443 server blocks and SSL certificate paths.
*   **Fix**:
    *   Updated `nginx/nginx.conf` with HTTP -> HTTPS redirection.
    *   Added SSL blocks pointing to `/etc/letsencrypt/live/cc-jm.com/`.
    *   Unified certificate paths (resolved duplicate `-0001` directories).
*   **Result**: Secure connection established via Let's Encrypt.

## 2. Infrastructure & Environment (`UTF-16LE` Error)
*   **Symptom**: Docker services failed to start with "unexpected character " error.
*   **Cause**: `.env` file was saved in UTF-16LE encoding (Windows default) which Linux Docker parser cannot read.
*   **Fix**: Converted `.env` to UTF-8 using `python3` decode/encode script and `iconv` fallback.
*   **Result**: All containers started successfully.

## 3. Database Schema Mismatch (500 Error)
*   **Symptom**: `sqlalchemy.exc.OperationalError: (1054, "Unknown column 'user.telegram_id' in 'field list'")`.
*   **Cause**: Telegram integration columns were not applied to the production database.
*   **Fix**: Executed `docker compose exec backend alembic upgrade head`.
*   **Result**: User model synchronized with the database.

## 4. Telegram Integration & API Routing (404/502 Errors)
*   **Symptom**:
    *   Bot account linking returned 404 Not Found.
    *   Frontend logs showed `TypeError: s.filter is not a function`.
*   **Cause**:
    *   Frontend called `/api/v1/telegram/...` but backend router had no `/v1` prefix.
    *   `userMessageApi.ts` missed the `/api` prefix, causing Nginx to return a default HTML 404 instead of JSON.
*   **Fix**:
    *   Updated `telegramApi.ts` to remove `/v1`.
    *   Updated `userMessageApi.ts` to include `/api` prefix.
    *   Updated backend `telegram.py` to include `prefix="/api/telegram"`.
*   **Result**: Unified API routing across all services.

## 5. Token & Connectivity
*   **Symptom**: Telegram bot unresponsive to `/start`.
*   **Cause**: Incorrect bot token and missing `TELEGRAM_MINI_APP_URL` in `.env`.
*   **Fix**:
    *   Applied new token: `8207195931:AAFONJXLPJ8YLCBnDZ0o2_p9_RSQeNvMweM`.
    *   Set `TELEGRAM_MINI_APP_URL=https://cc-jm.com`.
    *   Restarted `telegram_bot` service.
*   **Result**: Bot successfully polling and responding.

---
**Status**: All fixes deployed and verified on `149.28.135.147`.
