#!/usr/bin/env python
"""
테스트용 Telegram initData 생성 스크립트

사용법:
    python scripts/generate_test_init_data.py
    python scripts/generate_test_init_data.py --bot-token "your:bot:token" --user-id 123456

생성된 initData를 curl로 테스트:
    curl -X POST http://localhost:8000/api/v2/telegram/auth \
        -H "Content-Type: application/json" \
        -d '{"init_data": "<생성된_init_data>", "start_param": null}'
"""
import argparse
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode, parse_qsl


def generate_init_data(
    bot_token: str,
    user_id: int = 987654321,
    username: str = "test_user",
    first_name: str = "테스트",
    last_name: str = "유저",
    auth_date: int | None = None,
    start_param: str | None = None,
) -> str:
    """
    테스트용 Telegram initData 생성

    Telegram 공식 알고리즘으로 유효한 hash를 생성합니다.
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
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
        "query_id": f"test_query_{int(time.time() * 1000)}",
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


def verify_init_data(init_data: str, bot_token: str) -> dict:
    """
    initData 검증

    Returns:
        dict: 검증 결과 {valid: bool, data: dict, error: str}
    """
    try:
        vals = dict(parse_qsl(init_data))
        hash_val = vals.pop("hash", None)

        if not hash_val:
            return {"valid": False, "data": vals, "error": "Missing hash"}

        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(vals.items())])
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(calculated_hash, hash_val):
            return {
                "valid": False,
                "data": vals,
                "error": f"Hash mismatch: expected {calculated_hash}, got {hash_val}",
            }

        # user 필드 파싱
        if "user" in vals:
            vals["user"] = json.loads(vals["user"])

        return {"valid": True, "data": vals, "error": None}
    except Exception as e:
        return {"valid": False, "data": {}, "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description="테스트용 Telegram initData 생성")
    parser.add_argument("--bot-token", default="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ", help="Bot Token")
    parser.add_argument("--user-id", type=int, default=987654321, help="Telegram User ID")
    parser.add_argument("--username", default="test_user", help="Telegram username")
    parser.add_argument("--first-name", default="테스트", help="First name")
    parser.add_argument("--last-name", default="유저", help="Last name")
    parser.add_argument("--start-param", default=None, help="start_param (e.g., ref_123)")
    parser.add_argument("--verify", action="store_true", help="생성 후 검증")

    args = parser.parse_args()

    print("=" * 60)
    print("Telegram initData 생성기")
    print("=" * 60)
    print()

    # 생성
    init_data = generate_init_data(
        bot_token=args.bot_token,
        user_id=args.user_id,
        username=args.username,
        first_name=args.first_name,
        last_name=args.last_name,
        start_param=args.start_param,
    )

    print("[PARAMS]")
    print(f"   Bot Token: {args.bot_token[:20]}...")
    print(f"   User ID: {args.user_id}")
    print(f"   Username: {args.username}")
    print(f"   Name: {args.first_name} {args.last_name}")
    if args.start_param:
        print(f"   Start Param: {args.start_param}")
    print()

    print("[INIT_DATA]")
    print("-" * 60)
    print(init_data)
    print("-" * 60)
    print()

    # 파싱된 값 출력
    vals = dict(parse_qsl(init_data))
    print("[PARSED FIELDS]")
    for k, v in vals.items():
        if k == "user":
            print(f"   {k}: {json.loads(v)}")
        elif k == "hash":
            print(f"   {k}: {v[:16]}...{v[-16:]}")
        else:
            print(f"   {k}: {v}")
    print()

    # 검증
    if args.verify:
        result = verify_init_data(init_data, args.bot_token)
        status = "[VALID]" if result["valid"] else "[INVALID]"
        print(f"{status}")
        print(f"   Valid: {result['valid']}")
        if result["error"]:
            print(f"   Error: {result['error']}")
        print()

    # curl 예시
    print("[CURL COMMAND]")
    print("-" * 60)
    curl_data = {"init_data": init_data}
    if args.start_param:
        curl_data["start_param"] = args.start_param
    print(f'curl -X POST http://localhost:8000/api/v2/telegram/auth \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(f'  -d \'{json.dumps(curl_data)}\'')
    print("-" * 60)


if __name__ == "__main__":
    main()
