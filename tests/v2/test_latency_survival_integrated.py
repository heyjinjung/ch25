import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.v2.models import V2UserDepositEvidence, EvidenceStatus, GameTokenType
from app.v2.services.latency_survival_service import V2LatencySurvivalService
from app.v2.services.inventory_service import V2InventoryService

@pytest.mark.integration
class TestLatencySurvivalIntegrated:
    def test_latency_recursive_clawback_negative(self, db_session, base_user):
        """Test strict recursive clawback allowing negative balance."""
        service = V2LatencySurvivalService()
        
        # 1. Submit evidence (this will grant 5 tickets)
        evidence = service.submit_evidence(
            db_session, 
            user_id=base_user.id, 
            tx_id="tx_clawback_test", 
            claimed_amount=50000, 
            image_url="img.png"
        )
        db_session.commit()

        # 2. Reset balance to 0 (so that clawback makes it -5)
        balance = V2InventoryService.get_wallet_balance(
            db_session, base_user.id, GameTokenType.ROULETTE_TICKET
        )
        if balance > 0:
            V2InventoryService.consume_wallet_tokens(
                db_session, 
                v2_user_id=base_user.id, 
                token_type=GameTokenType.ROULETTE_TICKET,
                amount=balance, 
                reason="RESET_TO_ZERO", 
                allow_negative=True
            )
            db_session.commit()

        # 3. Reject evidence -> Trigger clawback
        service.reject_evidence(db_session, admin_id=1, evidence_id=evidence.id, reason="TEST_REJECT")
        
        # 4. Check if balance is -5
        balance = V2InventoryService.get_wallet_balance(
            db_session, base_user.id, GameTokenType.ROULETTE_TICKET
        )
        assert balance == -5
        
    def test_latency_rate_limit(self, db_session, base_user):
        """Test evidence submission rate limit (3 per hour) with KST awareness."""
        service = V2LatencySurvivalService()
        
        # Clear any existing evidence for this user to ensure rate limit triggers exactly at 4th
        db_session.query(V2UserDepositEvidence).filter_by(user_id=base_user.id).delete()
        db_session.commit()
        
        # Submit 3 times
        for i in range(3):
            service.submit_evidence(
                db_session, 
                user_id=base_user.id, 
                tx_id=f"tx_rl_{i}", 
                claimed_amount=10000, 
                image_url="img.png"
            )
            
        # 4th submission should fail
        with pytest.raises(HTTPException) as excinfo:
            service.submit_evidence(
                db_session, 
                user_id=base_user.id, 
                tx_id="tx_rl_fail", 
                claimed_amount=10000, 
                image_url="img.png"
            )
        assert excinfo.value.status_code == 429
        assert "RATE_LIMIT_EXCEEDED" in str(excinfo.value.detail)
