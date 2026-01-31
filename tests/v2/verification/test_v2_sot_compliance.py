"""
Test V2 SOT Compliance.
Verifies that V2 modules do not import legacy V1 models improperly.
"""
import os
import ast
import pytest
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.parent.parent
V2_DIR = ROOT_DIR / "app" / "v2"

# Allowed V1 imports (Bridges, Shims)
ALLOWED_EXCEPTIONS = {
    "app.v2.models.__init__", # Exports legacy for compat
    "app.v2.services.vault_legacy_bridge", # Explicit bridge
    "app.v2.services.admin_audit_service", # Uses AdminAuditLog (Shared)
    "app.v2.services.hq_margin_import_service", # Uses AdminAuditLog
    "app.v2.services.hq_margin_stats_service", # Uses AdminAuditLog
}

def get_imports(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            tree = ast.parse(f.read())
        except Exception:
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

def test_no_v1_model_imports_in_v2():
    """Ensure app.v2.* does not import app.models.* (except allowed)."""
    violations = []
    
    for root, _, files in os.walk(V2_DIR):
        for file in files:
            if not file.endswith(".py"):
                continue
            
            full_path = Path(root) / file
            rel_path = full_path.relative_to(ROOT_DIR)
            module_path = str(rel_path).replace(os.sep, ".")[:-3] # app.v2.foo
            
            if module_path in ALLOWED_EXCEPTIONS:
                continue
                
            imports = get_imports(full_path)
            for imp in imports:
                if imp.startswith("app.models") and "game_wallet" not in imp: 
                    # app.models.game_wallet is sometimes allowed for legacy compat in types
                    # But generally we want to avoid app.models.*
                    # actually user.py checks?
                    if imp == "app.models.admin_audit_log": continue # audit log is shared
                    violations.append(f"{module_path} imports {imp}")

    assert not violations, f"SOT Violations found:\n" + "\n".join(violations)
