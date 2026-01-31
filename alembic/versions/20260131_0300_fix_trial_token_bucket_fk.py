"""Fix multiple table FK to reference v2_user instead of user.

Revision ID: 20260131_0300_fix_trial_token_bucket_fk
Revises: 20260130_2500_fix_user_activity_fk
Create Date: 2026-01-31 03:00:00

Issue 19 확장 - 다중 테이블 FK 에러
- 에러: IntegrityError (1452) 다수 테이블이 레거시 user 테이블 참조
- 원인: V2 시스템에서 v2_user.id로 INSERT 시도하지만 FK가 레거시 user 테이블 참조
- 해결: 모든 관련 테이블의 FK를 v2_user로 변경

대상 테이블:
- trial_token_bucket
- user_level_progress
- user_xp_event_log
- user_streak
- user_segment
- user_retention_state
- user_level_reward_log
- user_cash_ledger
- vault_ledger
- vault_status
- vault_earn_event
- vault_withdrawal_request
"""
from alembic import op
from sqlalchemy import text


revision = "20260131_0300_fix_trial_token_bucket_fk"
down_revision = "20260130_2500_fix_user_activity_fk"
branch_labels = None
depends_on = None


def _safe_drop_fk(conn, table_name: str, constraint_name: str) -> None:
    """Drop FK constraint if it exists (MySQL safe)."""
    result = conn.execute(text(f"""
        SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND CONSTRAINT_NAME = '{constraint_name}'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    """)).scalar()
    
    if result > 0:
        conn.execute(text(f"ALTER TABLE {table_name} DROP FOREIGN KEY {constraint_name}"))
        print(f"[MIGRATION] Dropped FK {constraint_name} from {table_name}")


def _delete_orphans(conn, table_name: str) -> int:
    """Delete rows where user_id doesn't exist in v2_user."""
    result = conn.execute(text(f"""
        DELETE FROM {table_name}
        WHERE user_id NOT IN (SELECT id FROM v2_user)
    """))
    return result.rowcount


def _safe_create_fk(conn, table_name: str, constraint_name: str, ref_table: str) -> None:
    """Create FK constraint if it doesn't exist."""
    result = conn.execute(text(f"""
        SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '{table_name}'
        AND CONSTRAINT_NAME = '{constraint_name}'
    """)).scalar()
    
    if result == 0:
        conn.execute(text(f"""
            ALTER TABLE {table_name}
            ADD CONSTRAINT {constraint_name}
            FOREIGN KEY (user_id) REFERENCES {ref_table}(id) ON DELETE CASCADE
        """))
        print(f"[MIGRATION] Created FK {constraint_name} on {table_name} -> {ref_table}")


