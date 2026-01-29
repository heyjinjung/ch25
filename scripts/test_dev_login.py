import pytest
@pytest.fixture
def base_url():
    # pytest에서 사용할 기본 API 서버 URL
    return "http://localhost:8000"

#!/usr/bin/env python
"""
V2 DEV Login API 테스트 스크립트

사용법:
    python scripts/test_dev_login.py
    python scripts/test_dev_login.py --base-url http://localhost:8000
    python scripts/test_dev_login.py --cc-id test_user_123 --create

환경변수:
    BASE_URL: API 서버 URL (기본: http://localhost:8000)
"""
import argparse
import json
import urllib.request
import urllib.error
from typing import Any


class SimpleResponse:
    """Simple response wrapper for urllib"""
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text

    def json(self) -> dict:
        return json.loads(self.text)


def http_post(url: str, payload: dict, timeout: int = 10) -> SimpleResponse:
    """Simple HTTP POST using urllib"""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return SimpleResponse(resp.status, resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return SimpleResponse(e.code, e.read().decode("utf-8"))


def http_get(url: str, headers: dict, timeout: int = 10) -> SimpleResponse:
    """Simple HTTP GET using urllib"""
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return SimpleResponse(resp.status, resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return SimpleResponse(e.code, e.read().decode("utf-8"))


def test_dev_login(base_url):
    cc_id = "dev_test_user"
    nickname = None
    create_if_missing = False
    """
    DEV Login API 테스트

    Args:
        base_url: API 서버 URL
        cc_id: CC ID
        nickname: 닉네임 (optional)
        create_if_missing: 없으면 생성 여부

    Returns:
        dict: API 응답
    """
    url = f"{base_url}/api/v2/dev/login"
    payload = {
        "cc_id": cc_id,
        "create_if_missing": create_if_missing,
    }
    if nickname:
        payload["nickname"] = nickname

    print("=" * 60)
    print("V2 DEV Login API Test")
    print("=" * 60)
    print()
    print("[REQUEST]")
    print(f"   URL: POST {url}")
    print(f"   Payload: {json.dumps(payload, indent=2)}")
    print()

    resp = http_post(url, payload)
    assert resp.status_code == 200, f"DEV 로그인 실패: {resp.status_code} {resp.text}"
    data = resp.json()
    assert "access_token" in data, "access_token 누락"
    assert data["user"]["cc_id"] == cc_id, "cc_id 불일치"
    return data


def test_authenticated_api(base_url):
    # DEV 로그인 먼저 수행
    login_data = test_dev_login(base_url)
    access_token = login_data["access_token"]
    """
    인증된 API 호출 테스트

    Args:
        base_url: API 서버 URL
        access_token: Access Token

    Returns:
        dict: API 응답
    """
    url = f"{base_url}/api/v2/user/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = http_get(url, headers)
    assert resp.status_code == 200, f"인증 API 실패: {resp.status_code} {resp.text}"
    data = resp.json()
    assert data["cc_id"] == "dev_test_user", "cc_id 불일치"
    return data


def main():
    parser = argparse.ArgumentParser(description="V2 DEV Login API Test")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API Server URL")
    parser.add_argument("--cc-id", default="dev_test_user", help="CC ID")
    parser.add_argument("--nickname", default=None, help="Nickname")
    parser.add_argument("--create", action="store_true", help="Create user if missing")
    parser.add_argument("--test-api", action="store_true", help="Test authenticated API after login")

    args = parser.parse_args()

    result = test_dev_login(
        base_url=args.base_url,
        cc_id=args.cc_id,
        nickname=args.nickname,
        create_if_missing=args.create,
    )

    if result.get("success") and args.test_api:
        access_token = result["data"]["access_token"]
        test_authenticated_api(args.base_url, access_token)

    print()
    print("=" * 60)

    # curl 예시 출력
    if result.get("success"):
        print("[CURL EXAMPLE - Use this token for other API calls]")
        print("-" * 60)
        token = result["data"]["access_token"]
        print(f'curl -X GET {args.base_url}/api/v2/user/me \\')
        print(f'  -H "Authorization: Bearer {token[:50]}..."')
    else:
        print("[CURL EXAMPLE - DEV Login]")
        print("-" * 60)
        payload = {"cc_id": args.cc_id, "create_if_missing": args.create}
        print(f"curl -X POST {args.base_url}/api/v2/dev/login \\")
        print('  -H "Content-Type: application/json" \\')
        print(f"  -d '{json.dumps(payload)}'")

    print("-" * 60)


if __name__ == "__main__":
    main()
