
import sys
import os
from pathlib import Path
from datetime import datetime, date

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base

# Models
from app.models.user import User
from app.models.game_wallet import UserGameWallet, GameTokenType
from app.models.team_battle import TeamSeason, Team, TeamMember
from app.models.dice import DiceConfig

# Services
from app.services.game_wallet_service import GameWalletService
from app.services.team_battle_service import TeamBattleService
from app.services.admin_dice_service import AdminDiceService
from app.api.admin.routes.admin_game_tokens import _resolve_user_id

# Schemas
from app.schemas.admin_dice import AdminDiceConfigCreate

def test_audit_phase2():
    # Setup In-Memory DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    print("--- Admin Audit Phase 2: Economy & Games Start ---")

    # 1. Token Operations & Username Support (Integration Test)
    print("\n[1] Testing Token Operations (with Username Resolution)...")
    u1 = User(id=1, external_id="ext_audit1", telegram_username="audit_user", status="ACTIVE")
    db.add(u1)
    db.commit()

    # Resolve by Username (Refactor Check)
    resolved_id = _resolve_user_id(db, None, None, "audit_user")
    assert resolved_id == 1
    
    # Grant Tokens
    wallet_service = GameWalletService()
    new_bal = wallet_service.grant_tokens(db, 1, GameTokenType.LOTTERY_TICKET, 100)
    print(f"   -> Granted 100 Lottery Tickets. New Balance: {new_bal}")
    assert new_bal == 100
    
    # Revoke Tokens
    new_bal_rev = wallet_service.revoke_tokens(db, 1, GameTokenType.LOTTERY_TICKET, 30)
    print(f"   -> Revoked 30 Lottery Tickets. New Balance: {new_bal_rev}")
    assert new_bal_rev == 70
    print("   -> PASSED: Token Ops & Username Resolution")

    # 2. Team Battle (Ops Audit)
    print("\n[2] Testing Team Battle Management...")
    tb_service = TeamBattleService()
    
    # Create Season
    today_dt = datetime.combine(date.today(), datetime.min.time())
    season_data = {
        "name": "Audit Season 1",
        "starts_at": today_dt,
        "ends_at": today_dt,
        "is_active": True
    }
    season = tb_service.create_season(db, season_data)
    print(f"   -> Created Season: {season.name} (ID: {season.id})")
    assert season.id is not None
    
    # Create Team
    team_data = {
        "name": "Red Team",
        "is_active": True
    }
    team = tb_service.create_team(db, team_data)
    print(f"   -> Created Team: {team.name}")
    
    # Force Join
    member = tb_service.move_member(db, team.id, u1.id, "member")
    print(f"   -> Force Joined User {u1.id} to Team {team.id}")
    assert member.team_id == team.id
    print("   -> PASSED: Team Battle Ops")

    # 3. Game Config (Dice Audit)
    print("\n[3] Testing Game Config (Dice)...")
    dice_service = AdminDiceService()
    
    # Create Config
    config_payload = AdminDiceConfigCreate(
        name="Audit High Risk",
        max_daily_plays=10,
        win_reward_type="LOTTERY_TICKET",
        win_reward_amount=5,
        draw_reward_type="NONE",
        draw_reward_amount=0,
        lose_reward_type="NONE",
        lose_reward_amount=0,
        is_active=True
    )
    config = dice_service.create_config(db, config_payload)
    print(f"   -> Created Dice Config: {config.name}, WinReward: {config.win_reward_amount}")
    assert config.win_reward_amount == 5
    
    # Toggle Active
    toggled = dice_service.toggle_active(db, config.id, False)
    print(f"   -> Deactivated Config. Active: {toggled.is_active}")
    assert toggled.is_active is False
    print("   -> PASSED: Game Config Ops")

    print("\n--- Phase 2 Audit Completed ---")

if __name__ == "__main__":
    test_audit_phase2()
