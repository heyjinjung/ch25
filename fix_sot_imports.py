
import os
import re
from pathlib import Path

ROOT_DIR = Path(".")
V2_DIR = ROOT_DIR / "app" / "v2"

# Skip __init__.py because it contains the actual shims
SKIP_FILES = {
    V2_DIR / "models" / "__init__.py",
    # Bridges might need to keep V1 imports if they are explicit bridges
    V2_DIR / "services" / "vault_legacy_bridge.py",
}

# Regex to find: from app.models.foo import Bar, Baz
FROM_MODELS_REGEX = re.compile(r"from\s+app\.models\.[a-z0-9_]+\s+import")
# Regex to find: import app.models.foo
IMPORT_MODELS_REGEX = re.compile(r"import\s+app\.models\.[a-z0-9_]+")

def fix_file(file_path):
    if file_path.resolve() in [f.resolve() for f in SKIP_FILES]:
        return False
        
    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False
        
    new_content = content
    
    # Replace individual imports: from app.models.feature import FeatureConfig -> from app.v2.models import FeatureConfig
    # We use a non-greedy catch for the module name
    new_content = re.sub(r"from\s+app\.models\.[a-z0-9_]+\s+import", "from app.v2.models import", new_content)
    
    # Replace bulk imports: from app.models import ... -> from app.v2.models import ...
    new_content = re.sub(r"from\s+app\.models\s+import", "from app.v2.models import", new_content)
    
    # Handle direct imports if any: import app.models.feature -> import app.v2.models
    # (This is less common and might need manual fixing if it's used as app.models.feature.FeatureConfig)
    # Actually, let's see if there are any.
    
    if new_content != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        return True
    return False

count = 0
for root, _, files in os.walk(V2_DIR):
    for file in files:
        if file.endswith(".py"):
            full_path = Path(root) / file
            if fix_file(full_path):
                print(f"Fixed: {full_path}")
                count += 1

print(f"Total files fixed: {count}")
