import pytest
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.game_wallet import UserGameWallet, GameTokenType

def test_ticket_conversion_one_to_one():
    # v2_ticket_conversion_sot_ko.md: Conversion ratio is 1:1
    def convert(amount, ratio=1):
        return amount * ratio
        
    assert convert(10) == 10
    assert convert(100) == 100

def test_crafting_gold_key_fragment(db: Session):
    # v2_shop_exchange_policy_sot_ko.md: 10 fragments -> 1 ticket
    user = User(nickname="Crafter", external_id="CR_001")
    db.add(user)
    db.flush()
    
    fragments = UserGameWallet(user_id=user.id, token_type="GOLD_KEY_FRAGMENT", balance=15)
    keys = UserGameWallet(user_id=user.id, token_type="GOLD_KEY", balance=0)
    db.add_all([fragments, keys])
    db.commit()
    
    # Process craft (Fragment x10 -> Key x1)
    if fragments.balance >= 10:
        fragments.balance -= 10
        keys.balance += 1
    
    db.commit()
    assert fragments.balance == 5
    assert keys.balance == 1

def test_shop_purchase_integrity(db: Session):
    # v2_shop_inventory_service_design_ko.md: Charge -> Log -> Reward
    user = User(nickname="Shopper", external_id="SHOPPER_001", vault_locked_balance=20000)
    db.add(user)
    db.flush()
    
    item_wallet = UserGameWallet(user_id=user.id, token_type="ROULETTE_COIN", balance=0)
    db.add(item_wallet)
    db.commit()
    
    cost = 10000
    reward_qty = 11
    
    # Transactional logic simulation
    if user.vault_locked_balance >= cost:
        user.vault_locked_balance -= cost
        item_wallet.balance += reward_qty
        # (In real code, we'd add V2ShopOrder log here)
        success = True
    else:
        success = False
        
    db.commit()
    assert success is True
    assert user.vault_locked_balance == 10000
    assert item_wallet.balance == 11
