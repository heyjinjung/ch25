"""
V2 Telegram Mini App initData 검증 모듈

Telegram 공식 문서 기반 HMAC-SHA256 서명 검증
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

🔴 기존 app/core/telegram.py의 hash 비교 누락 수정 버전
"""
import hashlib
import hmac
import json
from urllib.parse import parse_qsl

from app.core.config import get_settings


def validate_init_data(init_data: str) -> dict:
    """
    Telegram Mini App initData 서명 검증

    Args:
        init_data: URL-encoded query string (hash 포함)

    Returns:
        dict: 검증된 데이터 (user 필드는 JSON 파싱됨)

    Raises:
        ValueError: 검증 실패 시
    """
    settings = get_settings()

    # TEST_MODE: Mock 데이터 반환
    if not settings.telegram_bot_token:
        if settings.test_mode:
            return {
                "user": {"id": 1234567, "username": "test_user", "first_name": "Test"},
                "auth_date": "1706432000",
            }
        raise ValueError("TELEGRAM_BOT_TOKEN not configured")

    # 1. initData 파싱
    vals = dict(parse_qsl(init_data))

    # 2. hash 추출 및 제거
    hash_val = vals.pop("hash", None)
    if not hash_val:
        raise ValueError("Missing hash in initData")

    # 3. data_check_string 생성 (알파벳순 정렬, \n 구분)
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])

    # 4. secret_key = HMAC-SHA256("WebAppData", bot_token)
    secret_key = hmac.new(
        b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256
    ).digest()

    # 5. calculated_hash = HMAC-SHA256(secret_key, data_check_string)
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    # 6. 🔴 hash 비교 (핵심 수정 - 기존 코드에서 누락됨)
    if not hmac.compare_digest(calculated_hash, hash_val):
        raise ValueError("Invalid hash")

    # 7. user 필드 JSON 파싱
    if "user" in vals:
        try:
            vals["user"] = json.loads(vals["user"])
        except json.JSONDecodeError:
            raise ValueError("Invalid user JSON in initData")

    return vals


def extract_telegram_user(validated_data: dict) -> dict:
    """
    검증된 initData에서 Telegram 유저 정보 추출

    Args:
        validated_data: validate_init_data() 결과

    Returns:
        dict: {id, username, first_name, last_name, language_code, ...}

    Raises:
        ValueError: user 데이터 없을 시
    """
    user = validated_data.get("user")
    if not user:
        raise ValueError("No user data in initData")

    if isinstance(user, str):
        user = json.loads(user)

    return user


def generate_nickname(tg_user: dict) -> str:
    """
    Telegram 유저 정보에서 닉네임 생성

    Args:
        tg_user: extract_telegram_user() 결과

    Returns:
        str: 닉네임 (first_name + last_name 또는 @username 또는 tg_user_{id})
    """
    first_name = tg_user.get("first_name", "")
    last_name = tg_user.get("last_name", "")
    username = tg_user.get("username", "")
    tg_id = tg_user.get("id", 0)

    # 우선순위: first_name + last_name > @username > tg_user_{id}
    if first_name or last_name:
        return f"{first_name} {last_name}".strip()
    elif username:
        return f"@{username}"
    else:
        return f"tg_user_{tg_id}"
