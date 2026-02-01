
import os
import ast
from pathlib import Path

ROOT_DIR = Path(".")
V2_DIR = ROOT_DIR / "app" / "v2"

# Allowed V1 imports (Bridges, Shims)
ALLOWED_EXCEPTIONS = {
    "app.v2.models.__init__",
    "app.v2.services.vault_legacy_bridge",
    "app.v2.services.admin_audit_service",
    "app.v2.services.hq_margin_import_service",
    "app.v2.services.hq_margin_stats_service",
}

def get_imports(file_path):
    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            content = f.read()
            tree = ast.parse(content)
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return []
            
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in node.names:
                imports.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imports.append(node.module)
    return imports

violations = []
for root, _, files in os.walk(V2_DIR):
    for file in files:
        if not file.endswith(".py"):
            continue
        
        full_path = Path(root) / file
        rel_path = full_path.relative_to(ROOT_DIR)
        module_path = str(rel_path).replace(os.sep, ".")[:-3]
        
        if module_path in ALLOWED_EXCEPTIONS:
            continue
            
        imports = get_imports(full_path)
        for imp in imports:
            if imp.startswith("app.models") and "game_wallet" not in imp:
                if imp == "app.models.admin_audit_log":
                    continue
                violations.append(f"{module_path} imports {imp}")

print("\n".join(sorted(set(violations))))
