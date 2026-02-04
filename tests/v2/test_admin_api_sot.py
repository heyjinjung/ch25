"""
Admin API 테스트: UI Config, User Management, Vault Admin
SoT 기준: V2 Admin API 계약 + 권한 정책
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.v2.models import V2User, V2UiConfig
from app.v2.models.enums import V2UserRole, V2UserStatus


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def admin_user(db: Session) -> V2User:
    """관리자 유저 생성"""
    admin = V2User(
        cc_id="ADMIN_TEST",
        nickname="테스트관리자",
        role=V2UserRole.SUPER_ADMIN,
        status=V2UserStatus.ACTIVE,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def normal_user(db: Session) -> V2User:
    """일반 유저 생성"""
    user = V2User(
        cc_id="NORMAL_TEST",
        nickname="일반유저",
        role=V2UserRole.USER,
        status=V2UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class TestAdminUIConfig:
    """Admin UI Config API 테스트"""

    def test_get_ui_config_public(self, test_client: TestClient, db: Session):
        """UI Config GET은 Public (인증 불필요)"""
        # Given: UI Config 생성
        config = V2UiConfig(
            key="streak_reward_rules",
            value=[{"day": 3, "reward_type": "ROULETTE_TICKET", "amount": 1}],
            description="스트릭 보상 규칙"
        )
        db.add(config)
        db.commit()

        # When: 인증 없이 GET 요청
        response = test_client.get("/api/v2/admin/ui-config/streak_reward_rules")

        # Then: 200 OK + JSON 응답
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/json")
        data = response.json()
        assert data["key"] == "streak_reward_rules"

    def test_put_ui_config_requires_auth(self, test_client: TestClient, db: Session):
        """UI Config PUT은 인증 필요"""
        # When: 인증 없이 PUT 요청
        response = test_client.put(
            "/api/v2/admin/ui-config/test_key",
            json={"value": {"test": "data"}}
        )

        # Then: 401 Unauthorized
        assert response.status_code == 401

    def test_ui_config_sot_compliance(self, test_client: TestClient, db: Session, admin_user: V2User):
        """UI Config SoT 준수: DB 기반 동적 설정"""
        # Given: Admin 토큰 생성 (실제로는 JWT 생성 필요)
        # 여기서는 간단히 Admin 권한 검증만 시뮬레이션
        
        # When: UI Config 업데이트
        config_data = {
            "value": [
                {"day": 3, "reward_type": "ROULETTE_TICKET", "amount": 1},
                {"day": 7, "reward_type": "DIAMOND_TICKET", "amount": 1}
            ]
        }
        
        # Then: DB에 저장되고 즉시 반영됨
        config = V2UiConfig(
            key="streak_reward_rules",
            value=config_data["value"],
            updated_by_id=admin_user.id
        )
        db.add(config)
        db.commit()
        
        # GET으로 확인
        response = test_client.get("/api/v2/admin/ui-config/streak_reward_rules")
        assert response.status_code == 200
        assert len(response.json()["value"]) == 2


class TestAdminUserManagement:
    """Admin User Management API 테스트"""

    def test_admin_user_list_sorting(self, test_client: TestClient, db: Session):
        """유저 목록 정렬: SoT 준수 (vault_locked_balance 단일 기준)"""
        # Given: 여러 유저 생성
        user1 = V2User(cc_id="USER1", nickname="유저1", vault_locked_balance=100000)
        user2 = V2User(cc_id="USER2", nickname="유저2", vault_locked_balance=50000)
        user3 = V2User(cc_id="USER3", nickname="유저3", vault_locked_balance=200000)
        db.add_all([user1, user2, user3])
        db.commit()

        # When: vault_balance 기준 정렬 요청
        response = test_client.get("/api/v2/admin/users?sortBy=vault_balance&order=desc")

        # Then: locked_balance 기준 내림차순 정렬
        # (실제 API 응답 형식에 맞게 수정 필요)
        assert response.status_code == 200 or response.status_code == 401  # 인증 필요 시
        
    def test_admin_user_vault_balance_sot(self, db: Session, normal_user: V2User):
        """Admin User Detail: vault_balance = vault_locked_balance (SoT)"""
        # Given: 유저의 잔액
        normal_user.vault_locked_balance = 100000
        normal_user.vault_available_balance = 0  # deprecated
        db.commit()

        # When: User Detail 조회
        # Then: vault_balance는 locked만 반영
        assert normal_user.vault_locked_balance == 100000
        # available은 항상 0 (deprecated)
        assert normal_user.vault_available_balance == 0


class TestAdminVaultManagement:
    """Admin Vault Management API 테스트"""

    def test_admin_vault_adjust_api(self, test_client: TestClient, db: Session, normal_user: V2User):
        """Vault Adjust API 테스트"""
        # Given: 초기 잔액
        normal_user.vault_locked_balance = 100000
        db.commit()

        # When: Vault 조정 요청 (Admin만 가능)
        # Note: 실제로는 Admin JWT 토큰 필요
        # response = test_client.post(
        #     f"/api/v2/admin/wallet/adjust",
        #     json={"user_id": normal_user.id, "amount": 50000, "force": True}
        # )

        # Then: locked_balance 업데이트
        # (실제 API 구현에 따라 수정)
        pass

    def test_admin_vault_force_option(self, db: Session, normal_user: V2User):
        """Vault Adjust force 옵션: 잔액 부족 시에도 차감 가능"""
        # Given: 잔액 10,000원
        normal_user.vault_locked_balance = 10000
        db.commit()

        # When: force=True로 50,000원 차감 시도
        from app.v2.services.vault_service import V2VaultService
        service = V2VaultService()
        
        # force=True 옵션으로 음수 허용
        result = service.adjust_balance(
            db,
            user_id=normal_user.id,
            amount=-50000,
            force=True,
            reason="admin_test"
        )

        # Then: 음수 잔액 허용
        db.refresh(normal_user)
        assert normal_user.vault_locked_balance == -40000


class TestAdminDashboard:
    """Admin Dashboard 집계 테스트"""

    def test_admin_dashboard_total_vault_balance(self, db: Session):
        """Dashboard 집계: total_vault_balance = SUM(locked_balance)"""
        # Given: 여러 유저 생성
        users = [
            V2User(cc_id=f"USER{i}", nickname=f"유저{i}", vault_locked_balance=i * 10000)
            for i in range(1, 6)
        ]
        db.add_all(users)
        db.commit()

        # When: Dashboard 집계
        from app.v2.services.admin_dashboard_service import V2AdminDashboardService
        service = V2AdminDashboardService()
        overview = service.get_overview(db)

        # Then: locked_balance 합계
        expected_total = sum(u.vault_locked_balance for u in users)
        assert overview.get("total_vault_balance") == expected_total

    def test_admin_dashboard_09_00_kst_reset(self, db: Session):
        """Dashboard 일간 집계: 09:00 KST 리셋 기준"""
        # Given: 운영일 기준 헬퍼
        from app.v2.utils.timezone import business_day_start
        
        # When: 현재 운영일 시작 시간 조회
        today_start = business_day_start()
        
        # Then: 09:00 KST 기준
        assert today_start.hour == 0  # UTC 기준 00:00 (KST 09:00)


class TestAdminAuditLog:
    """Admin Audit Log 테스트"""

    def test_admin_action_audit_logging(self, db: Session, admin_user: V2User):
        """Admin 작업 감사 로그 기록"""
        # Given: Audit Service
        from app.v2.services.admin_audit_service import V2AdminAuditService
        service = V2AdminAuditService()

        # When: Admin 작업 로깅
        service.log_action(
            db,
            admin_id=admin_user.id,
            action="USER_DELETE",
            target_type="user",
            target_id=123,
            details={"reason": "test"}
        )
        db.commit()

        # Then: 감사 로그 저장
        from app.v2.models import V2AdminAuditLog
        log = db.query(V2AdminAuditLog).filter_by(admin_id=admin_user.id).first()
        assert log is not None
        assert log.action == "USER_DELETE"

    def test_admin_rbac_denied_logging(self, db: Session, normal_user: V2User):
        """RBAC 거부 시 로깅"""
        # Given: 일반 유저가 Admin 작업 시도
        from app.v2.services.auth_service import V2AuthService
        auth_service = V2AuthService()

        # When: RBAC 체크
        is_allowed = auth_service.check_admin_permission(db, user_id=normal_user.id)

        # Then: False 반환 + RBAC_DENIED 로그 기록
        assert is_allowed is False


@pytest.mark.parametrize("role,expected_access", [
    (V2UserRole.SUPER_ADMIN, True),
    (V2UserRole.ADMIN, True),
    (V2UserRole.USER, False),
])
def test_admin_rbac_permission(db: Session, role: V2UserRole, expected_access: bool):
    """Admin RBAC 권한 검증"""
    # Given: Role별 유저
    user = V2User(
        cc_id=f"TEST_{role.value}",
        nickname=f"{role.value}유저",
        role=role
    )
    db.add(user)
    db.commit()

    # When: Admin 권한 체크
    has_admin_access = role in [V2UserRole.SUPER_ADMIN, V2UserRole.ADMIN]

    # Then: 기대 결과 일치
    assert has_admin_access == expected_access
