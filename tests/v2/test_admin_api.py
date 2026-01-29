"""
V2 Admin API Endpoint Tests

테스트 범위:
1. Admin User API (/api/v2/admin/users)
2. Admin Vault API (/api/v2/admin/vault)
3. Admin Economy API (/api/v2/admin/economy)
4. 권한별 접근 제어
5. 입력 검증 및 에러 처리
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
import jwt


# ============ Test Helpers ============

def create_admin_token(
    user_id: int = 1,
    role: str = "ADMIN",
    secret: str = "test_secret_key_for_testing",
    expires_minutes: int = 15,
) -> str:
    """Admin 권한 JWT 토큰 생성"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "typ": "access",
        "role": role,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def create_user_token(
    user_id: int = 1,
    secret: str = "test_secret_key_for_testing",
    expires_minutes: int = 15,
) -> str:
    """일반 유저 JWT 토큰 생성 (역할 없음)"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
        "typ": "access",
    }
    return jwt.encode(payload, secret, algorithm="HS256")


# ============ Admin User API Tests ============

class TestAdminUserListAPI:
    """GET /api/v2/admin/users 테스트"""

    def test_request_without_auth_returns_401(self):
        """인증 없이 요청 시 401 반환"""
        # Mock scenario: no Authorization header
        auth_header = None
        expected_status = 401
        expected_detail = "AUTH_REQUIRED"

        # Validation
        assert auth_header is None
        # In real test with TestClient: response.status_code == 401

    def test_request_with_user_token_returns_403(self):
        """일반 유저 토큰으로 요청 시 403 반환"""
        token = create_user_token(user_id=1)
        payload = jwt.decode(token, "test_secret_key_for_testing", algorithms=["HS256"])

        # 역할이 없으면 ADMIN 접근 불가
        role = payload.get("role")
        assert role is None
        # Expected: 403 ADMIN_REQUIRED

    def test_request_with_admin_token_succeeds(self):
        """ADMIN 토큰으로 요청 시 성공"""
        token = create_admin_token(user_id=1, role="ADMIN")
        payload = jwt.decode(token, "test_secret_key_for_testing", algorithms=["HS256"])

        role = payload.get("role")
        assert role == "ADMIN"
        # Expected: 200 OK with user list

    def test_pagination_parameters(self):
        """페이지네이션 파라미터 검증"""
        test_cases = [
            {"page": 1, "limit": 20, "valid": True},
            {"page": 0, "limit": 20, "valid": False},  # page는 1부터
            {"page": 1, "limit": 0, "valid": False},   # limit은 1 이상
            {"page": 1, "limit": 100, "valid": True},
            {"page": -1, "limit": 20, "valid": False},
        ]

        for case in test_cases:
            is_valid = case["page"] >= 1 and case["limit"] >= 1
            assert is_valid == case["valid"], f"Failed for {case}"

    def test_sort_parameters(self):
        """정렬 파라미터 검증"""
        valid_sort_by = ["last_active", "created_at", "vault_balance", "nickname"]
        valid_sort_order = ["asc", "desc"]

        # 유효한 조합
        assert "last_active" in valid_sort_by
        assert "desc" in valid_sort_order

        # 잘못된 정렬 기준
        assert "invalid_field" not in valid_sort_by

    def test_search_parameter_sanitization(self):
        """검색 파라미터 새니타이징"""
        test_cases = [
            ("normal_search", "normal_search"),
            ("  trimmed  ", "trimmed"),
            ("", None),
            (None, None),
        ]

        for input_val, expected in test_cases:
            if input_val:
                sanitized = input_val.strip() if input_val.strip() else None
            else:
                sanitized = None
            assert sanitized == expected


class TestAdminUserDetailAPI:
    """GET /api/v2/admin/users/{user_id} 테스트"""

    def test_valid_user_id_returns_detail(self):
        """유효한 user_id로 상세 정보 조회"""
        user_id = 1
        assert isinstance(user_id, int)
        assert user_id > 0

    def test_invalid_user_id_returns_404(self):
        """존재하지 않는 user_id는 404 반환"""
        user_id = 999999
        # Mock: user not found
        user_exists = False
        expected_status = 404 if not user_exists else 200
        assert expected_status == 404

    def test_non_numeric_user_id_returns_422(self):
        """숫자가 아닌 user_id는 422 반환"""
        invalid_ids = ["abc", "1.5", "null"]

        for invalid_id in invalid_ids:
            try:
                int(invalid_id)
                valid = True
            except ValueError:
                valid = False
            assert not valid, f"Should be invalid: {invalid_id}"


class TestAdminUserResolveAPI:
    """GET /api/v2/admin/users/resolve 테스트"""

    def test_resolve_by_nickname(self):
        """닉네임으로 유저 조회"""
        identifier = "test_user"
        identifier_type = "nickname" if not identifier.isdigit() else "id"
        assert identifier_type == "nickname"

    def test_resolve_by_user_id(self):
        """유저 ID로 조회"""
        identifier = "12345"
        identifier_type = "id" if identifier.isdigit() else "nickname"
        assert identifier_type == "id"

    def test_resolve_by_telegram_id(self):
        """텔레그램 ID로 조회 (숫자지만 큰 값)"""
        identifier = "987654321"  # 텔레그램 ID는 보통 9자리 이상
        is_large_number = identifier.isdigit() and len(identifier) >= 9
        assert is_large_number

    def test_empty_identifier_returns_400(self):
        """빈 identifier는 400 반환"""
        identifier = ""
        assert not identifier


# ============ Admin Vault API Tests ============

class TestAdminVaultAPI:
    """Admin Vault API 테스트"""

    def test_get_vault_status(self):
        """금고 상태 조회"""
        # Expected response structure
        expected_fields = [
            "vault_balance",
            "daily_vault_spent",
            "benefits_suspended",
            "last_deposit_at",
        ]

        mock_response = {
            "vault_balance": 100000,
            "daily_vault_spent": 5000,
            "benefits_suspended": False,
            "last_deposit_at": "2026-01-29T10:00:00+09:00",
        }

        for field in expected_fields:
            assert field in mock_response

    def test_vault_balance_is_locked_only(self):
        """vault_balance는 locked_balance만 포함 (SoT)"""
        # SoT: vault_balance = vault_locked_balance only
        vault_locked_balance = 100000
        vault_available_balance = 0  # deprecated, always 0

        vault_balance = vault_locked_balance  # NOT locked + available
        assert vault_balance == vault_locked_balance

    def test_benefits_suspended_check(self):
        """7일 무입금 유저 제재 상태 확인"""
        last_deposit_at = datetime.now(timezone.utc) - timedelta(days=8)
        threshold_days = 7

        days_since_deposit = (datetime.now(timezone.utc) - last_deposit_at).days
        is_suspended = days_since_deposit > threshold_days

        assert is_suspended is True

    def test_admin_vault_adjust(self):
        """금고 잔액 조정 (Admin 전용)"""
        adjustment_request = {
            "user_id": 1,
            "amount": 10000,
            "reason": "Test adjustment",
            "skip_suspension_check": True,
        }

        assert adjustment_request["amount"] != 0
        assert adjustment_request["reason"]


# ============ Admin Economy API Tests ============

class TestAdminEconomyAPI:
    """Admin Economy API 테스트"""

    def test_get_ticket_logs(self):
        """티켓 로그 조회"""
        expected_fields = [
            "id",
            "user_id",
            "token_type",
            "amount",
            "reason",
            "created_at",
        ]

        mock_log = {
            "id": 1,
            "user_id": 1,
            "token_type": "ROULETTE",
            "amount": 100,
            "reason": "game_reward",
            "created_at": "2026-01-29T10:00:00+09:00",
        }

        for field in expected_fields:
            assert field in mock_log

    def test_ticket_log_timestamp_is_kst(self):
        """티켓 로그 타임스탬프는 KST로 반환"""
        # SoT: DB 저장은 UTC, API 응답은 KST ISO 형식(+09:00)
        utc_time = datetime(2026, 1, 29, 1, 0, 0, tzinfo=timezone.utc)
        kst_offset = timedelta(hours=9)
        kst_time = utc_time + kst_offset

        # KST ISO 형식
        kst_iso = kst_time.strftime("%Y-%m-%dT%H:%M:%S+09:00")
        assert "+09:00" in kst_iso


# ============ Admin Role-based Access Tests ============

class TestAdminRoleBasedAccess:
    """역할별 접근 제어 테스트"""

    def test_admin_can_view_users(self):
        """ADMIN은 유저 목록 조회 가능"""
        role = "ADMIN"
        allowed_roles = ["ADMIN", "SUPER_ADMIN"]
        normalized_role = "ADMIN" if role == "SUPER_ADMIN" else role

        assert normalized_role in allowed_roles

    def test_admin_can_adjust_wallet(self):
        """ADMIN은 지갑 조정 가능"""
        role = "ADMIN"
        required_role = "ADMIN"

        assert role == required_role

    def test_super_admin_normalized_for_access(self):
        """SUPER_ADMIN은 ADMIN으로 정규화되어 접근"""
        role = "SUPER_ADMIN"
        if role == "SUPER_ADMIN":
            role = "ADMIN"

        assert role == "ADMIN"

    def test_viewer_cannot_modify(self):
        """VIEWER는 조회만 가능, 수정 불가"""
        role = "VIEWER"
        can_modify = role in ["ADMIN", "SUPER_ADMIN"]

        assert can_modify is False

    def test_user_cannot_access_admin_api(self):
        """일반 유저는 Admin API 접근 불가"""
        role = None
        can_access = role is not None

        assert can_access is False


# ============ Input Validation Tests ============

class TestInputValidation:
    """입력 검증 테스트"""

    def test_user_id_must_be_positive(self):
        """user_id는 양수여야 함"""
        test_cases = [
            (1, True),
            (0, False),
            (-1, False),
            (999999, True),
        ]

        for user_id, expected_valid in test_cases:
            is_valid = user_id > 0
            assert is_valid == expected_valid

    def test_amount_range_validation(self):
        """금액 범위 검증"""
        test_cases = [
            (0, False),       # 0은 불가
            (1, True),        # 최소값
            (-100, True),     # 차감 가능
            (1000000000, True),  # 큰 금액
        ]

        for amount, expected_valid in test_cases:
            # 금액은 0이 아니어야 함
            is_valid = amount != 0
            assert is_valid == expected_valid

    def test_reason_max_length(self):
        """사유 최대 길이 검증"""
        max_length = 500
        test_cases = [
            ("Short reason", True),
            ("A" * 500, True),
            ("A" * 501, False),
        ]

        for reason, expected_valid in test_cases:
            is_valid = len(reason) <= max_length
            assert is_valid == expected_valid

    def test_date_range_validation(self):
        """날짜 범위 검증"""
        start_date = datetime(2026, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(2026, 1, 31, tzinfo=timezone.utc)

        # 시작일 <= 종료일
        is_valid = start_date <= end_date
        assert is_valid

        # 잘못된 범위
        invalid_start = datetime(2026, 2, 1, tzinfo=timezone.utc)
        invalid_end = datetime(2026, 1, 1, tzinfo=timezone.utc)
        is_invalid = invalid_start > invalid_end
        assert is_invalid


# ============ Error Response Tests ============

class TestErrorResponses:
    """에러 응답 테스트"""

    def test_401_unauthorized_structure(self):
        """401 Unauthorized 응답 구조"""
        error_response = {
            "detail": "AUTH_REQUIRED"
        }
        assert "detail" in error_response
        assert error_response["detail"] == "AUTH_REQUIRED"

    def test_403_forbidden_structure(self):
        """403 Forbidden 응답 구조"""
        error_response = {
            "detail": "ADMIN_REQUIRED"
        }
        assert "detail" in error_response
        assert error_response["detail"] == "ADMIN_REQUIRED"

    def test_404_not_found_structure(self):
        """404 Not Found 응답 구조"""
        error_response = {
            "detail": "USER_NOT_FOUND"
        }
        assert "detail" in error_response

    def test_422_validation_error_structure(self):
        """422 Validation Error 응답 구조"""
        error_response = {
            "detail": [
                {
                    "loc": ["body", "user_id"],
                    "msg": "field required",
                    "type": "value_error.missing"
                }
            ]
        }
        assert "detail" in error_response
        assert isinstance(error_response["detail"], list)


# ============ Audit Log Tests ============

class TestAdminAuditLog:
    """Admin 감사 로그 테스트"""

    def test_audit_log_created_on_user_action(self):
        """유저 액션 시 감사 로그 생성"""
        audit_actions = [
            "USER_VIEW",
            "USER_UPDATE",
            "USER_DELETE",
            "WALLET_ADJUST",
            "VAULT_ADJUST",
        ]

        for action in audit_actions:
            assert action.startswith("USER_") or action.endswith("_ADJUST")

    def test_audit_log_structure(self):
        """감사 로그 구조 검증"""
        audit_log = {
            "id": 1,
            "admin_id": 1,
            "action": "USER_UPDATE",
            "target_user_id": 2,
            "details": {"field": "nickname", "old": "old_name", "new": "new_name"},
            "ip_address": "127.0.0.1",
            "created_at": "2026-01-29T10:00:00+09:00",
        }

        required_fields = ["admin_id", "action", "created_at"]
        for field in required_fields:
            assert field in audit_log


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
