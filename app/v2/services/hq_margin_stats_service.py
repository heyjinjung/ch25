"""
HQ Margin Stats Service.

This service aggregates specific statistics related to HQ Margin data 
for display on the Ops Dashboard. 
It isolates the query logic from the API controller.
"""
from datetime import datetime
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.hq_prospective_user import HQProspectiveUser
from app.v2.models.v2_admin_audit_log import V2AdminAuditLog
from app.v2.schemas.v2_admin_ops import OpsHQMarginStatsDto

class HQMarginStatsService:
    @staticmethod
    def get_hq_margin_stats(db: Session) -> OpsHQMarginStatsDto:
        """
        Fetch High-Level HQ Margin Statistics.
        
        Metrics:
        - VIP Count (Segment='VIP')
        - Whale Count (Segment='WHALE')
        - At Risk Count (Segment='DORMANT') -> Mapped to 'atRisk'
        - Prospective VIP Count (HQProspectiveUser Segment='VIP', Not Joined)
        - Last Sync Time (From Audit Log)
        """
        
        # 1. Segment Counts from V2UserSegment
        # Using separate queries is fine for specific counts, 
        # or group by could be used if we needed all.
        vip_count = db.query(func.count(V2UserSegment.user_id)).filter(
            V2UserSegment.segment == "VIP"
        ).scalar() or 0
        
        whale_count = db.query(func.count(V2UserSegment.user_id)).filter(
            V2UserSegment.segment == "WHALE"
        ).scalar() or 0
        
        dormant_count = db.query(func.count(V2UserSegment.user_id)).filter(
            V2UserSegment.segment == "DORMANT"
        ).scalar() or 0
        
        # 2. Prospective VIPs
        prospective_vip_count = db.query(func.count(HQProspectiveUser.id)).filter(
            HQProspectiveUser.segment == "VIP",
            HQProspectiveUser.is_joined == False
        ).scalar() or 0
        
        # 3. Last Sync Time
        last_audit = db.query(V2AdminAuditLog).filter(
            V2AdminAuditLog.action == "HQ_MARGIN_IMPORT"
        ).order_by(desc(V2AdminAuditLog.created_at)).first()
        
        return OpsHQMarginStatsDto(
            vip_count=vip_count,
            whale_count=whale_count,
            at_risk_count=dormant_count,
            prospective_vip_count=prospective_vip_count,
            last_sync_at=last_audit.created_at if last_audit else None
        )
