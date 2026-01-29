"""
V2 Telegram Auth 백테스트

가상의 Telegram initData를 생성하여 인증 플로우 검증
"""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

# 테스트용 Bot Token (실제 토큰 아님)
TEST_BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ1234567890"


def generate_test_init_data(
    user_id: int = 987654321,
    username: str = "test_user",
    first_name: str = "테스트",
    last_name: str = "유저",
    bot_token: str = TEST_BOT_TOKEN,
    auth_date: int | None = None,
    start_param: str | None = None,
) -> str:
    """
    테스트용 Telegram initData 생성

    Telegram 공식 알고리즘으로 유효한 hash를 생성합니다.
    """
    if auth_date is None:
        auth_date = int(time.time())

    # user 데이터
    user_data = {
        "id": user_id,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "language_code": "ko",
        "allows_write_to_pm": True,
    }

    # initData 필드 (hash 제외)
    data = {
        "user": json.dumps(user_data, separators=(",", ":")),
        "auth_date": str(auth_date),
        "query_id": "AAHdF6IQAAAAnR-iEBrq_ok",
    }

    if start_param:
        data["start_param"] = start_param

    # 1. data_check_string 생성 (알파벳순 정렬, \n 구분)
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(data.items())])

    # 2. secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256
    ).digest()

    # 3. hash = HMAC-SHA256(secret_key, data_check_string)
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    # 4. initData 조립 (URL-encoded query string)
    data["hash"] = calculated_hash

    return urlencode(data)


