import pytest
import hmac
import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from starlette.requests import Request
from fastapi.security import HTTPAuthorizationCredentials

from app.v2.core import telegram as v2_telegram
from app.v2.services.auth_service import V2AuthService, log_auth_event
from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType
from app.v2.models.refresh_token import V2UserRefreshToken
from app.v2.models.user import V2User
from app.core.config import get_settings

def test_telegram_hash_verification_logic(monkeypatch):
    """Telegram initData hash 검증 로직이 SoT(HMAC-SHA256)를 준수하는지 확인."""
    settings = get_settings()
    test_bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
    monkeypatch.setattr(settings, "telegram_bot_token", test_bot_token)
    
    # 1. 정상적인 data_check_string 생성 및 hash 계산 시뮬레이션
    vals = {
        "auth_date": "1706432000",
        "query_id": "AAHd9z9ZAAAAAN33P1n-2s28",
        "user": '{"id":1234567,"first_name":"Test","last_name":"User","username":"testuser","language_code":"en"}'
    }
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])
    
    secret_key = hmac.new(b"WebAppData", test_bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    # URL encoded init_data 형태 구성
    init_data_str = f"auth_date={vals['auth_date']}&query_id={vals['query_id']}&user={vals['user']}&hash={expected_hash}"
    
    # 2. 검증 함수 호출
    validated = v2_telegram.validate_init_data(init_data_str)
    assert validated["user"]["id"] == 1234567
    
    # 3. 조작된 hash 검증 실패 확인
    malicious_data = init_data_str.replace(expected_hash, "wronghash")
    with pytest.raises(ValueError, match="Invalid hash"):
        v2_telegram.validate_init_data(malicious_data)

def test_refresh_token_sliding_window_policy(db: Session):
    """Refresh Token 슬라이딩 윈도우(만료 7일 미만 시 갱신) 정책 검증."""
    # 유저 생성
    user = V2User(cc_id="test_sliding_user", nickname="slider")
    db.add(user)
    db.commit()
    
    # 1. 7일 넘게 남은 경우: Refresh Token 유지
    access_token_1, refresh_token_1, token_rec_1 = V2AuthService.issue_tokens(db, user.id)
    # 만료일을 10일 후로 강제 조정
    token_rec_1.expires_at = datetime.now(timezone.utc) + timedelta(days=10)
    db.commit()
    
    new_access, new_refresh, _user = V2AuthService.refresh_access_token(db, refresh_token_1)
    assert new_access is not None
    assert new_refresh is None # 7일 이상 남았으므로 갱신되지 않아야 함
    
    # 2. 7일 미만 남은 경우: Refresh Token 갱신
    token_rec_1.expires_at = datetime.now(timezone.utc) + timedelta(days=5)
    db.commit()
    
    new_access_2, new_refresh_2, _user2 = V2AuthService.refresh_access_token(db, refresh_token_1)
    assert new_access_2 is not None
    assert new_refresh_2 is not None # 7일 미만이므로 갱신되어야 함
    
    # 3. 기존 토큰은 revoked 되어야 함
    db.refresh(token_rec_1)
    assert token_rec_1.revoked_at is not None

def test_auth_event_logging_audit(db: Session):
    """인증 이벤트 로그(v2_user_auth_event) 기록 및 필드 검증."""
    user_id = 999
    ip = "1.2.3.4"
    ua = "Mozilla/5.0 (TestClient)"
    
    # 1. 성공 로그 기록
    log_auth_event(
        db,
        user_id=user_id,
        event_type=AuthEventType.LOGIN_SUCCESS,
        ip_address=ip,
        user_agent=ua,
        success=True
    )
    db.commit()
    
    log = db.query(V2UserAuthEvent).filter_by(user_id=user_id, event_type=AuthEventType.LOGIN_SUCCESS).first()
    assert log is not None
    assert log.ip_address == ip
    assert log.user_agent == ua
    assert log.success is True
    
    # 2. 실패 로그 기록
    log_auth_event(
        db,
        user_id=0,
        event_type=AuthEventType.LOGIN_FAILED,
        ip_address=ip,
        error_message="INVALID_HASH",
        success=False
    )
    db.commit()
    
    fail_log = db.query(V2UserAuthEvent).filter_by(event_type=AuthEventType.LOGIN_FAILED).first()
    assert fail_log is not None
    assert fail_log.user_id == 0
    assert fail_log.error_message == "INVALID_HASH"
    assert fail_log.success is False

def test_v2_access_token_expiry_settings():
    """V2 전용 Access Token 만료 시간(15분) 설정 검증."""
    settings = get_settings()
    # SoT 가이드에 15분으로 명시되어 있는지 확인
    assert settings.v2_access_token_expire_minutes == 15
    # 레거시는 1440분(24시간) 유지되는지 확인 (하위 호환)
    assert settings.jwt_expire_minutes == 1440

def test_rbac_denied_logging(db: Session):
    """권한 거부(403) 시 RBAC_DENIED 이벤트가 DB에 기록되어야 한다."""
    from app.v2.api.deps import get_current_admin_info
    from app.core.security import create_access_token

    # 1) 권한 없는 유저 생성
    user = V2User(cc_id="test_rbac_user", nickname="rbac", role="USER")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2) Bearer 토큰 생성 (sub=user.id, role=USER)
    token = create_access_token(int(user.id), role="USER", expires_minutes=15)
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    # 3) Request(클라이언트 IP/UA 포함) 구성
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/api/v2/admin/any",
        "headers": [(b"user-agent", b"AdminBot")],
        "client": ("1.1.1.1", 12345),
    }
    request = Request(scope)

    # 4) 403 발생 + RBAC_DENIED 로그 생성 확인
    with pytest.raises(HTTPException) as exc:
        get_current_admin_info(request=request, db=db, credentials=creds)

    assert exc.value.status_code == 403
    assert exc.value.detail == "ADMIN_REQUIRED"

    row = (
        db.query(V2UserAuthEvent)
        .filter(
            V2UserAuthEvent.user_id == int(user.id),
            V2UserAuthEvent.event_type == AuthEventType.RBAC_DENIED,
        )
        .order_by(V2UserAuthEvent.id.desc())
        .first()
    )
    assert row is not None
    assert row.ip_address == "1.1.1.1"
    assert row.user_agent == "AdminBot"
    assert row.success is False
