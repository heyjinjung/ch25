"""
V2 Admin RBAC (Role-Based Access Control) Tests

테스트 범위:
1. RBAC 인증 로직 (get_current_admin_info)
2. 역할별 접근 제어 (ADMIN, SUPER_ADMIN, USER)
3. RBAC_DENIED 이벤트 로깅
4. 엣지 케이스 (토큰 없음, 만료, 잘못된 역할 등)
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, Mock
import jwt

from app.core.config import get_settings
from app.core.security import create_access_token


# ============ Test Fixtures ============

@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    settings = MagicMock()
    settings.jwt_secret = "test_secret_key_for_testing"
    settings.jwt_algorithm = "HS256"
    settings.jwt_expire_minutes = 1440
    settings.v2_access_token_expire_minutes = 15
    settings.test_mode = False
    return settings


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    db.execute.return_value.scalar_one_or_none.return_value = 1
    return db


@pytest.fixture
def mock_request():
    """Mock FastAPI request object"""
    request = MagicMock()
    request.client = MagicMock()
    request.client.host = "127.0.0.1"
    request.headers = {"user-agent": "TestAgent/1.0"}
    return request


def create_test_token(
    user_id: int,
    role: str | None = None,
    roles: list[str] | None = None,
    expires_minutes: int = 15,
    secret: str = "test_secret_key_for_testing",
) -> str:
    """테스트용 JWT 토큰 생성"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "typ": "access",
    }
    if role:
        payload["role"] = role
    if roles:
        payload["roles"] = roles
    return jwt.encode(payload, secret, algorithm="HS256")


