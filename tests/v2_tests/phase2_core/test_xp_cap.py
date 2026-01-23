import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.base_class import Base
from app.services.level_xp_service import LevelXPService

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_xp_cap_enforcement(db_session):
    """
    Verify that LevelXPService.add_xp caps the delta at MAX_SAFE_DELTA (100,000).
    """
    service = LevelXPService()
    user_id = 999
    
    # Try to add massive XP (1 Million)
    result = service.add_xp(db_session, user_id=user_id, delta=1_000_000, source="EXPLOIT_TEST")
    
    # Assert cap
    assert result["added_xp"] == 100_000, f"Expected 100,000, got {result['added_xp']}"
    
    # Verify DB state
    status = service.get_status(db_session, user_id)
    assert status["current_xp"] == 100_000
    print("XP Cap Verified: 1,000,000 -> 100,000")

if __name__ == "__main__":
    import sys
    # Manual run support
    try:
        # Minimal setup to run standalone if needed, though pytest is preferred
        pass 
    except Exception as e:
        print(e)
