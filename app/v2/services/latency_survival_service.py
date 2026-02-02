from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.v2.models.v2_user_deposit_evidence import V2UserDepositEvidence, EvidenceStatus
from app.v2.schemas.v2_constants import RewardType, TicketType
from app.v2.models import GameTokenType
from app.v2.services.inventory_service import V2InventoryService

class V2LatencySurvivalService:
    """Latency Survival Service.
    
    Handles provisional grants for delayed deposits and post-verification.
    """
    
    # Provisional Reward Config (Can be moved to DB Config later)
    # Provisional Reward Config (Can be moved to DB Config later)
    PROVISIONAL_REWARD_TYPE = "ROULETTE_TICKET"
    PROVISIONAL_REWARD_AMOUNT = 3
    MAX_PROVISIONAL_PER_HOUR = 3  # Rate Limit per User
    
    @classmethod
    def submit_evidence(
        cls,
        db: Session,
        user_id: int,
        tx_id: str,
        claimed_amount: int,
        image_url: Optional[str] = None
    ) -> V2UserDepositEvidence:
        """Submit deposit evidence and grant provisional rewards."""
        
        # 1. Deduplication (TX ID)
        existing = db.query(V2UserDepositEvidence).filter(
            V2UserDepositEvidence.tx_id == tx_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="DUPLICATE_TX_ID")
            
        # 2. Rate Limit (Simple count check)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_count = db.query(V2UserDepositEvidence).filter(
            V2UserDepositEvidence.user_id == user_id,
            V2UserDepositEvidence.created_at >= one_hour_ago
        ).count()
        
        if recent_count >= cls.MAX_PROVISIONAL_PER_HOUR:
            raise HTTPException(status_code=429, detail="RATE_LIMIT_EXCEEDED")

        # 3. Create Evidence Record
        evidence = V2UserDepositEvidence(
            user_id=user_id,
            tx_id=tx_id,
            claimed_amount=claimed_amount,
            image_url=image_url,
            status=EvidenceStatus.PROVISIONAL, # Immediate grant logic
            reward_json={cls.PROVISIONAL_REWARD_TYPE: cls.PROVISIONAL_REWARD_AMOUNT}
        )
        db.add(evidence)
        
        try:
            db.flush() # Check for constraints
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=400, detail="DUPLICATE_TX_ID")

        # 4. Grant Provisional Rewards
        # 'LATENCY_PROVISIONAL' should be added to DB Enum.
        try:
            from typing import get_args
            # Check if it's a Wallet Token
            if cls.PROVISIONAL_REWARD_TYPE in get_args(TicketType):
                V2InventoryService.grant_wallet_tokens(
                    db,
                    v2_user_id=user_id,
                    token_type=GameTokenType(cls.PROVISIONAL_REWARD_TYPE),
                    amount=cls.PROVISIONAL_REWARD_AMOUNT,
                    reason="LATENCY_PROVISIONAL",
                    label=str(evidence.id)
                )
            else:
                V2InventoryService.grant_item(
                    db,
                    v2_user_id=user_id,
                    item_type=cls.PROVISIONAL_REWARD_TYPE,
                    amount=cls.PROVISIONAL_REWARD_AMOUNT,
                    reason="LATENCY_PROVISIONAL",
                    related_id=str(evidence.id)
                )
        except Exception as e:
            # If grant fails, rollback everything
            db.rollback()
            raise e
            
        return evidence

    @classmethod
    def verify_evidence(
        cls,
        db: Session,
        admin_id: int,
        evidence_id: int,
        matched_log_id: int, 
        memo: Optional[str] = None
    ) -> V2UserDepositEvidence:
        """Approve evidence and link to actual deposit log."""
        evidence = db.get(V2UserDepositEvidence, evidence_id)
        if not evidence:
            raise HTTPException(status_code=404, detail="EVIDENCE_NOT_FOUND")
            
        if evidence.status != EvidenceStatus.PROVISIONAL:
            raise HTTPException(status_code=400, detail="INVALID_STATUS")
            
        evidence.status = EvidenceStatus.VERIFIED
        evidence.matched_log_id = matched_log_id
        evidence.verified_at = datetime.utcnow() # Use UTC for internal logic, DB converts if needed
        evidence.admin_memo = memo
        
        db.add(evidence)
        # No additional reward or clawback needed on success.
        # The provisional reward becomes permanent.
        
        return evidence

    @classmethod
    def reject_evidence(
        cls,
        db: Session,
        admin_id: int,
        evidence_id: int,
        reason: str
    ) -> V2UserDepositEvidence:
        """Reject evidence and clawback provisional rewards."""
        evidence = db.get(V2UserDepositEvidence, evidence_id)
        if not evidence:
            raise HTTPException(status_code=404, detail="EVIDENCE_NOT_FOUND")
            
        if evidence.status != EvidenceStatus.PROVISIONAL:
            raise HTTPException(status_code=400, detail="INVALID_STATUS")
            
        evidence.status = EvidenceStatus.REJECTED
        evidence.verified_at = datetime.utcnow()
        evidence.admin_memo = reason
        
        # Clawback Logic
        if evidence.reward_json:
            from typing import get_args
            for item_type, amount in evidence.reward_json.items():
                if item_type in get_args(TicketType):
                    V2InventoryService.consume_wallet_tokens(
                        db,
                        v2_user_id=evidence.user_id,
                        token_type=GameTokenType(item_type),
                        amount=amount,
                        reason="LATENCY_CLAWBACK",
                        label=str(evidence.id)
                    )
                else:
                    V2InventoryService.consume_item(
                        db,
                        user_id=evidence.user_id,
                        item_type=item_type,
                        amount=amount,
                        reason="LATENCY_CLAWBACK",
                        related_id=str(evidence.id)
                    )
        
        db.add(evidence)
        return evidence
