# /workspace/ch25/tests/conftest.py
"""Shared pytest fixtures for FastAPI client and test database."""
import os
from collections.abc import Generator
from typing import Callable

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import Session, sessionmaker

# Provide minimal defaults so importing the app doesn't require a real .env.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("JWT_SECRET", "test-secret")

from app.api.deps import get_db, get_current_user_id
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.db.base import Base
from app.main import app


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    """Create a TestClient with an isolated in-memory SQLite database.

    NOTE: In real deployments we should use a dedicated test database per environment.
    """

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        # Seed default token balances for tests so gameplay calls succeed without admin grants.
        for token in GameTokenType:
            existing = (
                db.query(UserGameWallet)
                .filter(UserGameWallet.user_id == 1, UserGameWallet.token_type == token)
                .one_or_none()
            )
            if existing is None:
                db.add(UserGameWallet(user_id=1, token_type=token, balance=10))
        db.commit()
        try:
            yield db
            db.commit()
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_id] = lambda: 1
    app.state.test_session_factory = TestingSessionLocal

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    app.state.test_session_factory = None
    Base.metadata.drop_all(engine)


@pytest.fixture()
def session_factory(client: TestClient) -> Callable[[], Session]:
    """Expose the test session factory to individual tests for seeding data."""

    return app.state.test_session_factory
