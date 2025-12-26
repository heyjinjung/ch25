import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.main import app

print("Registered Routes:")
for route in app.routes:
    if hasattr(route, "path"):
        print(f"{route.methods} {route.path}")
    elif hasattr(route, "path_format"):
        print(f"{route.methods} {route.path_format}")
