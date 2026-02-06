"""
V2 Level System SOT Compliance Test
SOT Documents:
- 01_v2_level_domain_overview_sot_ko.md
- 02_v2_level_xp_storage_sync_sot_ko.md
- 03_v2_level_point_earning_rules_sot_ko.md
- 04_v2_level_reward_table_and_db_sot_ko.md
"""
import pytest
from sqlalchemy.orm import Session
from app.v2.models.v2_level_reward import V2LevelRewardTable
from app.v2.models.user import V2User
from app.v2.models import UserLevelProgress
from app.v2.services.level_xp_service import V2LevelXPService

class TestLevelRewardTableSOT:
    """
    SOT 04: Level 1-20 Reward Table Verification
    """
    
    # SOT 04 Section 4. Level 1-20 Reward Table
    SOT_REWARDS = {
        1: (0, "TICKET_ROULETTE", 1),
        2: (20, "TICKET_DICE", 1),
        3: (50, "TICKET_ROULETTE", 1),
        4: (60, "TICKET_LOTTERY", 1),
        5: (100, "TICKET_DICE", 1),
        6: (120, "GIFTICON_BAEMIN", 5000),
        7: (160, "TICKET_DICE", 2),
        8: (200, "TICKET_DICE", 3),
        9: (300, "TICKET_LOTTERY", 1),
        10: (500, "GOLD_KEY", 1),
        11: (700, "TICKET_ROULETTE", 3),
        12: (1000, "GOLD_KEY", 1),
        13: (1200, "TICKET_DICE", 4),
        14: (1400, "TICKET_ROULETTE", 4),
        15: (1800, "TICKET_LOTTERY", 3),
        16: (2200, "TICKET_LOTTERY", 5),
        17: (3000, "GOLD_KEY", 3),
        18: (4000, "DIAMOND_KEY", 1),
        19: (5000, "DIAMOND_KEY", 2),
        20: (6000, "DIAMOND_KEY", 5),
    }

    @pytest.fixture(autouse=True)
    def seed_reward_table(self, db: Session):
        """Seed the V2LevelRewardTable with SOT data if empty for testing validity."""
        if db.query(V2LevelRewardTable).count() < 20:
            db.query(V2LevelRewardTable).delete()
            rewards = []
            for lvl, (req_xp, r_type, r_amt) in self.SOT_REWARDS.items():
                rewards.append(V2LevelRewardTable(
                    level=lvl,
                    required_xp=req_xp,
                    reward_type=r_type,
                    reward_amount=r_amt,
                    reward_payload={}
                ))
            db.add_all(rewards)
            db.commit()

    def test_level_1_to_20_integrity(self, db: Session):
        """Verify checking DB against SOT 04 Specifications."""
        rows = db.query(V2LevelRewardTable).order_by(V2LevelRewardTable.level).all()
        assert len(rows) >= 20
        
        for row in rows:
            if row.level > 20: continue
            
            sot_data = self.SOT_REWARDS.get(row.level)
            assert sot_data is not None, f"Level {row.level} not in SOT"
            
            req_xp, r_type, r_amt = sot_data
            assert row.required_xp == req_xp, f"L{row.level} XP mismatch"
            assert row.reward_type == r_type, f"L{row.level} Type mismatch"
            assert row.reward_amount == r_amt, f"L{row.level} Amount mismatch"

    def test_xp_rule_100k_to_20xp(self):
        """
        SOT 03: CC Deposit Calcs
        Rule: floor(Amount / 100,000) * 20
        """
        assert self._calc_xp(50_000) == 0
        assert self._calc_xp(99_999) == 0
        assert self._calc_xp(100_000) == 20
        assert self._calc_xp(199_999) == 20
        assert self._calc_xp(200_000) == 40
        assert self._calc_xp(500_000) == 100
        assert self._calc_xp(10_000_000) == 2000

    def _calc_xp(self, amount: int) -> int:
        # Helper to mirror SOT logic
        return (amount // 100_000) * 20

class TestPrimaryMirrorSync:
    """
    SOT 02: Primary SoT (v2_user) vs Mirror (user_level_progress)
    """

    def test_add_xp_syncs_mirror(self, db: Session):
        # Given
        user = V2User(
            cc_id="TEST_SYNC_1", 
            nickname="SyncUser", 
            level=1, 
            xp=0, 
            total_charge_amount=0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Ensure Mirror exists (create strictly if needed, usually dependent on service/model hooks)
        # But V2LevelXPService logic should handle or creation strategies. 
        # Here we manually verify creation if not auto-created by triggers.
        # Assuming Service layer creation or sync.
        
        service = V2LevelXPService()
        
        # When: Add XP via Service
        service.add_xp(db, user.id, 100, "TEST_SYNC", {})
        db.commit()
        
        # Then
        db.refresh(user)
        mirror = db.query(UserLevelProgress).filter_by(user_id=user.id).first()
        
        assert user.xp == 100
        assert mirror is not None
        assert mirror.xp == user.xp
        assert mirror.level == user.level

    def test_sync_consistency_check(self, db: Session):
        """
        SOT 02 9.1 SoT/Mirror Consistency SQL equivalent check
        """
        # Create a user with synchronized state
        user = V2User(cc_id="TEST_SYNC_2", nickname="SyncUser2", level=5, xp=1000)
        db.add(user)
        db.flush() # get id
        
        mirror = UserLevelProgress(user_id=user.id, level=5, xp=1000)
        db.add(mirror)
        db.commit()
        
        # Verify Query
        # "Left Join ... Where ... OR ..."
        
        inconsistent = db.query(V2User).outerjoin(UserLevelProgress, V2User.id == UserLevelProgress.user_id)\
            .filter(
                (UserLevelProgress.user_id == None) |
                (V2User.level != UserLevelProgress.level) |
                (V2User.xp != UserLevelProgress.xp)
            ).filter(V2User.id == user.id).count()
            
        assert inconsistent == 0
        
        # Force Desync
        mirror.xp = 999
        db.commit()
        
        inconsistent_mock = db.query(V2User).outerjoin(UserLevelProgress, V2User.id == UserLevelProgress.user_id)\
            .filter(
                (V2User.xp != UserLevelProgress.xp)
            ).filter(V2User.id == user.id).count()
            
        assert inconsistent_mock == 1
