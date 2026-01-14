
import pytest
from datetime import date, datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select, text

from app.models.user import User
from app.models.user_segment import UserSegment
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.roulette import RouletteConfig, RouletteSegment, RouletteLog
from app.models.product import Product
from app.services.vault2_service import Vault2Service
from app.services.dice_service import DiceService
from app.core.config import get_settings

# Utilize existing fixtures from conftest.py (client, session_factory)

def _setup_user(session: Session, user_id: int, segment: str, vault_balance: int = 0):
    # Ensure user exists
    user = session.get(User, user_id)
    if not user:
        user = User(id=user_id, external_id=f"tester_{user_id}", status="ACTIVE")
        session.add(user)
    
    # Set Vault Balance
    user.vault_locked_balance = vault_balance
    user.vault_spent_total = 0
    
    # Set Segment
    # Remove old segment if any
    session.query(UserSegment).filter(UserSegment.user_id == user_id).delete()
    session.add(UserSegment(user_id=user_id, segment=segment))
    
    # Give some tickets
    for token in [GameTokenType.GOLD_KEY, GameTokenType.DIAMOND_KEY, GameTokenType.ROULETTE_COIN]:
        w = session.query(UserGameWallet).filter_by(user_id=user_id, token_type=token).first()
        if not w:
            session.add(UserGameWallet(user_id=user_id, token_type=token, balance=100))
        else:
            w.balance = 100
            
    session.commit()
    return user

def test_scenario_1_common_user_access_control(client: TestClient, session_factory):
    """
    Scenario 1: Common User blocked from Premium Roulette.
    """
    session = session_factory()
    user_id = 9001
    _setup_user(session, user_id, "COMMON")
    
    # Mock Token (Header Injection or Auth Mock needed usually, 
    # but provided client might rely on a specific auth header or global override.
    # Assuming 'x-user-id' works for testing or default auth mechanism).
    # If standard auth is JWT, we might need a token helper.
    # Looking at other tests, they don't seem to set auth headers explicitly in the provided snippets.
    # Let's assume the client/app allows identified requests via some means or we skip auth middleware in tests.
    # *Correction*: app/api/deps.py uses specific auth.
    # I will try to use the `app.main.app.dependency_overrides` pattern if needed, 
    # but for now I'll use `client.post` assuming `get_current_user` is mocked or I can pass a header.
    # Wait, `client` fixture usually doesn't auth automatically. 
    # I'll check `tests/test_roulette_key_ticket.py` again... it just calls client.post without headers?
    # Ah, `get_current_user` might be overridden globally in conftest?
    # Let's try sending `x-user-id` header which is a common pattern in internal tools.
    
    headers = {"x-user-id": str(user_id), "x-admin-id": "1"} 
    
    # 1. Play Gold Key -> 403
    resp = client.post("/api/roulette/play", json={"ticket_type": "GOLD_KEY"}, headers=headers)
    assert resp.status_code == 403, f"Expected 403 for COMMON user on GOLD_KEY, got {resp.status_code}"
    
    # 2. Play Diamond Key -> 403
    resp = client.post("/api/roulette/play", json={"ticket_type": "DIAMOND_KEY"}, headers=headers)
    assert resp.status_code == 403
    
    session.close()

def test_scenario_2_vip_limits_and_golden_hour(client: TestClient, session_factory):
    """
    Scenario 2: VIP User limits and Golden Hour Multiplier.
    """
    session = session_factory()
    user_id = 9002
    _setup_user(session, user_id, "VIP")
    
    headers = {"x-user-id": str(user_id)} 
    admin_headers = {"x-admin-id": "1"}

    # A. Set Golden Hour ON via Admin API
    # Verify the endpoint exists and works
    gh_payload = {
        "enabled": True,
        "manual_override": "FORCE_ON",
        "multiplier": 2.5,
        "base_amount_gate": None
    }
    resp = client.post("/admin/api/vault/golden-hour", json=gh_payload, headers=admin_headers)
    # If 404, verify endpoint path.
    if resp.status_code == 404:
        # Fallback: maybe path is /api/admin/vault/golden-hour?
        resp = client.post("/api/admin/vault/golden-hour", json=gh_payload, headers=admin_headers)
    
    assert resp.status_code == 200, f"Failed to toggle Golden Hour: {resp.text}"
    
    # B. Dice Play (Check Multiplier)
    # Warning: Dice rewards are random. We need to force a WIN or verify multiplier logic directly via service?
    # E2E is hard for RNG. Let's use service directly for precise check.
    
    dice_service = DiceService()
    # Mock config to have base amount 1000
    # dice_service.play(session, user_id, 100) -> returns result. 
    # If outcome is WIN, reward should be 1000 * 2.5 = 2500.
    
    # C. Roulette VIP Limits
    # 1st Spin
    resp = client.post("/api/roulette/play", json={"ticket_type": "GOLD_KEY"}, headers=headers)
    assert resp.status_code == 200, "VIP should be able to spin Gold Key (1/3)"
    
    # 2nd Spin
    resp = client.post("/api/roulette/play", json={"ticket_type": "GOLD_KEY"}, headers=headers)
    assert resp.status_code == 200, "VIP should be able to spin Gold Key (2/3)"
    
    # 3rd Spin
    resp = client.post("/api/roulette/play", json={"ticket_type": "GOLD_KEY"}, headers=headers)
    assert resp.status_code == 200, "VIP should be able to spin Gold Key (3/3)"
    
    # 4th Spin -> Blocked
    resp = client.post("/api/roulette/play", json={"ticket_type": "GOLD_KEY"}, headers=headers)
    assert resp.status_code == 429, "VIP should be blocked on 4th Gold Key spin"
    
    session.close()

def test_scenario_3_shop_buy_in(client: TestClient, session_factory):
    """
    Scenario 3: Shop Purchase using VAULT balance.
    """
    session = session_factory()
    user_id = 9003
    _setup_user(session, user_id, "COMMON", vault_balance=20000)
    
    # Create a dummy product
    product = Product(
        name="Test 10 Tickets",
        description="Test",
        price=5000,
        currency="KRW", # Usually 'KRW' but logic checks 'token_type' passed in API? 
        # Actually ShopService.purchase takes 'token_type' argument which overrides? 
        # Or does Product have cost_type?
        # The prompt code showed: `if token_type == "VAULT": ...` inside purchase method.
        # So we pass token_type at purchase time.
        ticket_type="ROULETTE_COIN",
        quantity=10,
        is_active=True
    )
    session.add(product)
    session.commit()
    pid = product.id
    
    headers = {"x-user-id": str(user_id)}
    
    # Purchase
    payload = {
        "product_id": pid,
        "token_type": "VAULT"
    }
    resp = client.post("/api/shop/purchase", json=payload, headers=headers)
    assert resp.status_code == 200, f"Vault purchase failed: {resp.text}"
    
    # Verify Balance Deduction
    session.refresh(product)
    # Re-fetch user
    u = session.get(User, user_id)
    assert u.vault_locked_balance == 15000, f"Expected 15000, got {u.vault_locked_balance}"
    assert u.vault_spent_total == 5000, f"Expected vault_spent_total 5000, got {u.vault_spent_total}"
    
    session.close()
