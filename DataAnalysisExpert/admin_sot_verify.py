from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]

FRONTEND_ADMIN_API = REPO_ROOT / "src" / "v2" / "api" / "adminApi.ts"
BACKEND_ADMIN_DIR = REPO_ROOT / "app" / "v2" / "api" / "admin"
BACKEND_ADMIN_INIT = BACKEND_ADMIN_DIR / "__init__.py"
BACKEND_MAIN = REPO_ROOT / "app" / "main.py"
BACKEND_V2_ROUTES = REPO_ROOT / "app" / "v2" / "api" / "routes.py"

DOC_ADMIN_RULES = REPO_ROOT / "docs" / "SOT" / "00_admin" / "20260206_admin_audit_and_routing_rules.md"
DOC_ADMIN_OVERVIEW = REPO_ROOT / "docs" / "SOT" / "00_admin" / "01.admin.md"
DOC_FRONT_VERIFY_PLAN = REPO_ROOT / "docs" / "SOT" / "00_admin" / "v2_admin_frontend_sot_verification_plan_ko.md"
DOC_FRONT_PAGE_INDEX = REPO_ROOT / "docs" / "SOT" / "00_admin" / "v2_front_admin_page_index.md"


@dataclass(frozen=True)
class Finding:
    severity: str  # RED/YELLOW/GREEN
    kind: str
    message: str


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def normalize_path(p: str) -> str:
    return p.replace("\\", "/").strip()


def extract_repo_paths_from_markdown(md: str) -> list[str]:
    # Very permissive: pick tokens that look like repo relative paths.
    # We keep it simple to avoid false negatives.
    candidates = set()

    # Code blocks / bullet lists / inline paths
    for m in re.finditer(r"\b(?:src|app|docs)/[\w\-./]+\.(?:ts|tsx|js|py|md|sql|json)\b", md):
        candidates.add(normalize_path(m.group(0)))

    return sorted(candidates)


def check_doc_paths_exist(doc_path: Path) -> list[Finding]:
    md = read_text(doc_path)
    repo_paths = extract_repo_paths_from_markdown(md)
    findings: list[Finding] = []

    missing = []
    for rp in repo_paths:
        abs_path = REPO_ROOT / rp
        if not abs_path.exists():
            missing.append(rp)

    if missing:
        findings.append(
            Finding(
                severity="YELLOW",
                kind="DOC_PATH_MISSING",
                message=f"{doc_path.name}: 문서에 등장하지만 현재 워크스페이스에 없는 파일 {len(missing)}개 (예: {missing[:5]})",
            )
        )
    else:
        findings.append(
            Finding(
                severity="GREEN",
                kind="DOC_PATHS_OK",
                message=f"{doc_path.name}: 문서에 언급된 파일 경로가 모두 존재함 ({len(repo_paths)}개 검사)",
            )
        )

    return findings


def extract_frontend_admin_api_paths(ts: str) -> set[str]:
    # Capture literal strings and template strings that include /api/v2/admin
    paths: set[str] = set()

    # "..." and '...'
    for m in re.finditer(r"([\"'])(/api/v2/admin[^\"']+)\1", ts):
        paths.add(m.group(2))

    # `...`
    for m in re.finditer(r"`(/api/v2/admin[^`]+)`", ts):
        raw = m.group(1)
        raw = re.sub(r"\$\{[^}]+\}", "{var}", raw)
        paths.add(raw)

    return paths


def extract_backend_admin_paths() -> set[str]:
    # Best-effort static extraction based on string literals.
    # Final path = /api/v2 + (v2 routes include) + /admin (admin router prefix) + include_router prefix + file router prefix + decorator path
    v2_prefix = "/api/v2"

    init_src = read_text(BACKEND_ADMIN_INIT)
    m = re.search(r"router\s*=\s*APIRouter\(prefix=\"([^\"]+)\"", init_src)
    admin_prefix = m.group(1) if m else "/admin"

    # Map imported routers: "from .x_routes import router as foo_router"
    import_map: dict[str, str] = {}
    for im in re.finditer(r"from \.([\w_]+) import router as ([\w_]+)", init_src):
        module, var = im.group(1), im.group(2)
        import_map[var] = module

    # include_router lines: router.include_router(foo_router, prefix="/x")
    include_prefix: dict[str, str] = {}
    for inc in re.finditer(r"router\.include_router\(([^,\)]+)(?:,\s*prefix=\"([^\"]+)\")?", init_src):
        var = inc.group(1).strip()
        pfx = inc.group(2) or ""
        include_prefix[var] = pfx

    all_paths: set[str] = set()

    # Helper: parse one backend module for router prefix + decorators
    def parse_module(module_name: str) -> tuple[str, list[str]]:
        file_path = BACKEND_ADMIN_DIR / f"{module_name}.py"
        if not file_path.exists():
            return "", []
        src = read_text(file_path)
        pm = re.search(r"APIRouter\(prefix=\"([^\"]+)\"", src)
        router_prefix = pm.group(1) if pm else ""
        deco_paths = []
        # Support both one-line and multi-line decorators.
        # Examples:
        #   @router.get("/x")
        #   @router.get(
        #       "/x",
        #       response_model=...
        #   )
        for dm in re.finditer(
            r"@router\.(?:get|post|put|patch|delete)\(\s*[\"']([^\"']+)[\"']",
            src,
            flags=re.MULTILINE,
        ):
            deco_paths.append(dm.group(1))
        return router_prefix, deco_paths

    for var, module_name in import_map.items():
        mod_prefix, deco_paths = parse_module(module_name)
        inc_prefix = include_prefix.get(var, "")
        for dp in deco_paths:
            full = v2_prefix + admin_prefix + inc_prefix + mod_prefix + dp
            # normalize double slashes
            full = re.sub(r"//+", "/", full)
            all_paths.add(full)

    return all_paths


