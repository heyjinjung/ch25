import pytest
from sqlalchemy.orm import Session
from app.services.admin_audit_service import AdminAuditService
from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User

def test_intervention_evidence_logging(db: Session):
    # Setup test user
    user = User(nickname="GoldenUser", external_id="G_001")
    db.add(user)
    db.commit()
    db.refresh(user)

    # Execute an intervention (e.g., Bailout)
    action_id = "BAILOUT"
    reason = "User lost 10 times in a row"
    
    # In V2, every intervention MUST leave an evidence log (Audit Log)
    AdminAuditService.log(
        db, admin_id=999, action="EXECUTE_INTERVENTION", 
        target_type="USER", target_id=str(user.id),
        before={"risk": "HIGH"}, after={"action": action_id}
    )
    
    # Verify Audit Log
    log = db.query(AdminAuditLog).filter_by(target_id=str(user.id), action="EXECUTE_INTERVENTION").first()
    assert log is not None
    assert log.admin_id == 999
    assert log.after_json["action"] == action_id

def test_intervention_transparency(db: Session):
    # Setup
    user = User(nickname="TransparencyUser", external_id="G_002")
    db.add(user)
    db.commit()
    
    # Audit log should capture WHO and WHY (via 'after' or specific fields)
    AdminAuditService.log(
        db, admin_id=100, action="ADJUST_WALLET",
        target_type="USER", target_id=str(user.id),
        after={"reason": "Manual correction"}
    )
    
    log = db.query(AdminAuditLog).filter_by(admin_id=100).first()
    assert log.after_json["reason"] == "Manual correction"
