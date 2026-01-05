# 2025-12-28 Deployment Debug Log

**Objective**: Deploy 'Season Seed' and 'Inbox' features to production (AWS/Vultr Setup).
**Outcome**: All issues resolved. Backend is stable, and new DB schema columns are applied.

---

## 1. Backend Build Failure (Import Error)
*   **Symptom**: `502 Bad Gateway`. Container logs showed `ImportError`.
*   **Error**:
    ```text
    ImportError: cannot import name 'get_current_user' from 'app.api.deps'
    ```
*   **Cause**: The `crm_inbox.py` module relied on `get_current_user`, but it was missing from `app/api/deps.py`.
*   **Fix**: Implemented `get_current_user` in `app/api/deps.py` and rebuilt the container.

## 2. User Model Schema Error (Name Error)
*   **Symptom**: `502 Bad Gateway` persists after fix #1.
*   **Error**:
    ```text
    NameError: name 'Boolean' is not defined
    File "/app/app/models/user.py", line 46, in User
        has_completed_onboarding = Column(Boolean, default=False)
    ```
*   **Cause**: `Boolean` type was used in `models/user.py` but not imported from `sqlalchemy`.
*   **Fix**: Added `Boolean` to the import statement in `models/user.py`.

## 3. Database Schema Mismatch (500 Internal Server Error)
*   **Symptom**: Login failed with `500` error.
*   **Error**:
    ```text
    sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (1054, "Unknown column 'user.last_free_ticket_claimed_at' in 'field list'")
    ```
    *   Other missing columns identified: `next_season_seed`, `has_completed_onboarding`.
*   **Cause**:
    *   Alembic migration file for `next_season_seed` was generated in the container but **not committed** to git, so the server couldn't pull it.
    *   Previous migrations for `last_free_ticket_claimed_at` and `has_completed_onboarding` were also missing or not applied on the production DB (data inconsistency).
*   **Fix**:
    1.  **Regenerated & Secured Migration**: Recreated the missing migration file (`20251228_0048_cd4588841c24...py`) locally.
    2.  **Consolidated Fix**: Manually edited this migration file to include **ALL** missing columns (`next_season_seed`, `last_free_ticket_claimed_at`, `has_completed_onboarding`) to ensure a single `upgrade head` fixes everything.
    3.  **Deployment**: Pushed to git, pulled on server, rebuilt backend, and ran `alembic upgrade head`.
    4.  **Verification**: Confirmed backend is connecting to `MYSQL_DATABASE=xmas_event` (not `xmas_db`) and columns exist.

## 4. Final Verification
*   **Backend**: Running healthy.
*   **Database**: All columns (`next_season_seed`, etc.) present in `xmas_event.user` table.
*   **Frontend**: Login successful, Inbox button visible.

---
**Action Item**: Always ensure `alembic` migration files generated inside containers are copied out, committed, and pushed before deployment.
