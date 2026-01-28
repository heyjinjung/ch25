import sys
sys.path.append("c:/Users/JAVIS/ch/ch25")

from app.db.session import SessionLocal
from app.v2.models.v2_roulette import V2RouletteConfig, V2RouletteSegment

def show_all_configs():
    db = SessionLocal()
    try:
        print("=" * 70)
        print("ALL V2 Roulette Configs - Grouped by ticket_type")
        print("=" * 70)
        
        configs = db.query(V2RouletteConfig).order_by(V2RouletteConfig.ticket_type, V2RouletteConfig.id.desc()).all()
        
        current_ticket = None
        for config in configs:
            if config.ticket_type != current_ticket:
                current_ticket = config.ticket_type
                print(f"\n{'='*70}")
                print(f"TICKET TYPE: {current_ticket}")
                print(f"{'='*70}")
            
            # Mark which one user page will use (highest ID for this ticket_type)
            is_user_default = "(← USER PAGE USES THIS)" if config.id == max(c.id for c in configs if c.ticket_type == config.ticket_type and c.is_active) else ""
            
            print(f"\n  [ID {config.id}] {config.name} {is_user_default}")
            print(f"    Active: {config.is_active}")
            print(f"    Updated: {config.updated_at}")
            
            segments = db.query(V2RouletteSegment).filter_by(config_id=config.id).order_by(V2RouletteSegment.slot_index).limit(3).all()
            seg_preview = ", ".join([f"{s.slot_index}:{s.label}" for s in segments])
            print(f"    Segments Preview: {seg_preview}...")
        
        print("\n" + "=" * 70)
        print("DIAGNOSIS: Admin should edit the config marked with '← USER PAGE USES THIS'")
        print("=" * 70)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    show_all_configs()

