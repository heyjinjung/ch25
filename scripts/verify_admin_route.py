import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app

def verify_admin_route():
    print(">>> Verifying Admin Route Availability")
    client = TestClient(app)
    
    # Needs auth? 
    # The route /admin/api/shop/products usually requires Admin Auth.
    # But usually 401/403 is returned if unauthorized. 404 means NOT FOUND.
    
    url = "/admin/api/shop/products"
    print(f"GET {url}")
    
    response = client.get(url)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 404:
        print("FAIL: Route not found (404).")
        # List all routes to debug
        print("\nListing all registered routes:")
        for route in app.routes:
            if hasattr(route, "path"):
                print(f"  {route.path}")
    elif response.status_code in (401, 403):
        print(f"SUCCESS (Partial): Route exists but requires auth ({response.status_code}).")
    elif response.status_code == 200:
        print("SUCCESS: Route found and accessible.")
    else:
        print(f"Result: {response.status_code}")

if __name__ == "__main__":
    verify_admin_route()
