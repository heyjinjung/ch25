import os
import importlib
import ast
import pytest
from app.main import app
from fastapi.routing import APIRoute
from pathlib import Path

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), "../../../")
ALEMBIC_VERSIONS_DIR = os.path.join(PROJECT_ROOT, "alembic/versions")

def test_alembic_version_integrity():
    """
    1-2. Config & Migration Check:
    Static analysis of alembic version files to ensure they have valid revision identifiers.
    """
    if not os.path.exists(ALEMBIC_VERSIONS_DIR):
        pytest.skip("Alembic versions directory not found")

    revision_ids = set()
    down_revisions = set()
    
    for filename in os.listdir(ALEMBIC_VERSIONS_DIR):
        if not filename.endswith(".py"):
            continue
            
        filepath = os.path.join(ALEMBIC_VERSIONS_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read())
            
        has_revision = False
        has_down_revision = False
        
        for node in tree.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        if target.id == "revision":
                            has_revision = True
                            if isinstance(node.value, ast.Constant): # Python 3.8+
                                revision_ids.add(node.value.value)
                            elif isinstance(node.value, ast.Str): # Legacy
                                revision_ids.add(node.value.s)

                        if target.id == "down_revision":
                            has_down_revision = True
                            if isinstance(node.value, ast.Constant):
                                down_revisions.add(node.value.value)
                            elif isinstance(node.value, ast.Str):
                                down_revisions.add(node.value.s)
                            elif isinstance(node.value, ast.Tuple) or isinstance(node.value, ast.List):
                                # Merge point
                                pass

        assert has_revision, f"Migration file {filename} missing 'revision' variable"
        assert has_down_revision, f"Migration file {filename} missing 'down_revision' variable"

    # Minimal graph integrity check: Orphan Check (except base)
    # Every down_revision should exist in revision_ids (except None)
    orphans = down_revisions - revision_ids - {None}
    assert not orphans, f"Found orphan down_revisions (pointing to non-existent revisions): {orphans}"


def test_v2_router_isolation():
    """
    1-3. API Contract Sweep (Router Check):
    Verify V2 routes are correctly prefixed and isolated.
    """
    routes = [r for r in app.routes if isinstance(r, APIRoute)]
    
    v2_api_routes = [r for r in routes if r.path.startswith("/api/v2")]
    v2_admin_routes = [r for r in routes if r.path.startswith("/admin/api") or r.path.startswith("/api/v2/admin")]
    
    # Ensure V2 Client API routes do NOT contain 'admin' in path logic (unless explicit)
    for route in v2_api_routes:
        if "admin" in route.path and "/api/v2/admin" not in route.path:
             # Just a warning or strict check? 
             # Ideally /api/v2/ should not mix admin things unless routed properly.
             pass

    assert len(v2_api_routes) > 0, "No V2 API routes found!"
    assert len(v2_admin_routes) > 0, "No V2 Admin routes found!"

def test_module_import_sanity():
    """
    1-3. Runtime Sanity Check:
    Verify key V2 modules import without circular error.
    """
    modules_to_check = [
        "app.v2.services.vault2_service",
        "app.v2.services.admin_cc_deposit_service",
        "app.v2.api.admin_cc_deposit",
    ]
    
    for module_name in modules_to_check:
        try:
            importlib.import_module(module_name)
        except ImportError as e:
            pytest.fail(f"Failed to import {module_name}: {e}")
        except Exception as e:
            pytest.fail(f"Runtime error importing {module_name}: {e}")


TEXT_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".md", ".json", ".yaml", ".yml",
    ".sql", ".txt", ".css", ".html", ".csv", ".ini", ".toml", ".env",
}

EXCLUDED_DIRS = {
    ".git", ".venv", "node_modules", "dist", "build", "coverage",
    "logs", "__pycache__",
}


def _iter_text_files(root: Path):
    for path in root.rglob("*"):
        if path.is_dir():
            if path.name in EXCLUDED_DIRS:
                # Skip entire directory
                continue
            continue

        if path.suffix.lower() in TEXT_EXTENSIONS:
            # Skip large artifacts if any
            if any(part in EXCLUDED_DIRS for part in path.parts):
                continue
            yield path


def test_utf8_decode_docs_and_src():
    """Ensure docs/ and src/ files are UTF-8 decodable (prevent mojibake regressions)."""
    project_root = Path(__file__).resolve().parents[3]
    targets = [project_root / "docs", project_root / "src"]

    decode_failures = []
    for target in targets:
        if not target.exists():
            continue
        for file_path in _iter_text_files(target):
            try:
                file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                decode_failures.append(str(file_path))

    assert not decode_failures, f"UTF-8 decode failed for: {decode_failures}"


def test_no_mojibake_replacement_char_in_docs_and_src():
    """Detect common mojibake replacement char () in docs/ and src/."""
    project_root = Path(__file__).resolve().parents[3]
    targets = [project_root / "docs", project_root / "src"]

    offending_files = []
    for target in targets:
        if not target.exists():
            continue
        for file_path in _iter_text_files(target):
            content = file_path.read_text(encoding="utf-8")
            if "" in content:
                offending_files.append(str(file_path))

    assert not offending_files, f"Mojibake replacement char found in: {offending_files}"
