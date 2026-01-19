"""TDD: V2 shop purchase atomicity."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.v2.db.base import Base
from app.v2.models.user import V2User
from app.v2.models.v2_shop_order import V2ShopOrder
from app.v2.services.shop_service import V2ShopService


def _session_factory():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def test_shop_purchase_deducts_locked_balance_and_logs():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        user = V2User(id=1, cc_id="CC-1", vault_locked_balance=1000)
        db.add(user)
        db.commit()

        order = V2ShopService.purchase(
            db,
            user_id=1,
            sku="TICKET_ROULETTE_10",
            name="룰렛 티켓 10장",
            cost_amount=300,
            reward_type="ROULETTE_TICKET",
            reward_amount=10,
        )
        db.commit()

        assert order.id is not None
        assert order.cost_type == "VAULT"
        assert user.vault_locked_balance == 700
    finally:
        db.close()


def test_shop_purchase_fails_without_balance():
    SessionLocal = _session_factory()
    db = SessionLocal()
    try:
        user = V2User(id=2, cc_id="CC-2", vault_locked_balance=100)
        db.add(user)
        db.commit()

        try:
            V2ShopService.purchase(
                db,
                user_id=2,
                sku="TICKET_ROULETTE_10",
                name="룰렛 티켓 10장",
                cost_amount=300,
                reward_type="ROULETTE_TICKET",
                reward_amount=10,
            )
            assert False, "expected insufficient locked balance error"
        except ValueError as exc:
            assert str(exc) == "insufficient locked balance"

        orders = db.query(V2ShopOrder).count()
        assert orders == 0
        assert user.vault_locked_balance == 100
    finally:
        db.close()
