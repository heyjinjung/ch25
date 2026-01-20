from app.main import app

def test_routes():
    print(f"\nTotal Routes: {len(app.routes)}")
    for r in app.routes:
        print(f"Path: {getattr(r, 'path', 'N/A')} Name: {getattr(r, 'name', 'N/A')}")
    assert False # Force output
