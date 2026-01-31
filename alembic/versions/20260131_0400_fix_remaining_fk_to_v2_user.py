"""Phase 2: Fix remaining FK constraints from user to v2_user

Revision ID: 20260131_0400_fix_remaining_fk_to_v2_user
Revises: 20260131_0300_fix_trial_token_bucket_fk
Create Date: 2026-01-31 04:00:00

"""
from alembic import op
from sqlalchemy import text

# revision identifiers
revision = '20260131_0400_fix_remaining_fk_to_v2_user'
down_revision = '20260131_0300_fix_trial_token_bucket_fk'
branch_labels = None
depends_on = None


def upgrade():
    """Phase 2: 추가 19개 테이블의 FK를 user → v2_user로 변경"""
    
    # 테이블 목록: (table_name, old_fk_name, new_fk_name)
    tables = [
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
    
    conn = op.get_bind()
    
    for table_name, old_fk, new_fk in tables:
        # 1. 테이블 존재 확인
        result = conn.execute(text(f"SHOW TABLES LIKE '{table_name}'")).fetchone()
        if not result:
            print(f"[SKIP] Table {table_name} does not exist")
            continue
            
        # 2. 기존 FK 확인 및 삭제
        fk_result = conn.execute(text(f"""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{table_name}' 
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = '{old_fk}'
        """)).fetchone()
        
        if fk_result:
            op.drop_constraint(old_fk, table_name, type_='foreignkey')
            print(f"[DROP] {table_name}.{old_fk}")
        else:
            print(f"[SKIP] {table_name}.{old_fk} not found")
            
        # 3. 새 FK가 이미 존재하는지 확인
        new_fk_result = conn.execute(text(f"""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{table_name}' 
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = '{new_fk}'
        """)).fetchone()
        
        if new_fk_result:
            print(f"[SKIP] {table_name}.{new_fk} already exists")
            continue
        
        # 4. Orphan 데이터 삭제 (v2_user에 없는 user_id)
        orphan_delete = conn.execute(text(f"""
            DELETE FROM {table_name} 
            WHERE user_id NOT IN (SELECT id FROM v2_user)
        """))
        if orphan_delete.rowcount > 0:
            print(f"[CLEANUP] {table_name}: deleted {orphan_delete.rowcount} orphan rows")
            
        # 5. 새 FK 생성 (v2_user 참조)
        op.create_foreign_key(
            new_fk,
            table_name,
            'v2_user',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )
        print(f"[CREATE] {table_name}.{new_fk} -> v2_user.id")


def downgrade():
    """Rollback: v2_user → user로 복원"""
    
    tables = [
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
    
    conn = op.get_bind()
    
    for table_name, old_fk, new_fk in tables:
        result = conn.execute(text(f"SHOW TABLES LIKE '{table_name}'")).fetchone()
        if not result:
            continue
            
        # 새 FK 삭제
        fk_result = conn.execute(text(f"""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{table_name}' 
            AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME = '{new_fk}'
        """)).fetchone()
        
        if fk_result:
            op.drop_constraint(new_fk, table_name, type_='foreignkey')
            
        # 원래 FK 복원
        op.create_foreign_key(
            old_fk,
            table_name,
            'user',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )
