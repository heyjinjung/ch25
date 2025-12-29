import httpx

def test_summary():
    # Attempt to hit the local backend
    # Since we are inside the system, localhost:8000 should work if the server is running
    try:
        response = httpx.get("http://localhost:8000/admin/api/game-tokens/summary")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Count: {len(data)}")
            if data:
                print(f"First User: {data[0]}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_summary()