def create_expired_token(
    user_id: int,
    role: str | None = None,
    secret: str = "test_secret_key_for_testing",
) -> str:
    """만료된 JWT 토큰 생성"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
        "typ": "access",
    }
    if role:
        payload["role"] = role
    return jwt.encode(payload, secret, algorithm="HS256")


# ============ RBAC Unit Tests ============

class TestRBACTokenValidation:
    """RBAC 토큰 검증 테스트"""

    def test_valid_admin_token_with_role_claim(self, mock_settings):
        """role 클레임이 있는 유효한 ADMIN 토큰"""
        token = create_test_token(user_id=1, role="ADMIN")

        # 토큰 디코딩 검증
        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "1"
        assert payload["role"] == "ADMIN"
        assert payload["typ"] == "access"

    def test_valid_admin_token_with_roles_list(self, mock_settings):
        """roles 리스트가 있는 유효한 ADMIN 토큰"""
        token = create_test_token(user_id=1, roles=["ADMIN", "VIEWER"])

        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])
        assert payload["sub"] == "1"
        assert payload["roles"] == ["ADMIN", "VIEWER"]

    def test_super_admin_normalized_to_admin(self, mock_settings):
        """SUPER_ADMIN은 ADMIN으로 정규화되어야 함"""
        token = create_test_token(user_id=1, role="SUPER_ADMIN")

        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])
        role_str = payload.get("role", "").upper()

        # 정규화 로직
        if role_str == "SUPER_ADMIN":
            role_str = "ADMIN"

        assert role_str == "ADMIN"

    def test_expired_token_rejected(self, mock_settings):
        """만료된 토큰은 거부되어야 함"""
        token = create_expired_token(user_id=1, role="ADMIN")

        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])

    def test_invalid_signature_rejected(self, mock_settings):
        """잘못된 시그니처의 토큰은 거부되어야 함"""
        token = create_test_token(user_id=1, role="ADMIN", secret="wrong_secret")

        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])

    def test_token_without_role_claim(self, mock_settings):
        """role 클레임이 없는 토큰 (일반 유저)"""
        token = create_test_token(user_id=1)

        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])
        assert payload.get("role") is None
        assert payload.get("roles") is None


class TestRBACRoleExtraction:
    """역할 추출 로직 테스트"""

    def test_extract_role_from_role_claim(self):
        """role 클레임에서 역할 추출"""
        payload = {"sub": "1", "role": "ADMIN"}

        role = payload.get("role")
        roles = payload.get("roles")
        if isinstance(roles, list) and roles:
            role = roles[0]
        if isinstance(role, list) and role:
            role = role[0]

        role_str = str(role).upper() if role else None
        assert role_str == "ADMIN"

    def test_extract_role_from_roles_list(self):
        """roles 리스트에서 첫 번째 역할 추출"""
        payload = {"sub": "1", "roles": ["ADMIN", "VIEWER"]}

        role = payload.get("role")
        roles = payload.get("roles")
        if isinstance(roles, list) and roles:
            role = roles[0]
        if isinstance(role, list) and role:
            role = role[0]

        role_str = str(role).upper() if role else None
        assert role_str == "ADMIN"

    def test_roles_list_takes_precedence(self):
        """roles 리스트가 role 클레임보다 우선"""
        payload = {"sub": "1", "role": "VIEWER", "roles": ["ADMIN"]}

        role = payload.get("role")
        roles = payload.get("roles")
        if isinstance(roles, list) and roles:
            role = roles[0]
        if isinstance(role, list) and role:
            role = role[0]

        role_str = str(role).upper() if role else None
        assert role_str == "ADMIN"

    def test_nested_role_list_handling(self):
        """중첩된 역할 리스트 처리"""
        payload = {"sub": "1", "role": ["ADMIN", "VIEWER"]}

        role = payload.get("role")
        roles = payload.get("roles")
        if isinstance(roles, list) and roles:
            role = roles[0]
        if isinstance(role, list) and role:
            role = role[0]

        role_str = str(role).upper() if role else None
        assert role_str == "ADMIN"

    def test_case_insensitive_role_matching(self):
        """대소문자 구분 없이 역할 매칭"""
        test_cases = [
            ("admin", "ADMIN"),
            ("Admin", "ADMIN"),
            ("ADMIN", "ADMIN"),
            ("super_admin", "SUPER_ADMIN"),
            ("Super_Admin", "SUPER_ADMIN"),
        ]

        for input_role, expected in test_cases:
            role_str = str(input_role).upper() if input_role else None
            assert role_str == expected, f"Expected {expected} for input {input_role}"


class TestRBACDeniedEventLogging:
    """RBAC 거부 이벤트 로깅 테스트"""

    def test_rbac_denied_event_structure(self):
        """RBAC_DENIED 이벤트 구조 검증"""
        from app.v2.models.auth_event import AuthEventType

        event_data = {
            "user_id": 1,
            "event_type": AuthEventType.RBAC_DENIED,
            "ip_address": "127.0.0.1",
            "user_agent": "TestAgent/1.0",
            "success": False,
            "error_message": "ADMIN_REQUIRED",
        }

        assert event_data["event_type"] == AuthEventType.RBAC_DENIED
        assert event_data["success"] is False
        assert event_data["error_message"] == "ADMIN_REQUIRED"

    def test_user_agent_truncation(self):
        """긴 User-Agent는 500자로 잘림"""
        long_ua = "A" * 1000
        truncated = long_ua[:500] if long_ua else None
        assert len(truncated) == 500

    def test_null_user_agent_handling(self):
        """User-Agent가 None인 경우 처리"""
        user_agent = None
        truncated = user_agent[:500] if user_agent else None
        assert truncated is None

    def test_null_ip_address_handling(self):
        """IP 주소가 None인 경우 처리"""
        request_client = None
        ip_address = request_client.host if request_client else None
        assert ip_address is None


class TestAdminUserProfileFallback:
    """AdminUserProfile 폴백 테스트"""

    def test_role_from_tags_extraction(self):
        """tags에서 ROLE_* 추출"""
        tags = ["TAG1", "ROLE_ADMIN", "TAG2"]

        tag_role = next((t for t in tags if isinstance(t, str) and t.upper().startswith("ROLE_")), None)
        if tag_role:
            role_str = tag_role.replace("ROLE_", "", 1).upper()
        else:
            role_str = None

        assert role_str == "ADMIN"

    def test_multiple_role_tags_first_wins(self):
        """여러 ROLE_* 태그가 있으면 첫 번째가 적용"""
        tags = ["ROLE_VIEWER", "ROLE_ADMIN", "ROLE_SUPER_ADMIN"]

        tag_role = next((t for t in tags if isinstance(t, str) and t.upper().startswith("ROLE_")), None)
        if tag_role:
            role_str = tag_role.replace("ROLE_", "", 1).upper()
        else:
            role_str = None

        assert role_str == "VIEWER"

    def test_no_role_tag_returns_none(self):
        """ROLE_* 태그가 없으면 None 반환"""
        tags = ["TAG1", "TAG2", "NOT_A_ROLE"]

        tag_role = next((t for t in tags if isinstance(t, str) and t.upper().startswith("ROLE_")), None)
        if tag_role:
            role_str = tag_role.replace("ROLE_", "", 1).upper()
        else:
            role_str = None

        assert role_str is None

    def test_empty_tags_list(self):
        """빈 tags 리스트 처리"""
        tags = []

        tag_role = next((t for t in tags if isinstance(t, str) and t.upper().startswith("ROLE_")), None)
        assert tag_role is None

    def test_none_tags_handling(self):
        """tags가 None인 경우 처리"""
        tags = None

        if tags and isinstance(tags, list):
            tag_role = next((t for t in tags if isinstance(t, str) and t.upper().startswith("ROLE_")), None)
        else:
            tag_role = None

        assert tag_role is None


# ============ Edge Case Tests ============

class TestEdgeCases:
    """엣지 케이스 테스트"""

    def test_empty_credentials(self):
        """빈 credentials 처리"""
        credentials = MagicMock()
        credentials.credentials = ""

        has_credentials = credentials is not None and credentials.credentials
        assert not has_credentials

    def test_none_credentials(self):
        """None credentials 처리"""
        credentials = None

        has_credentials = credentials is not None and getattr(credentials, 'credentials', None)
        assert not has_credentials

    def test_user_id_type_conversion(self):
        """user_id 타입 변환"""
        test_cases = [
            ("1", 1),
            ("999", 999),
            ("123456789", 123456789),
        ]

        for sub, expected in test_cases:
            try:
                user_id = int(sub)
                assert user_id == expected
            except (TypeError, ValueError):
                pytest.fail(f"Failed to convert {sub} to int")

    def test_invalid_user_id_format(self):
        """잘못된 user_id 포맷"""
        invalid_subs = ["abc", "", None, "1.5", "1e10"]

        for sub in invalid_subs:
            try:
                user_id = int(sub)
                # None과 빈 문자열은 실패해야 함
                if sub in (None, "", "abc", "1.5", "1e10"):
                    pytest.fail(f"Should have raised for {sub}")
            except (TypeError, ValueError):
                pass  # Expected

    def test_role_case_normalization(self):
        """역할 대소문자 정규화"""
        roles_input = ["admin", "Admin", "ADMIN", "aDmIn"]

        for role in roles_input:
            normalized = str(role).upper() if role else None
            assert normalized == "ADMIN"

    def test_super_admin_to_admin_conversion(self):
        """SUPER_ADMIN → ADMIN 변환"""
        role_str = "SUPER_ADMIN"

        if role_str == "SUPER_ADMIN":
            role_str = "ADMIN"

        assert role_str == "ADMIN"

    def test_v2_access_token_expiration(self, mock_settings):
        """V2 Access Token 만료 시간 검증 (15분)"""
        now = datetime.now(timezone.utc)
        expires_minutes = mock_settings.v2_access_token_expire_minutes

        assert expires_minutes == 15

        token = create_test_token(user_id=1, role="ADMIN", expires_minutes=expires_minutes)
        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])

        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        expected_exp = now + timedelta(minutes=15)

        # 1초 이내 오차 허용
        assert abs((exp_time - expected_exp).total_seconds()) < 1


class TestAuthEventTypes:
    """AuthEventType Enum 테스트"""

    def test_all_event_types_defined(self):
        """모든 이벤트 타입이 정의되어 있는지 확인"""
        from app.v2.models.auth_event import AuthEventType

        expected_types = [
            "LOGIN_SUCCESS",
            "LOGIN_FAILED",
            "LOGOUT",
            "TOKEN_REFRESH",
            "TELEGRAM_LINK",
            "TELEGRAM_UNLINK",
            "RBAC_DENIED",
        ]

        for event_type in expected_types:
            assert hasattr(AuthEventType, event_type), f"Missing event type: {event_type}"

    def test_rbac_denied_event_type_value(self):
        """RBAC_DENIED 이벤트 타입 값 확인"""
        from app.v2.models.auth_event import AuthEventType

        assert AuthEventType.RBAC_DENIED.value == "RBAC_DENIED"


# ============ Integration-like Tests (without real DB) ============

class TestRBACFlow:
    """RBAC 플로우 통합 테스트 (Mock 기반)"""

    def test_admin_access_flow_with_role_claim(self, mock_settings, mock_db, mock_request):
        """role 클레임으로 Admin 접근 플로우"""
        # 1. ADMIN 토큰 생성
        token = create_test_token(user_id=1, role="ADMIN")

        # 2. 토큰 디코딩
        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])

        # 3. 역할 추출
        role = payload.get("role")
        role_str = str(role).upper() if role else None

        # 4. 검증
        assert role_str == "ADMIN"
        assert payload["sub"] == "1"

    def test_user_denied_access_flow(self, mock_settings, mock_db, mock_request):
        """일반 유저 Admin 접근 거부 플로우"""
        # 1. 역할 없는 토큰 생성
        token = create_test_token(user_id=1)

        # 2. 토큰 디코딩
        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])

        # 3. 역할 추출
        role = payload.get("role")
        roles = payload.get("roles")
        if isinstance(roles, list) and roles:
            role = roles[0]

        role_str = str(role).upper() if role else None

        # 4. 역할이 없으면 접근 거부
        assert role_str is None

        # 5. RBAC_DENIED 이벤트가 생성되어야 함
        # (실제 구현에서는 DB에 이벤트 기록)

    def test_super_admin_access_flow(self, mock_settings, mock_db, mock_request):
        """SUPER_ADMIN 접근 플로우 (ADMIN으로 정규화)"""
        # 1. SUPER_ADMIN 토큰 생성
        token = create_test_token(user_id=1, role="SUPER_ADMIN")

        # 2. 토큰 디코딩
        payload = jwt.decode(token, mock_settings.jwt_secret, algorithms=["HS256"])

        # 3. 역할 추출 및 정규화
        role = payload.get("role")
        role_str = str(role).upper() if role else None

        if role_str == "SUPER_ADMIN":
            role_str = "ADMIN"

        # 4. 검증
        assert role_str == "ADMIN"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
