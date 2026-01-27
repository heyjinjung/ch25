
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from app.core.config import get_settings
from app.api.deps import get_db
from app.v2.services.admin_audit_service import V2AdminAuditService
from app.models.mission import MissionCategory

def test_audit():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    with Session(engine) as db:
        print("Testing audit log with Enum...")
        patch = {"category": MissionCategory.WEEKLY}
        try:
            V2AdminAuditService.log(
                db, 1, "TEST_ACTION", "TEST", "1",
                after=patch
            )
            print("Audit log successful!")
        except Exception as e:
            print(f"Audit log failed: {e}")

if __name__ == "__main__":
    test_audit()
