import sys
import os
# Fix Path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import uuid
import logging
from sqlalchemy import create_engine, text, or_
from sqlalchemy.orm import sessionmaker

# App Imports
from app.db.base import Base
from app.db.session import SessionLocal
from app.models.user import User
from app.models.admin_user_profile import AdminUserProfile
from app.services.admin_user_identity_service import resolve_user_id_by_identifier, resolve_user_summary
from app.services.user_segment_service import UserSegmentService
# from app.schemas.admin_user_import import AdminUserImportRow

# --- Config ---
logger = logging.getLogger("Phase1Verify")
logging.basicConfig(level=logging.INFO)

def log(msg, section=None):
    prefix = f"\n[Section {section}] " if section else ""
    print(f"{prefix}{msg}")

def header(title):
    print(f"\n{'='*60}\n{title}\n{'='*60}")

def setup_fresh_data(db):
    """
    Creates a set of test users to cover all scenarios.
    """
    header("EXECUTION: Data Setup")

    # Clean up potentially conflicting data using ORM
    # db.execute(text("DELETE FROM admin_user_profile ...")) # Caused MySQL syntax error
    
    users_to_del = db.query(User).filter(or_(User.nickname.like('audit_%'), User.nickname == '1234')).all()
    if users_to_del:
        ids = [u.id for u in users_to_del]
        # Manual cascade delete if needed, or rely on FK cascade
        db.query(AdminUserProfile).filter(AdminUserProfile.user_id.in_(ids)).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_(ids)).delete(synchronize_session=False)
        db.commit()

    # 1. Base User (U1) - The "Complex" User
    # Has: ID, Nickname, Username, RealName, Phone, Tag, Memo, ExternalID (CCID)
    u1 = User(
        nickname="audit_complex", 
        telegram_username="audit_u1",
        telegram_id=10001,
        external_id="cc_u1_10001"
    )
    db.add(u1)
    db.commit() # Get ID
    db.refresh(u1)

    p1 = AdminUserProfile(
        user_id=u1.id,
        real_name="Real U1",
        phone_number="010-1111-1111",
        tags=["VIP", "TEST"],
        memo="Audit Memo Check"
    )
    db.add(p1)
    
    # 2. Numeric Nickname User (U2)
    # Checks: if I type "1234", do I find this user or try to find ID 1234?
    u2 = User(
        nickname="1234",
        telegram_id=10002,
        external_id="cc_u2_10002"
    )
    db.add(u2)

    # 3. Duplicate RealName (U3, U4)
    # Checks: 409 Conflict
    u3 = User(nickname="audit_dup_1", telegram_id=10003, external_id="cc_u3")
    u4 = User(nickname="audit_dup_2", telegram_id=10004, external_id="cc_u4")
    db.add(u3)
    db.add(u4)
    
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    db.refresh(u3)
    db.refresh(u4)

    # Add duplicate profiles
    p3 = AdminUserProfile(user_id=u3.id, real_name="Duplicate Name")
    p4 = AdminUserProfile(user_id=u4.id, real_name="Duplicate Name")
    db.add(p3)
    db.add(p4)
    db.commit()

    log(f"Setup Complete: U1({u1.id}), U2({u2.id}, nick='1234'), U3/U4(Dup Name)")
    return u1, u2, u3, u4

