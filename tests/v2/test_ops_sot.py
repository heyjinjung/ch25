"""Ops domain unit and integration tests (SoT consistency)."""
import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.v2.models import AdminAuditLog
from app.v2.services import V2AdminAuditService
from app.main import app

class TestAdminAuditOps:
    """Admin Audit 명세 준수 테스트."""

    def test_audit_log_creation(self, db_session: Session):
        """감사 로그 생성 및 필드 저장 검증. (SoT 4.2)"""
        admin_id = 999
        action = "TEST_ACTION"
        target_type = "USER"
        target_id = "123"
        before = {"status": "ACTIVE"}
        after = {"status": "SUSPENDED"}

        log = V2AdminAuditService.log(
            db_session,
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before=before,
            after=after,
            auto_commit=True
        )

        assert log.id is not None
        assert log.admin_id == admin_id
        assert log.action == action
        assert log.target_type == target_type
        assert log.target_id == target_id
        assert log.before_json == before
        assert log.after_json == after

class TestHealthCheckOps:
    """시스템 헬스 체크 통합 테스트."""

    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_health_endpoint_basic(self, client):
        """기본 헬스 체크 엔드포인트 응답 검증. (Ops SoT 2.1)"""
        response = client.get("/api/v2/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    def test_health_db_endpoint(self, client):
        """DB 연결성 포함 헬스 체크 엔드포인트 검증. (Ops SoT 2.1)"""
        response = client.get("/api/v2/health/db")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
