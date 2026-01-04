import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
from app.models.game_wallet import GameTokenType
from app.services.trial_grant_service import TrialGrantService
from app.services.roulette_service import RouletteService
from app.services.shop_service import ShopService
from app.models.user import User
from app.db.base_class import Base

def verify_trial_economy():
    print(">>> Starting Trial Economy Verification")
    
    settings = get_settings()
    db_url = settings.database_url
    if "@db" in db_url:
        db_url = db_url.replace("@db", "@127.0.0.1:3307")
        db_url = db_url.replace(":3306/", "/") 
    
    print(f"DB URL: {db_url}")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # 1. Verify Config Seeding
    print("\n[1] Verifying Trial Roulette Config...")
    roulette_service = RouletteService()
    try:
        config = roulette_service._get_today_config(db, GameTokenType.TRIAL_TOKEN.value)
        print(f"  -> Config Found: ID={config.id}, Name='{config.name}', TicketType={config.ticket_type}")
        
        segments = roulette_service._get_segments(db, config.id)
        print(f"  -> Segments: {len(segments)} items")
        for s in segments:
            print(f"    - [{s.slot_index}] {s.label}: {s.reward_type} x{s.reward_amount} (w={s.weight})")
            if s.reward_type == "DIAMOND":
                print("      -> OK: Diamond Reward confirmed.")
    except Exception as e:
        print(f"  -> FAIL: {e}")

    # 2. Verify Shop Products
    print("\n[2] Verifying Shop Products...")
    products = ShopService.list_products(db)
    trial_products = [p for p in products if p['sku'] in ['PROD_TICKET_COIN_1', 'PROD_TICKET_DICE_1']]
    if len(trial_products) >= 2:
        print(f"  -> OK: Found {len(trial_products)} Trial-related products.")
        for p in trial_products:
            print(f"    - SKU: {p['sku']}, Cost: {p['cost']['amount']} {p['cost']['token']}, Grant: {p['grant']['item_type']}")
    else:
        print(f"  -> FAIL: Missing Trial products. Found: {[p['sku'] for p in trial_products]}")

    # 3. Verify Trial Grant Logic (Simulation)
    print("\n[3] Verifying Trial Grant Logic...")
    # Mock user setup
    user_id = 999999
    db.execute("DELETE FROM user_game_wallet_ledger WHERE user_id = :uid", {"uid": user_id})
    db.execute("DELETE FROM user_game_wallet WHERE user_id = :uid", {"uid": user_id})
    db.execute("DELETE FROM user WHERE id = :uid", {"uid": user_id})
    db.commit()
    
    user = User(id=user_id, nickname="trial_tester", external_id="tester_trial")
    db.add(user)
    db.commit()

    trial_service = TrialGrantService()
    
    # Request ROULETTE_COIN -> Should get TRIAL_TOKEN
    print("  -> Requesting ROULETTE_COIN grant...")
    granted_amt, bal_after, label = trial_service.grant_daily_if_empty(db, user_id, GameTokenType.ROULETTE_COIN)
    
    print(f"  -> Result: Granted={granted_amt}, BalanceAfter={bal_after}, Label={label}")
    
    # Check actual wallet balance
    from app.services.game_wallet_service import GameWalletService
    wallet_service = GameWalletService()
    trial_bal = wallet_service.get_balance(db, user_id, GameTokenType.TRIAL_TOKEN)
    coin_bal = wallet_service.get_balance(db, user_id, GameTokenType.ROULETTE_COIN)
    
    print(f"  -> Wrapper Check: TRIAL_TOKEN Balance = {trial_bal}")
    print(f"  -> Wrapper Check: ROULETTE_COIN Balance = {coin_bal}")

    if trial_bal == 3 and coin_bal == 0:
        print("  -> SUCCESS: Redirected to TRIAL_TOKEN (3) correctly.")
    else:
        print("  -> FAIL: Balance mismatch.")

    db.close()
    print("\n>>> Verification Complete.")

if __name__ == "__main__":
    verify_trial_economy()