def path_pattern_to_regex(p: str) -> re.Pattern[str]:
    # Convert {var} or {user_id} style placeholders into a single-segment wildcard.
    escaped = re.escape(p)
    escaped = re.sub(r"\\\{[^\\}]+\\\}", r"[^/]+", escaped)
    return re.compile(r"^" + escaped + r"$")


def compare_front_back(front: Iterable[str], back: Iterable[str]) -> tuple[list[str], list[str]]:
    back_list = sorted(set(back))
    back_regexes = [(b, path_pattern_to_regex(b)) for b in back_list]

    missing_in_backend: list[str] = []
    for f in sorted(set(front)):
        f_regex = path_pattern_to_regex(f)
        if any(f_regex.match(b) or b_regex.match(f) for b, b_regex in back_regexes):
            continue
        missing_in_backend.append(f)

    # Backend paths that are never referenced literally in adminApi.ts (informational)
    unused_backend: list[str] = []
    front_list = sorted(set(front))
    front_regexes = [(f, path_pattern_to_regex(f)) for f in front_list]
    for b in back_list:
        if any(fr.match(b) or path_pattern_to_regex(b).match(f) for f, fr in front_regexes):
            continue
        unused_backend.append(b)

    return missing_in_backend, unused_backend


def main() -> int:
    findings: list[Finding] = []

    # 1) Doc path existence sanity
    for doc in [DOC_ADMIN_RULES, DOC_ADMIN_OVERVIEW, DOC_FRONT_VERIFY_PLAN, DOC_FRONT_PAGE_INDEX]:
        if doc.exists():
            findings.extend(check_doc_paths_exist(doc))
        else:
            findings.append(Finding("RED", "DOC_MISSING", f"문서 파일이 없음: {doc}"))

    # 2) Frontend adminApi.ts paths vs backend extracted paths
    if FRONTEND_ADMIN_API.exists() and BACKEND_ADMIN_INIT.exists():
        front_ts = read_text(FRONTEND_ADMIN_API)
        front_paths = extract_frontend_admin_api_paths(front_ts)

        back_paths = extract_backend_admin_paths()

        missing_in_backend, unused_backend = compare_front_back(front_paths, back_paths)

        if missing_in_backend:
            findings.append(
                Finding(
                    "RED",
                    "FRONT_PATH_NO_BACKEND",
                    f"adminApi.ts의 /api/v2/admin 경로 중 백엔드에서 정적 추출로 매칭 실패 {len(missing_in_backend)}개 (예: {missing_in_backend[:8]})",
                )
            )
        else:
            findings.append(
                Finding(
                    "GREEN",
                    "FRONT_PATHS_MATCH",
                    f"adminApi.ts의 /api/v2/admin 경로가 백엔드 정적 추출 경로와 모두 매칭됨 (총 {len(front_paths)}개)",
                )
            )

        # unused backend is informational only
        findings.append(
            Finding(
                "YELLOW" if unused_backend else "GREEN",
                "BACK_PATH_UNUSED",
                f"백엔드 admin 경로 중 adminApi.ts에서 literal 매칭이 없는 경로 {len(unused_backend)}개 (예: {unused_backend[:8]})",
            )
        )
    else:
        findings.append(Finding("RED", "MISSING_INPUT", "adminApi.ts 또는 admin/__init__.py가 없어 경로 대조 불가"))

    # Print report
    print("=== Admin SoT Verification Report (best-effort) ===")
    for f in findings:
        print(f"[{f.severity}] {f.kind}: {f.message}")

    # Exit non-zero if any RED
    return 1 if any(f.severity == "RED" for f in findings) else 0


if __name__ == "__main__":
    raise SystemExit(main())
