import requests
import json

def test_v2_login_sync():
    # 로컬 서버 주소 (FastAPI가 실행 중인 것으로 가정)
    url = "http://localhost:8000/api/v2/dev/login"
    payload = {
        "external_id": "cc001",
        "nickname": "level",
        "create_if_missing": False # Legacy에서 가져와야 하므로 False여도 성공해야 함
    }
    
    print(f"Testing V2 Login Sync for 'cc001'...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS: Login successful!")
            print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        else:
            print(f"FAILURE: {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == '__main__':
    test_v2_login_sync()