class TestTelegramInitDataGeneration:
    """initData 생성 및 검증 테스트"""

    def test_generate_valid_init_data(self):
        """유효한 initData 생성 확인"""
        init_data = generate_test_init_data()
        assert "hash=" in init_data
        assert "user=" in init_data
        assert "auth_date=" in init_data

    def test_hash_verification(self):
        """hash 검증 알고리즘 정확성"""
        from urllib.parse import parse_qsl

        init_data = generate_test_init_data(
            user_id=123456,
            username="verify_test",
            bot_token=TEST_BOT_TOKEN,
        )

        # 파싱
        vals = dict(parse_qsl(init_data))
        hash_val = vals.pop("hash")

        # 재계산
        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])
        secret_key = hmac.new(b"WebAppData", TEST_BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        assert hash_val == calculated_hash

    def test_invalid_hash_detection(self):
        """잘못된 hash 탐지"""
        init_data = generate_test_init_data()

        # hash 변조
        tampered = init_data.replace("hash=", "hash=invalid")

        # 검증 시 실패해야 함
        from urllib.parse import parse_qsl
        vals = dict(parse_qsl(tampered))
        hash_val = vals.pop("hash")

        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])
        secret_key = hmac.new(b"WebAppData", TEST_BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        assert hash_val != calculated_hash


class TestV2TelegramValidation:
    """V2 Telegram 검증 모듈 테스트"""

    def test_validate_init_data_success(self, monkeypatch):
        """정상 initData 검증 성공"""
        # Bot Token 설정
        from app.core.config import Settings

        def mock_get_settings():
            settings = Settings()
            settings.telegram_bot_token = TEST_BOT_TOKEN
            settings.test_mode = False
            return settings

        monkeypatch.setattr("app.v2.core.telegram.get_settings", mock_get_settings)

        from app.v2.core.telegram import validate_init_data

        init_data = generate_test_init_data(
            user_id=999888777,
            username="success_test",
            first_name="성공",
            last_name="테스트",
            bot_token=TEST_BOT_TOKEN,
        )

        result = validate_init_data(init_data)

        assert "user" in result
        assert result["user"]["id"] == 999888777
        assert result["user"]["username"] == "success_test"

    def test_validate_init_data_invalid_hash(self, monkeypatch):
        """잘못된 hash 거부"""
        from app.core.config import Settings

        def mock_get_settings():
            settings = Settings()
            settings.telegram_bot_token = TEST_BOT_TOKEN
            settings.test_mode = False
            return settings

        monkeypatch.setattr("app.v2.core.telegram.get_settings", mock_get_settings)

        from app.v2.core.telegram import validate_init_data

        # 다른 Bot Token으로 생성 (hash 불일치)
        init_data = generate_test_init_data(
            bot_token="wrong:token",
        )

        with pytest.raises(ValueError) as exc_info:
            validate_init_data(init_data)

        assert "Invalid hash" in str(exc_info.value)

    def test_validate_init_data_missing_hash(self, monkeypatch):
        """hash 누락 거부"""
        from app.core.config import Settings

        def mock_get_settings():
            settings = Settings()
            settings.telegram_bot_token = TEST_BOT_TOKEN
            settings.test_mode = False
            return settings

        monkeypatch.setattr("app.v2.core.telegram.get_settings", mock_get_settings)

        from app.v2.core.telegram import validate_init_data

        # hash 없는 initData
        init_data = "user=%7B%22id%22%3A123%7D&auth_date=1234567890"

        with pytest.raises(ValueError) as exc_info:
            validate_init_data(init_data)

        assert "Missing hash" in str(exc_info.value)

    def test_test_mode_bypass(self, monkeypatch):
        """TEST_MODE에서 검증 우회"""
        from app.core.config import Settings

        def mock_get_settings():
            settings = Settings()
            settings.telegram_bot_token = None  # Bot Token 없음
            settings.test_mode = True
            return settings

        monkeypatch.setattr("app.v2.core.telegram.get_settings", mock_get_settings)

        from app.v2.core.telegram import validate_init_data

        # 아무 데이터나 전달해도 Mock 반환
        result = validate_init_data("anything")

        assert result["user"]["id"] == 1234567
        assert result["user"]["username"] == "test_user"


class TestExtractTelegramUser:
    """Telegram 유저 추출 테스트"""

    def test_extract_user_from_dict(self):
        """dict에서 유저 추출"""
        from app.v2.core.telegram import extract_telegram_user

        validated_data = {
            "user": {"id": 123, "username": "test", "first_name": "Test"},
            "auth_date": "1234567890",
        }

        user = extract_telegram_user(validated_data)

        assert user["id"] == 123
        assert user["username"] == "test"

    def test_extract_user_from_string(self):
        """JSON 문자열에서 유저 추출"""
        from app.v2.core.telegram import extract_telegram_user

        validated_data = {
            "user": '{"id": 456, "username": "json_test"}',
            "auth_date": "1234567890",
        }

        user = extract_telegram_user(validated_data)

        assert user["id"] == 456

    def test_extract_user_missing(self):
        """user 데이터 없을 때 에러"""
        from app.v2.core.telegram import extract_telegram_user

        validated_data = {"auth_date": "1234567890"}

        with pytest.raises(ValueError) as exc_info:
            extract_telegram_user(validated_data)

        assert "No user data" in str(exc_info.value)


class TestGenerateNickname:
    """닉네임 생성 테스트"""

    def test_nickname_from_name(self):
        """이름에서 닉네임 생성"""
        from app.v2.core.telegram import generate_nickname

        user = {"id": 123, "first_name": "홍", "last_name": "길동", "username": "hong"}
        nickname = generate_nickname(user)

        assert nickname == "홍 길동"

    def test_nickname_from_first_name_only(self):
        """이름만 있을 때"""
        from app.v2.core.telegram import generate_nickname

        user = {"id": 123, "first_name": "테스트"}
        nickname = generate_nickname(user)

        assert nickname == "테스트"

    def test_nickname_from_username(self):
        """이름 없고 username만 있을 때"""
        from app.v2.core.telegram import generate_nickname

        user = {"id": 123, "username": "testuser"}
        nickname = generate_nickname(user)

        assert nickname == "@testuser"

    def test_nickname_fallback(self):
        """이름/username 없을 때 ID 사용"""
        from app.v2.core.telegram import generate_nickname

        user = {"id": 987654}
        nickname = generate_nickname(user)

        assert nickname == "tg_user_987654"


# 테스트 실행용
if __name__ == "__main__":
    # 테스트용 initData 생성 예시
    init_data = generate_test_init_data(
        user_id=123456789,
        username="example_user",
        first_name="예시",
        last_name="유저",
    )
    print("Generated initData:")
    print(init_data)
    print()

    # 파싱 확인
    from urllib.parse import parse_qsl
    vals = dict(parse_qsl(init_data))
    print("Parsed values:")
    for k, v in vals.items():
        print(f"  {k}: {v[:50]}..." if len(v) > 50 else f"  {k}: {v}")
