import pytest
from datetime import datetime
from app.v2.services.golden_intervention_service import GoldenInterventionService
from app.v2.models import V2User, V2GoldenInterventionLog

@pytest.mark.integration
class TestGoldenInterventionAdvanced:
    def test_trg_zero_bal(self, db_session, base_user):
        service = GoldenInterventionService(db_session)
        
        # 1. Trigger with 0 balance
        log = service.check_zero_balance_trigger(base_user.id, current_balance=0)
        assert log is not None
        assert log.trigger_id == "TRG_ZERO_BAL"
        
        # 2. Check cooldown (24h)
        log2 = service.check_zero_balance_trigger(base_user.id, current_balance=0)
        assert log2 is None

    def test_vip_welcome(self, db_session, base_user):
        service = GoldenInterventionService(db_session)
        
        # Trigger VIP welcome
        log = service.check_vip_welcome_trigger(base_user.id, is_new_vip=True)
        assert log is not None
        assert log.trigger_id == "VIP_WELCOME"
        
        # No trigger if not new VIP
        log2 = service.check_vip_welcome_trigger(base_user.id, is_new_vip=False)
        assert log2 is None
