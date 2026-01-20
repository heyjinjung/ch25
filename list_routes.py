from app.main import app
for route in app.routes:
    path = getattr(route, 'path', 'N/A')
    methods = getattr(route, 'methods', 'N/A')
    print(f"{methods} {path}")