def upgrade() -> None:
    """Fix multiple table FK to reference v2_user."""
    conn = op.get_bind()
    
    # 테이블 목록: (table_name, old_fk_name, new_fk_name)
    # 순서 중요: child 테이블 먼저 처리
    tables = [
        # Phase 1: 이미 처리된 테이블
        ("trial_token_bucket", "trial_token_bucket_ibfk_1", "trial_token_bucket_fk_v2_user"),
        ("user_level_progress", "user_level_progress_ibfk_1", "user_level_progress_fk_v2_user"),
        ("user_xp_event_log", "user_xp_event_log_ibfk_1", "user_xp_event_log_fk_v2_user"),
        ("user_streak", "user_streak_ibfk_1", "user_streak_fk_v2_user"),
        ("user_segment", "user_segment_ibfk_1", "user_segment_fk_v2_user"),
        ("user_retention_state", "user_retention_state_ibfk_1", "user_retention_state_fk_v2_user"),
        ("user_level_reward_log", "user_level_reward_log_ibfk_1", "user_level_reward_log_fk_v2_user"),
        ("user_cash_ledger", "user_cash_ledger_ibfk_1", "user_cash_ledger_fk_v2_user"),
        ("vault_ledger", "vault_ledger_ibfk_1", "vault_ledger_fk_v2_user"),
        ("vault_status", "vault_status_ibfk_2", "vault_status_fk_v2_user"),
        ("vault_earn_event", "vault_earn_event_ibfk_1", "vault_earn_event_fk_v2_user"),
        ("vault_withdrawal_request", "vault_withdrawal_request_ibfk_1", "vault_withdrawal_request_fk_v2_user"),
        ("v2_retention_roi_log", "v2_retention_roi_log_ibfk_1", "v2_retention_roi_log_fk_v2_user"),
        ("v2_user_retention_state", "v2_user_retention_state_ibfk_1", "v2_user_retention_state_fk_v2_user"),
        ("retention_roi_log", "retention_roi_log_ibfk_1", "retention_roi_log_fk_v2_user"),
        
        # Phase 2: 추가 테이블 (2026-01-31 확장)
        ("user_event_log", "user_event_log_ibfk_1", "user_event_log_fk_v2_user"),
        ("dice_log", "dice_log_ibfk_2", "dice_log_fk_v2_user"),
        ("roulette_log", "roulette_log_ibfk_3", "roulette_log_fk_v2_user"),
        ("lottery_log", "lottery_log_ibfk_3", "lottery_log_fk_v2_user"),
        ("admin_message_inbox", "admin_message_inbox_ibfk_2", "admin_message_inbox_fk_v2_user"),
        ("admin_user_profile", "admin_user_profile_ibfk_1", "admin_user_profile_fk_v2_user"),
        ("event_participation_log", "event_participation_log_ibfk_2", "event_participation_log_fk_v2_user"),
        ("ops_target_member", "ops_target_member_ibfk_2", "ops_target_member_fk_v2_user"),
        ("ranking_daily", "ranking_daily_ibfk_1", "ranking_daily_fk_v2_user"),
        ("season_pass_progress", "season_pass_progress_ibfk_2", "season_pass_progress_fk_v2_user"),
        ("season_pass_reward_log", "season_pass_reward_log_ibfk_3", "season_pass_reward_log_fk_v2_user"),
        ("season_pass_stamp_log", "season_pass_stamp_log_ibfk_3", "season_pass_stamp_log_fk_v2_user"),
        ("survey", "survey_ibfk_1", "survey_fk_v2_user"),
        ("survey_response", "survey_response_ibfk_4", "survey_response_fk_v2_user"),
        ("team_event_log", "team_event_log_ibfk_3", "team_event_log_fk_v2_user"),
        ("team_member", "team_member_ibfk_2", "team_member_fk_v2_user"),
        ("telegram_link_code", "telegram_link_code_ibfk_1", "telegram_link_code_fk_v2_user"),
        ("user_idempotency_key", "user_idempotency_key_ibfk_1", "user_idempotency_key_fk_v2_user"),
        ("user_identity_history", "user_identity_history_ibfk_1", "user_identity_history_fk_v2_user"),
    ]
    
    for table_name, old_fk, new_fk in tables:
        try:
            # 테이블 존재 여부 확인
            exists = conn.execute(text(f"""
                SELECT COUNT(*) FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{table_name}'
            """)).scalar()
            
            if exists == 0:
                print(f"[MIGRATION] Table {table_name} does not exist, skipping")
                continue
            
            # 1. Drop old FK (if exists)
            _safe_drop_fk(conn, table_name, old_fk)
            _safe_drop_fk(conn, table_name, new_fk)  # in case of partial migration
            
            # 2. Delete orphan data (user_id not in v2_user)
            deleted = _delete_orphans(conn, table_name)
            print(f"[MIGRATION] {table_name}: deleted {deleted} orphan rows")
            
            # 3. Create new FK to v2_user
            _safe_create_fk(conn, table_name, new_fk, "v2_user")
            
        except Exception as e:
            print(f"[MIGRATION WARNING] Error processing {table_name}: {e}")
            # 계속 진행 (다른 테이블 처리)


def downgrade() -> None:
    """Revert FK (drop new FK). Cannot restore deleted orphan data."""
    conn = op.get_bind()
    
    tables = [
        "trial_token_bucket_fk_v2_user",
        "user_level_progress_fk_v2_user",
        "user_xp_event_log_fk_v2_user",
        "user_streak_fk_v2_user",
        "user_segment_fk_v2_user",
        "user_retention_state_fk_v2_user",
        "user_level_reward_log_fk_v2_user",
        "user_cash_ledger_fk_v2_user",
        "vault_ledger_fk_v2_user",
        "vault_status_fk_v2_user",
        "vault_earn_event_fk_v2_user",
        "vault_withdrawal_request_fk_v2_user",
        "v2_retention_roi_log_fk_v2_user",
        "v2_user_retention_state_fk_v2_user",
        "retention_roi_log_fk_v2_user",
    ]
    
    for fk_name in tables:
        table_name = fk_name.replace("_fk_v2_user", "")
        try:
            _safe_drop_fk(conn, table_name, fk_name)
        except Exception as e:
            print(f"[MIGRATION WARNING] Error dropping {fk_name}: {e}")
