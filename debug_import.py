import sys
import os

print(f"CWD: {os.getcwd()}")
print(f"PYTHONPATH: {os.environ.get('PYTHONPATH')}")
print("Sys path:")
for p in sys.path:
    print(f"  {p}")

try:
    import app
    print("Successfully imported app")
    from app.db.base_class import Base
    print("Successfully imported app.db.base_class.Base")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