def verify_section_12_numeric_policy(db, u1, u2):
    """
    Section 12: Numeric Policy verification.
    Constraint: Raw digits should NOT match ID unless prefixed, unless they match a text field (Nickname).
    """
    header("12. Numeric Policy & Prefix Strategy")
    
    # 12-2.1: Raw ID search failure (Strict Policy)
    # Accessing U1 via RAW ID '10001' (Telegram ID) or u1.id should FAIL or prefer Nickname.
    # Since u1.id is an integer, let's say u1.id is 55. If I search "55", it should NOT find u1 unless u1.nickname is "55".
    # But wait, checking u1.id might be chance. Let's use a random large lookup.
    
    target_uid = str(u1.id)
    try:
        # Should NOT find by ID without prefix
        res = resolve_user_id_by_identifier(db, target_uid)
        # If it returns u1.id, is u1.nickname == target_uid? No.
        # Then this is a FAILURE of Strict Policy.
        log(f"❌ FAILED: Raw UID '{target_uid}' resolved to {res} (Expected 404/TextSearch)", "12-2")
    except Exception as e:
        if "404" in str(e):
            log(f"✅ PASSED: Raw UID '{target_uid}' -> 404 (Strict Policy enforced)", "12-2")
        else:
            log(f"❌ FAILED: Unexpected Error for Raw UID: {e}", "12-2")

    # 12-2.2: Numeric Nickname Match
    # U2 has nickname "1234". Searching "1234" should find U2, NOT look for ID 1234.
    try:
        res = resolve_user_id_by_identifier(db, "1234")
        if res == u2.id:
            log(f"✅ PASSED: Raw '1234' matches Nickname '1234' (Text Priority)", "12-2")
        else:
            log(f"❌ FAILED: Raw '1234' matched {res} instead of U2({u2.id})", "12-2")
    except Exception as e:
        log(f"❌ FAILED: Raw '1234' raised exception: {e}", "12-2")

    # 12-2.3: Explicit Prefix
    try:
        # uid:
        res = resolve_user_id_by_identifier(db, f"uid:{u1.id}")
        assert res == u1.id
        log(f"✅ PASSED: uid:{u1.id} -> {res}", "12-1")

        # tgid:
        res = resolve_user_id_by_identifier(db, f"tgid:{u1.telegram_id}")
        assert res == u1.id
        log(f"✅ PASSED: tgid:{u1.telegram_id} -> {res}", "12-1")
    except Exception as e:
        log(f"❌ FAILED: Prefix Search Failed: {e}", "12-1")

def verify_section_10_so_t_priority(db, u1):
    """
    Section 10 & 19: Priority Check (Nickname > RealName > Username > External)
    """
    header("10. SoT Search Priority")
    
    # We need a user where these fields might conflict or ensure visibility order.
    # U1: Nick="audit_complex", Real="Real U1", User="audit_u1", CC="cc_u1..."
    
    # 10-1. Nickname
    try:
        res = resolve_user_id_by_identifier(db, "audit_complex")
        assert res == u1.id
        log("✅ PASSED: Priority 1 - Nickname Match", "10-1")
    except: log("❌ FAILED: Nickname Match", "10-1")

    # 10-2. Real Name
    try:
        res = resolve_user_id_by_identifier(db, "Real U1")
        assert res == u1.id
        log("✅ PASSED: Priority 2 - Real Name Match", "10-1")
    except: log("❌ FAILED: Real Name Match", "10-1")

    # 10-3. Username (clean)
    try:
        res = resolve_user_id_by_identifier(db, "audit_u1")
        assert res == u1.id
        log("✅ PASSED: Priority 3 - Username Match (No @)", "10-1")
    except: log("❌ FAILED: Username Match", "10-1")

    # 10-4. CC ID
    try:
        res = resolve_user_id_by_identifier(db, "cc_u1_10001")
        assert res == u1.id
        log("✅ PASSED: Priority 5 - CC ID Match", "10-1")
    except: log("❌ FAILED: CC ID Match", "10-1")

def verify_section_12_extended_search(db, u1):
    """
    Section 12-2 Extended Search (Phone, Tag, Memo, Name constraint)
    """
    header("12-2. Extended Search Capabilities")
    
    # Phone
    try:
        res = resolve_user_id_by_identifier(db, "phone:010-1111-1111")
        assert res == u1.id
        log("✅ PASSED: phone: prefix", "12-2")
    except: log("❌ FAILED: phone: prefix", "12-2")

    # Tag
    try:
        res = resolve_user_id_by_identifier(db, "tag:VIP")
        assert res == u1.id
        log("✅ PASSED: tag: prefix (Internal match)", "12-2")
    except Exception as e: log(f"❌ FAILED: tag: prefix - {e}", "12-2")

    # Memo
    try:
        res = resolve_user_id_by_identifier(db, "memo:Audit") # Partial match "Audit Memo Check"
        assert res == u1.id
        log("✅ PASSED: memo: prefix (Partial match)", "12-2")
    except: log("❌ FAILED: memo: prefix", "12-2")

    # Name (Explicit)
    try:
        res = resolve_user_id_by_identifier(db, "name:Real U1")
        assert res == u1.id
        log("✅ PASSED: name: prefix", "12-2")
    except: log("❌ FAILED: name: prefix", "12-2")

