"""
V2 Telegram Auth API 통합 테스트

실제 API 엔드포인트를 호출하여 인증 플로우 검증
"""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# 테스트용 Bot Token
TEST_BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890"


def generate_test_init_data(
    user_id: int = 987654321,
    username: str = "api_test_user",
    first_name: str = "API",
    last_name: str = "테스트",
    bot_token: str = TEST_BOT_TOKEN,
    auth_date: int | None = None,
    start_param: str | None = None,
) -> str:
    """테스트용 initData 생성"""
    if auth_date is None:
        auth_date = int(time.time())

    user_data = {
        "id": user_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "language_code": "ko",
    }

    data = {
        "user": json.dumps(user_data, separators=(",", ":")),
        "auth_date": str(auth_date),
        "query_id": "test_query_id",
    }

    if start_param:
        data["start_param"] = start_param

    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(data.items())])
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    data["hash"] = calculated_hash

    return urlencode(data)


@pytest.fixture
def test_client(test_db_session):
    """테스트용 FastAPI 클라이언트"""
    from app.main import app
    from app.api.deps import get_db

    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def mock_telegram_settings(monkeypatch):
    """Telegram Bot Token 설정 Mock"""
    from app.core.config import Settings

    original_get_settings = None

    def mock_get_settings():
        settings = Settings()
        settings.telegram_bot_token = TEST_BOT_TOKEN
        settings.test_mode = False
        return settings

    # app.v2.core.telegram 모듈의 get_settings를 mock
    monkeypatch.setattr("app.v2.core.telegram.get_settings", mock_get_settings)

    return TEST_BOT_TOKEN


class TestTelegramAuthEndpoint:
    """POST /api/v2/telegram/auth 테스트"""

    def test_new_user_creation(self, test_client, mock_telegram_settings, test_db_session):
        """신규 유저 생성 테스트"""
        unique_id = int(time.time() * 1000) % 10000000000
        init_data = generate_test_init_data(
            user_id=unique_id,
            username=f"new_user_{unique_id}",
            first_name="신규",
            last_name="유저",
            bot_token=TEST_BOT_TOKEN,
        )

        response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data, "start_param": None},
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert "refresh_token" in data
        assert data["is_new_user"] is True
        assert data["user"]["telegram_id"] == unique_id
        assert data["user"]["nickname"] == "신규 유저"
        assert data["user"]["cc_id"].startswith(f"tg_{unique_id}_")

    def test_existing_user_login(self, test_client, mock_telegram_settings, test_db_session):
        """기존 유저 로그인 테스트"""
        unique_id = int(time.time() * 1000) % 10000000000 + 1

        # 1. 첫 번째 로그인 (신규 유저 생성)
        init_data = generate_test_init_data(
            user_id=unique_id,
            username=f"existing_user_{unique_id}",
            bot_token=TEST_BOT_TOKEN,
        )

        response1 = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )
        assert response1.status_code == 200
        user_id = response1.json()["user"]["id"]
        assert response1.json()["is_new_user"] is True

        # 2. 두 번째 로그인 (기존 유저)
        init_data2 = generate_test_init_data(
            user_id=unique_id,
            username=f"existing_user_{unique_id}",
            bot_token=TEST_BOT_TOKEN,
        )

        response2 = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data2},
        )
        assert response2.status_code == 200
        assert response2.json()["is_new_user"] is False
        assert response2.json()["user"]["id"] == user_id

    def test_invalid_hash_rejected(self, test_client, mock_telegram_settings):
        """잘못된 hash 거부 테스트"""
        # 다른 Bot Token으로 서명
        init_data = generate_test_init_data(
            user_id=111222333,
            bot_token="wrong:bot:token",
        )

        response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )

        assert response.status_code == 400
        assert "Invalid hash" in response.json()["detail"]

    def test_missing_hash_rejected(self, test_client, mock_telegram_settings):
        """hash 누락 거부 테스트"""
        # hash 없는 initData
        init_data = "user=%7B%22id%22%3A123%7D&auth_date=1234567890"

        response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )

        assert response.status_code == 400
        assert "Missing hash" in response.json()["detail"]

    def test_referral_handling(self, test_client, mock_telegram_settings, test_db_session):
        """추천인 처리 테스트"""
        # 1. 추천인 유저 생성
        referrer_tg_id = int(time.time() * 1000) % 10000000000 + 100
        init_data_referrer = generate_test_init_data(
            user_id=referrer_tg_id,
            username="referrer",
            bot_token=TEST_BOT_TOKEN,
        )

        response_referrer = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data_referrer},
        )
        referrer_id = response_referrer.json()["user"]["id"]

        # 2. 추천받은 유저 생성 (start_param: ref_{referrer_id})
        new_user_tg_id = int(time.time() * 1000) % 10000000000 + 200
        init_data_new = generate_test_init_data(
            user_id=new_user_tg_id,
            username="referred_user",
            bot_token=TEST_BOT_TOKEN,
            start_param=f"ref_{referrer_id}",
        )

        response_new = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data_new, "start_param": f"ref_{referrer_id}"},
        )

        assert response_new.status_code == 200
        assert response_new.json()["is_new_user"] is True


