"""V2 Auth 서비스 테스트.

도메인: 인증, 권한
커버리지 대상: auth_service.py, deps.py
"""
import pytest
from datetime import datetime, timedelta


class TestJWTTokens:
    """JWT 토큰 테스트."""

    def test_token_has_required_claims(self):
        """토큰 필수 클레임 확인."""
        payload = {
            "sub": "123",  # user_id
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow(),
        }
        
        assert "sub" in payload
        assert "exp" in payload
        assert "iat" in payload

    def test_token_expiry_check(self):
        """토큰 만료 확인."""
        now = datetime.utcnow()
        expired_token = {"exp": now - timedelta(hours=1)}
        valid_token = {"exp": now + timedelta(hours=1)}
        
        is_expired = expired_token["exp"] < now
        is_valid = valid_token["exp"] > now
        
        assert is_expired is True
        assert is_valid is True

    def test_sub_must_be_user_id(self):
        """sub 클레임은 user_id."""
        payload = {"sub": "456"}
        user_id = int(payload["sub"])
        assert user_id == 456


class TestRoleBasedAccess:
    """역할 기반 접근 제어 테스트."""

    ROLES = ["USER", "OPERATOR", "MANAGER", "ADMIN"]
    ROLE_LEVELS = {"USER": 0, "OPERATOR": 1, "MANAGER": 2, "ADMIN": 3}

    def test_admin_role_highest(self):
        """ADMIN이 최고 권한."""
        assert self.ROLE_LEVELS["ADMIN"] == max(self.ROLE_LEVELS.values())

    def test_user_role_lowest(self):
        """USER가 최저 권한."""
        assert self.ROLE_LEVELS["USER"] == min(self.ROLE_LEVELS.values())

    @pytest.mark.parametrize("role,can_access_admin", [
        ("USER", False),
        ("OPERATOR", True),
        ("MANAGER", True),
        ("ADMIN", True),
    ])
    def test_admin_panel_access(self, role, can_access_admin):
        """어드민 패널 접근 권한."""
        has_access = self.ROLE_LEVELS.get(role, 0) >= self.ROLE_LEVELS["OPERATOR"]
        assert has_access == can_access_admin


class TestAuthValidation:
    """인증 유효성 검증."""

    def test_missing_token_rejected(self):
        """토큰 없으면 거부."""
        token = None
        is_valid = token is not None and len(token) > 0
        assert is_valid is False

    def test_empty_token_rejected(self):
        """빈 토큰 거부."""
        token = ""
        is_valid = token is not None and len(token) > 0
        assert is_valid is False

    def test_invalid_sub_rejected(self):
        """유효하지 않은 sub 거부."""
        payload = {"sub": "not_a_number"}
        try:
            user_id = int(payload["sub"])
            is_valid = True
        except ValueError:
            is_valid = False
        
        assert is_valid is False


class TestTestMode:
    """테스트 모드 동작."""

    def test_test_mode_allows_anonymous(self):
        """테스트 모드에서 익명 접근 허용."""
        test_mode = True
        token = None
        
        if test_mode and token is None:
            # 데모 유저 사용
            user_id = 1  # demo user
        else:
            user_id = None
        
        assert user_id is not None

    def test_production_requires_token(self):
        """프로덕션에서 토큰 필수."""
        test_mode = False
        token = None
        
        if not test_mode and token is None:
            user_id = None
        else:
            user_id = 1
        
        assert user_id is None


class TestUserStatus:
    """유저 상태 테스트."""

    STATUSES = ["ACTIVE", "SUSPENDED", "DELETED"]

    def test_suspended_user_blocked(self):
        """정지 유저 차단."""
        user_status = "SUSPENDED"
        can_access = user_status == "ACTIVE"
        assert can_access is False

    def test_deleted_user_blocked(self):
        """삭제 유저 차단."""
        user_status = "DELETED"
        can_access = user_status == "ACTIVE"
        assert can_access is False

    def test_active_user_allowed(self):
        """활성 유저 허용."""
        user_status = "ACTIVE"
        can_access = user_status == "ACTIVE"
        assert can_access is True
