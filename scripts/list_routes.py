from app.main import app

def list_routes():
    print(f"{'Method':<10} {'Path':<40}")
    print("-" * 50)
    for route in app.routes:
        if hasattr(route, "methods"):
            methods = ", ".join(route.methods)
            print(f"{methods:<10} {route.path:<40}")
        else:
            print(f"{'GET':<10} {route.path:<40}")

if __name__ == "__main__":
    list_routes()
