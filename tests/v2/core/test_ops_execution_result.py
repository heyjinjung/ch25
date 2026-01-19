"""TDD: V2 ops execution result model."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.v2.db.base import Base
from app.v2.models.v2_ops_execution_result import V2OpsExecutionResult


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_ops_execution_result_created():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        result = V2OpsExecutionResult(
            task_id=123,
            kind="PLAN",
            payload_json={"ok": True, "count": 3},
        )
        db.add(result)
        db.commit()

        saved = db.get(V2OpsExecutionResult, result.id)
        assert saved is not None
        assert saved.task_id == 123
        assert saved.kind == "PLAN"
        assert saved.payload_json == {"ok": True, "count": 3}
    finally:
        db.close()
