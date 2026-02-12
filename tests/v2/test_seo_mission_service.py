
import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.v2.services.seo_code_service import V2SeoCodeService
from app.v2.models.core.seo_daily_code import SeoDailyCode, UserSeoDailyCodeClaim
from app.v2.models.user import V2User

KST = ZoneInfo("Asia/Seoul")

@pytest.fixture
def seo_service(db_session: Session):
    return V2SeoCodeService(db_session)

@pytest.fixture
def test_user(db_session: Session, base_user: V2User):
    # base_user is already created by conftest fixture
    return base_user

def test_generate_and_get_daily_code(db_session: Session, seo_service: V2SeoCodeService):
    """일일 코드 생성 및 조회 테스트"""
    today = datetime.now(KST).date()
    
    # 1. 처음 생성
    code_obj = seo_service.generate_daily_code(db_session, today)
    assert code_obj is not None
    assert code_obj.target_date == today
    assert len(code_obj.code) > 0
    
    # 2. 동일 날짜 재생성 시도 -> 기존 코드 반환
    code_obj_2 = seo_service.generate_daily_code(db_session, today)
    assert code_obj.id == code_obj_2.id
    assert code_obj.code == code_obj_2.code
    
    # 3. get_today_code 확인
    today_code = seo_service.get_today_code()
    assert today_code is not None
    assert today_code.id == code_obj.id

def test_claim_code_success(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """코드 입력 성공 테스트"""
    today = datetime.now(KST).date()
    code_obj = seo_service.generate_daily_code(db_session, today)
    
    # 정상 입력
    result = seo_service.claim_code(test_user.id, code_obj.code)
    
    assert result["success"] is True
    assert result["reward_amount"] is not None
    assert result["reward_amount"] >= code_obj.reward_min
    assert result["reward_amount"] <= code_obj.reward_max
    
    # DB 기록 확인
    claim_record = db_session.query(UserSeoDailyCodeClaim).filter_by(
        user_id=test_user.id, 
        seo_code_id=code_obj.id
    ).first()
    assert claim_record is not None
    assert claim_record.reward_amount == result["reward_amount"]

def test_claim_code_case_insensitive(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """대소문자 구분 없이 처리되는지 테스트"""
    today = datetime.now(KST).date()
    code_obj = seo_service.generate_daily_code(db_session, today)
    
    # 소문자로 입력
    lower_code = code_obj.code.lower()
    
    # 이미 위에서 base_user가 claim 했을 수 있으므로, 새로운 유저 생성 필요하거나 
    # 독립적인 테스트 실행을 위해 rollback이 보장되어야 함 via test_db_session
    
    result = seo_service.claim_code(test_user.id, lower_code)
    assert result["success"] is True

def test_claim_code_invalid(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """잘못된 코드 입력 시 실패"""
    today = datetime.now(KST).date()
    seo_service.generate_daily_code(db_session, today)
    
    with pytest.raises(ValueError, match="INVALID_CODE"):
        seo_service.claim_code(test_user.id, "INVALID_CODE_123")

def test_claim_code_already_claimed(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """중복 참여 테스트"""
    today = datetime.now(KST).date()
    code_obj = seo_service.generate_daily_code(db_session, today)
    
    # 1회차 성공
    seo_service.claim_code(test_user.id, code_obj.code)
    
    # 2회차 실패 (같은 코드)
    with pytest.raises(ValueError, match="ALREADY_CLAIMED"):
        seo_service.claim_code(test_user.id, code_obj.code)

def test_claim_daily_limit_different_codes(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """하루 1회 제한 테스트 (만약 하루에 코드가 여러 개일리는 없지만, 로직 상 하루 제한 체크)"""
    today = datetime.now(KST).date()
    code_obj = seo_service.generate_daily_code(db_session, today)
    
    # 1회차 성공
    seo_service.claim_code(test_user.id, code_obj.code)
    
    # 강제로 다른 코드 생성 (테스트 목적 DB 조작)
    fake_code = SeoDailyCode(
        code="FAKE_CODE",
        target_date=today,
        reward_min=100,
        reward_max=200
    )
    db_session.add(fake_code)
    db_session.commit()
    
    # 다른 코드지만 같은 날짜 -> 실패해야 함
    # get_status_by_date 로직에 따라 결정됨
    with pytest.raises(ValueError, match="DAILY_LIMIT_REACHED"):
         seo_service.claim_code(test_user.id, "FAKE_CODE")

def test_claim_expired_code(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """만료된 코드(어제 날짜) 테스트"""
    today = datetime.now(KST).date()
    yesterday = today - timedelta(days=1)
    
    # 어제 코드 생성
    yesterday_code = SeoDailyCode(
        code="YESTERDAY_CODE",
        target_date=yesterday,
        reward_min=100,
        reward_max=200
    )
    db_session.add(yesterday_code)
    db_session.commit()
    
    # 어제 코드로 오늘 시도 -> 만료 에러
    with pytest.raises(ValueError, match="CODE_EXPIRED"):
        seo_service.claim_code(test_user.id, "YESTERDAY_CODE")

def test_get_status_by_date(db_session: Session, seo_service: V2SeoCodeService, test_user: V2User):
    """상태 조회 테스트"""
    today = datetime.now(KST).date()
    seo_service.generate_daily_code(db_session, today)
    
    # 아직 안함
    status = seo_service.get_today_status(test_user.id)
    assert status["has_claimed_today"] is False
    assert status["reward_amount"] is None
    
    # 참여
    code = seo_service.get_today_code().code
    seo_service.claim_code(test_user.id, code)
    
    # 참여 후
    status = seo_service.get_today_status(test_user.id)
    assert status["has_claimed_today"] is True
    assert status["reward_amount"] is not None
