from app.main import app

def test_print_routes():
    print("\n[DEBUG] Registered Routes:")
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"  {route.path} [{route.name}]")
    print("--------------------------\n")
    assert True
