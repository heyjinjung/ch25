
import pytest
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.v2.services.seo_code_service import V2SeoCodeService
from app.v2.models.core.seo_daily_code import SeoDailyCode

KST = ZoneInfo("Asia/Seoul")

def test_api_claim_seo_code_success(test_client, user_token, db_session):
    """API: 코드 입력 성공"""
    # 1. 오늘 코드 생성
    today = datetime.now(KST).date()
    service = V2SeoCodeService(db_session)
    code_obj = service.generate_daily_code(db_session, today)
    
    # 2. API 호출
    headers = {"Authorization": f"Bearer {user_token}"}
    payload = {"code": code_obj.code}
    
    response = test_client.post("/api/v2/seo-mission/claim", json=payload, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["reward_amount"] is not None

import os
from app.core.config import get_settings

def test_api_claim_seo_code_no_auth(test_client, db_session):
    """API: 인증 없이 코드 입력 -> 401"""
    # Force Disable TEST_MODE to test 401
    original_mode = os.environ.get("TEST_MODE")
    os.environ["TEST_MODE"] = "0"
    get_settings.cache_clear()
    
    try:
        today = datetime.now(KST).date()
        service = V2SeoCodeService(db_session)
        code_obj = service.generate_daily_code(db_session, today)

        response = test_client.post("/api/v2/seo-mission/claim", json={"code": code_obj.code})
        assert response.status_code == 401
    finally:
        # Restore TEST_MODE
        if original_mode is not None:
            os.environ["TEST_MODE"] = original_mode
        else:
            del os.environ["TEST_MODE"]
        get_settings.cache_clear()

def test_api_claim_invalid_code(test_client, user_token, db_session):
    """API: 잘못된 코드 입력 -> 404"""
    # 오늘 코드 생성 (to ensure service is ready)
    today = datetime.now(KST).date()
    service = V2SeoCodeService(db_session)
    service.generate_daily_code(db_session, today)
    
    headers = {"Authorization": f"Bearer {user_token}"}
    response = test_client.post("/api/v2/seo-mission/claim", json={"code": "INVALID"}, headers=headers)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "INVALID_CODE"

def test_api_claim_already_claimed(test_client, user_token, db_session):
    """API: 중복 입력 -> 400"""
    today = datetime.now(KST).date()
    service = V2SeoCodeService(db_session)
    code_obj = service.generate_daily_code(db_session, today)
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 1회차
    test_client.post("/api/v2/seo-mission/claim", json={"code": code_obj.code}, headers=headers)
    
    # 2회차
    response = test_client.post("/api/v2/seo-mission/claim", json={"code": code_obj.code}, headers=headers)
    
    assert response.status_code == 400
    assert response.json()["detail"] == "ALREADY_CLAIMED"

def test_api_get_status(test_client, user_token, db_session):
    """API: 상태 조회"""
    today = datetime.now(KST).date()
    service = V2SeoCodeService(db_session)
    service.generate_daily_code(db_session, today)
    
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 1. 초기 상태 (안함)
    response = test_client.get("/api/v2/seo-mission/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["has_claimed_today"] is False
    assert data["reward_amount"] is None

def test_api_public_hint(test_client, db_session):
    """API: 공개 힌트 (비인증)"""
    today = datetime.now(KST).date()
    service = V2SeoCodeService(db_session)
    code_obj = service.generate_daily_code(db_session, today)
    
    response = test_client.get("/api/v2/seo-mission/public/today-hint")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == code_obj.code