def verify_section_18_conflict(db):
    """
    Section 18-2 Conflict Handling
    """
    header("18-2. Conflict Handling (409)")
    
    # "Duplicate Name" is shared by U3 and U4
    try:
        resolve_user_id_by_identifier(db, "Duplicate Name") # Should fallback to RealName search -> find 2 matches
        log("❌ FAILED: Expected 409 for duplicate Name, but got success", "18-2")
    except Exception as e:
        if "409" in str(e):
            log("✅ PASSED: Duplicate Real Name -> 409 AMBIGUOUS", "18-2")
        else:
            log(f"❌ FAILED: Expected 409, got {e}", "18-2")

def verify_section_14_import_logic(db):
    """
    Section 14: CSV Import Logic (Creation, Tagging, SoT)
    """
    header("14. Import Logic & Data Integrity")
    
    # Data to import
    # 1. New User (Should be created with CSV_IMPORT tag)
    # 2. Existing User U1 (Should NOT overwrite nickname, Should append tag)
    
    new_tg_user = f"import_new_{uuid.uuid4().hex[:6]}"
    
    import_rows = [
        # New User
        {
            "user_id": None,
            "external_id": None,
            "telegram": new_tg_user,
            "telegram_id": None,
            "real_name": "Imported New",
            "level": 1, 
            "xp": 0
        },
        # Existing U1 (Try to overwrite locked fields)
        {
            "user_id": None, # Resolve by external_id
            "external_id": "cc_u1_10001",
            "telegram": "audit_u1",
            "telegram_id": None,
            "real_name": "Updated RealName", # Update allowed
            "nickname": "SHOULD_NOT_UPDATE", # SoT Violation Check
            "level": 99,
            "xp": 999
        }
    ]
    
    # Emulate Service Loop
    # We call solve_and_sync directly
    log("Running Import Simulation...", "14")
    
    # 1. New User
    res_new = UserSegmentService.resolve_and_sync_user_from_import(db, import_rows[0])
    if not res_new.get("success"):
        log(f"❌ FAILED: New User Import Failed - {res_new}", "14")
        raise Exception(f"Import Failed: {res_new}")
    
    u_new = db.query(User).get(res_new['user_id'])
    p_new = db.query(AdminUserProfile).filter_by(user_id=u_new.id).first()
    
    # Checks
    if "CSV_IMPORT" in (p_new.tags or []):
        log("✅ PASSED: New User Tagged 'CSV_IMPORT'", "14")
    else:
        log(f"❌ FAILED: New User Tags: {p_new.tags}", "14")
        
    # 2. Existing U1
    res_exist = UserSegmentService.resolve_and_sync_user_from_import(db, import_rows[1])
    # Re-fetch U1
    u1_reload = db.query(User).filter_by(external_id="cc_u1_10001").first()
    p1_reload = db.query(AdminUserProfile).filter_by(user_id=u1_reload.id).first()
    
    # Checks
    if u1_reload.nickname == "audit_complex":
        log("✅ PASSED: Nickname Preserved (SoT Protection)", "14")
    else:
        log(f"❌ FAILED: Nickname overwritten to '{u1_reload.nickname}'", "14")
        
    if p1_reload.real_name == "Updated RealName":
         log("✅ PASSED: Real Name Updated (Allowed)", "14")
    else:
         log("❌ FAILED: Real Name Not Updated", "14")

def main():
    db = SessionLocal()
    try:
        u1, u2, u3, u4 = setup_fresh_data(db)
        
        verify_section_12_numeric_policy(db, u1, u2)
        verify_section_10_so_t_priority(db, u1)
        verify_section_12_extended_search(db, u1)
        verify_section_18_conflict(db)
        verify_section_14_import_logic(db)
        
        header("ALL SECTIONS VERIFIED")
    except Exception as e:
        logger.error(f"FATAL: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
