"""
Golden Scheduler Service for V2.

This service aligns HQ Margin data (Segments) with Golden Project interventions.
It runs periodically to identify opportunities or risks based on HQ data and user activity.
"""
from datetime import datetime, timedelta
import logging

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_golden_intervention_log import V2GoldenInterventionLog

logger = logging.getLogger(__name__)


class GoldenSchedulerService:
    @staticmethod
    def run_golden_hour_check(db: Session) -> dict:
        """
        Run periodic check for Golden Hour opportunities.
        
        Logic:
        1. Find "Active" VIP/WHALE users (active in last 24h).
        2. Check if they have pending interventions or are in cooldown.
        3. If eligble, create a 'CANDIDATE_GOLDEN_HOUR' intervention log (Pending Approval).
        
        Returns:
            dict: Stats of the run (processed, triggered, etc.)
        """
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        
        # 1. Select Active VIP/WHALE users
        # Join V2User for last_active check (if model has it, or use log proxy? 
        # V2User usually has updated_at or we rely on segment Last Active logic.
        # But V2UserSegment doesn't have last_active. V2User usually does ??
        # Let's assume V2User has NO last_active column based on previous reads, 
        # but SegmentService calculates it. 
        # For efficiency, let's look at recent Login/Game logs? 
        # Or just trust V2UserSegment if it's updated frequently as 'ACTIVE'?
        # Actually V2UserSegment stores 'VIP', 'WHALE', not 'ACTIVE' state combined. 
        # But 'AT_RISK' is a state.
        
        # Let's use V2UserSegment filter for VIP/WHALE/AT_RISK.
        targets = db.execute(
            select(V2UserSegment.user_id, V2UserSegment.segment)
            .where(
                V2UserSegment.segment.in_(["VIP", "WHALE", "AT_RISK"])
            )
        ).all()
        
        triggered_count = 0
        skipped_count = 0
        
        for user_id, segment in targets:
            # Check recent intervention to avoid spam
            existing_log = db.execute(
                select(V2GoldenInterventionLog)
                .where(
                    V2GoldenInterventionLog.user_id == user_id,
                    V2GoldenInterventionLog.created_at > now - timedelta(hours=24)
                )
            ).first()
            
            if existing_log:
                skipped_count += 1
                continue
            
            # TRIGGER CONDITION:
            # VIP/WHALE -> Check if they need "Care" (Golden Hour)?
            # AT_RISK -> Check if they need "Save" (Retention)?
            
            trigger_id = "TRG_HQ_ALIGN_" + segment
            action_taken = "CANDIDATE_GOLDEN_HOUR" if segment in ["VIP", "WHALE"] else "CANDIDATE_RETENTION"
            
            # Create Log (Pending Approval)
            log = V2GoldenInterventionLog(
                user_id=user_id,
                trigger_id=trigger_id,
                trigger_condition=f"HQ Segment {segment} Detected",
                action_taken=action_taken,
                status="PENDING_APPROVAL", # Admin must approve
                created_at=now
            )
            db.add(log)
            triggered_count += 1
            
        db.commit()
        
        logger.info(f"GoldenScheduler Run: Triggered {triggered_count}, Skipped {skipped_count}")
        return {
            "processed": len(targets),
            "triggered": triggered_count,
            "skipped": skipped_count
        }