class TestRefreshTokenEndpoint:
    """POST /api/v2/auth/refresh 테스트"""

    def test_refresh_access_token(self, test_client, mock_telegram_settings, test_db_session):
        """Access Token 갱신 테스트"""
        # 1. 로그인하여 토큰 획득
        unique_id = int(time.time() * 1000) % 10000000000 + 300
        init_data = generate_test_init_data(
            user_id=unique_id,
            bot_token=TEST_BOT_TOKEN,
        )

        login_response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )
        assert login_response.status_code == 200

        refresh_token = login_response.json()["refresh_token"]
        original_access_token = login_response.json()["access_token"]

        # 2. Refresh 요청
        refresh_response = test_client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 200
        new_access_token = refresh_response.json()["access_token"]

        # 새로운 Access Token이 발급되었는지 확인
        assert new_access_token is not None
        assert len(new_access_token) > 0

    def test_invalid_refresh_token_rejected(self, test_client):
        """잘못된 Refresh Token 거부 테스트"""
        response = test_client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": "invalid.refresh.token"},
        )

        assert response.status_code == 401


class TestLogoutEndpoint:
    """POST /api/v2/auth/logout 테스트"""

    def test_logout_revokes_token(self, test_client, mock_telegram_settings, test_db_session):
        """로그아웃 시 Refresh Token 폐기 테스트"""
        # 1. 로그인
        unique_id = int(time.time() * 1000) % 10000000000 + 400
        init_data = generate_test_init_data(
            user_id=unique_id,
            bot_token=TEST_BOT_TOKEN,
        )

        login_response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )
        assert login_response.status_code == 200

        access_token = login_response.json()["access_token"]
        refresh_token = login_response.json()["refresh_token"]

        # 2. 로그아웃
        logout_response = test_client.post(
            "/api/v2/auth/logout",
            json={"refresh_token": refresh_token},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert logout_response.status_code == 200
        assert logout_response.json()["success"] is True

        # 3. 폐기된 Refresh Token으로 갱신 시도 → 실패
        refresh_response = test_client.post(
            "/api/v2/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert refresh_response.status_code == 401


class TestAuthEventLogging:
    """Auth Event 로깅 테스트"""

    def test_login_success_event_logged(self, test_client, mock_telegram_settings, test_db_session):
        """로그인 성공 이벤트 기록 확인"""
        from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType

        unique_id = int(time.time() * 1000) % 10000000000 + 500
        init_data = generate_test_init_data(
            user_id=unique_id,
            bot_token=TEST_BOT_TOKEN,
        )

        response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )
        assert response.status_code == 200

        user_id = response.json()["user"]["id"]

        # DB에서 이벤트 확인
        event = test_db_session.query(V2UserAuthEvent).filter(
            V2UserAuthEvent.user_id == user_id,
            V2UserAuthEvent.event_type == AuthEventType.LOGIN_SUCCESS,
        ).first()

        assert event is not None
        assert event.telegram_id == unique_id
        assert event.success is True

    def test_login_failed_event_logged(self, test_client, mock_telegram_settings, test_db_session):
        """로그인 실패 이벤트 기록 확인"""
        from app.v2.models.auth_event import V2UserAuthEvent, AuthEventType

        # 잘못된 hash로 로그인 시도
        init_data = generate_test_init_data(
            user_id=999999,
            bot_token="wrong:token",
        )

        response = test_client.post(
            "/api/v2/telegram/auth",
            json={"init_data": init_data},
        )
        assert response.status_code == 400

        # DB에서 실패 이벤트 확인
        event = test_db_session.query(V2UserAuthEvent).filter(
            V2UserAuthEvent.user_id == 0,  # 실패 시 user_id = 0
            V2UserAuthEvent.event_type == AuthEventType.LOGIN_FAILED,
            V2UserAuthEvent.success == False,
        ).order_by(V2UserAuthEvent.id.desc()).first()

        assert event is not None
        assert "Invalid hash" in (event.error_message or "")
