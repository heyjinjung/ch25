import argparse
import csv
import json
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Optional

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None  # type: ignore


KST_TZ_NAME = "Asia/Seoul"


@dataclass(frozen=True)
class DocEndpointMention:
    method: str
    path: str
    doc_path: str


def _kst_now() -> datetime:
    if ZoneInfo is None:
        return datetime.now()
    return datetime.now(ZoneInfo(KST_TZ_NAME))


def _date_stamp() -> str:
    return _kst_now().strftime("%Y%m%d")


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _normalize_path(raw: str) -> str:
    path = raw.strip()
    path = re.sub(r"^[a-zA-Z]+://[^/]+", "", path)  # strip scheme+host
    if not path.startswith("/"):
        path = "/" + path

    # Drop query/fragment
    path = path.split("?", 1)[0].split("#", 1)[0]

    # Trim common trailing punctuation
    path = path.rstrip(").,;:]\"'`>")

    # Avoid empty
    if path == "":
        return "/"

    return path


METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}


def extract_doc_endpoints(md_text: str, doc_rel_path: str) -> list[DocEndpointMention]:
    mentions: list[DocEndpointMention] = []

    # Pattern 1: "GET /api/v2/..." (optionally wrapped in backticks)
    pat_simple = re.compile(
        r"\b(?P<method>GET|POST|PUT|PATCH|DELETE)\s+(?:`)?(?P<path>/[^\s`\"]+)(?:`)?",
        re.IGNORECASE,
    )

    # Pattern 2: curl with -X METHOD and URL
    pat_curl = re.compile(
        r"\b-X\s+(?P<method>GET|POST|PUT|PATCH|DELETE)\b[^\n]*?(?P<url>https?://[^\s\"']+|/[^\s\"']+)",
        re.IGNORECASE,
    )

    # Pattern 3: full URL with method nearby in same line (fallback)
    pat_url = re.compile(r"https?://[^\s\"']+(/api/[^\s\"']+)")

    for m in pat_simple.finditer(md_text):
        method = m.group("method").upper()
        path = _normalize_path(m.group("path"))
        if method in METHODS and path.startswith("/api/"):
            mentions.append(DocEndpointMention(method=method, path=path, doc_path=doc_rel_path))

    for m in pat_curl.finditer(md_text):
        method = m.group("method").upper()
        url = m.group("url")
        path = _normalize_path(url)
        if method in METHODS and path.startswith("/api/"):
            mentions.append(DocEndpointMention(method=method, path=path, doc_path=doc_rel_path))

    # URL-only mentions: treat as UNKNOWN method? (skip; we need a method for strict check)
    # Still useful to surface, but v1 keeps scope strict.
    _ = pat_url

    # De-dup within a document
    unique = {(x.method, x.path): x for x in mentions}
    return list(unique.values())


def iter_markdown_files(docs_root: Path) -> Iterable[Path]:
    # Skip obvious archives and node_modules-like dumps under docs if any.
    skip_parts = {"node_modules", ".git", "__pycache__"}
    for p in docs_root.rglob("*.md"):
        if any(part in skip_parts for part in p.parts):
            continue
        yield p


def fetch_openapi_json(openapi_url: str, docker_service: str) -> dict[str, Any]:
    # 1) HTTP fetch
    try:
        import urllib.request

        with urllib.request.urlopen(openapi_url, timeout=5) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw)
    except Exception:
        pass

    # 2) Fallback: docker compose exec backend python -c ...
    py = (
        "import json; "
        "from fastapi.openapi.utils import get_openapi; "
        "from app.main import app; "
        "spec = get_openapi(title=getattr(app,'title','app'), version=getattr(app,'version','0'), routes=app.routes); "
        "print(json.dumps(spec))"
    )

    try:
        proc = subprocess.run(
            ["docker", "compose", "exec", "-T", docker_service, "python", "-c", py],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(proc.stdout)
    except Exception as e:
        raise RuntimeError(
            f"OpenAPI를 가져오지 못했습니다. openapi_url={openapi_url}, docker_service={docker_service}. "
            "백엔드 컨테이너가 실행 중인지 확인하세요."
        ) from e


def openapi_operations(spec: dict[str, Any]) -> tuple[set[tuple[str, str]], dict[tuple[str, str], bool], dict[str, set[str]]]:
    paths = spec.get("paths") or {}
    top_security = spec.get("security")
    has_top_security = bool(top_security)

    ops: set[tuple[str, str]] = set()
    security_required: dict[tuple[str, str], bool] = {}
    methods_by_path: dict[str, set[str]] = defaultdict(set)

    for path, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue
        for method_lower, op in path_item.items():
            method = str(method_lower).upper()
            if method not in METHODS:
                continue
            ops.add((method, path))
            methods_by_path[path].add(method)

            requires = False
            if isinstance(op, dict):
                if "security" in op:
                    requires = bool(op.get("security"))
                else:
                    requires = has_top_security
            security_required[(method, path)] = requires

    return ops, security_required, methods_by_path


def write_csv(
    out_csv: Path,
    rows: list[dict[str, Any]],
) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "status",
        "method",
        "path",
        "doc_files",
        "openapi_methods_for_path",
        "openapi_security_required",
    ]
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fieldnames})


def write_md(
    out_md: Path,
    openapi_url: str,
    total_doc_mentions: int,
    ok: int,
    missing: int,
    method_mismatch: int,
    missing_by_file: dict[str, list[tuple[str, str]]],
) -> None:
    out_md.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    lines.append("문서 타입: 리포트")
    lines.append("버전: v1.0")
    lines.append(f"작성일: {_kst_now().strftime('%Y-%m-%d')}")
    lines.append("작성자: GitHub Copilot")
    lines.append("대상: BE/FE/기획/운영")
    lines.append("상태: ACTIVE")
    lines.append("")
    lines.append("## 1. 목적 (Purpose)")
    lines.append("문서에 표기된 API 경로/메서드가 현재 실행 중인 백엔드(OpenAPI)와 일치하는지 자동 점검한다.")
    lines.append("")
    lines.append("## 2. 기준 (Basis)")
    lines.append(f"- OpenAPI URL: `{openapi_url}`")
    lines.append("- 판정은 ‘존재/메서드 일치’만 자동화한다(정책 의도/운영 예외의 의미적 최신성은 사람 검토 필요).")
    lines.append("")
    lines.append("## 3. 요약")
    lines.append(f"- 문서에서 추출된 엔드포인트 표기: {total_doc_mentions}개")
    lines.append(f"- OK(OpenAPI에 존재): {ok}개")
    lines.append(f"- MISSING(경로 자체가 없음): {missing}개")
    lines.append(f"- METHOD_MISMATCH(경로는 있으나 메서드 불일치): {method_mismatch}개")
    lines.append("")

    lines.append("## 4. 파일별 이슈(누락/불일치)")
    if not missing_by_file:
        lines.append("- 없음")
    else:
        for doc_path in sorted(missing_by_file.keys()):
            items = missing_by_file[doc_path]
            lines.append(f"- {doc_path}")
            for method, path in sorted(items):
                lines.append(f"  - {method} {path}")

    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="문서 API 표기(OpenAPI) 정합 자동 점검")
    ap.add_argument(
        "--docs-root",
        default="docs/v2_specs",
        help="스캔할 문서 루트(기본: docs/v2_specs)",
    )
    ap.add_argument(
        "--openapi-url",
        default="http://localhost:8000/openapi.json",
        help="실행 중인 백엔드의 OpenAPI JSON URL",
    )
    ap.add_argument(
        "--docker-service",
        default="backend",
        help="OpenAPI HTTP 접근이 실패할 때 fallback으로 사용할 docker compose service명",
    )
    ap.add_argument(
        "--out-dir",
        default="DataAnalysisExpert/doc_ops/outputs",
        help="리포트 출력 디렉터리",
    )
    args = ap.parse_args(argv)

    repo_root = Path.cwd()
    docs_root = (repo_root / args.docs_root).resolve()
    out_dir = (repo_root / args.out_dir).resolve()

    if not docs_root.exists():
        print(f"docs_root가 존재하지 않습니다: {docs_root}", file=sys.stderr)
        return 2

    spec = fetch_openapi_json(args.openapi_url, args.docker_service)
    openapi_set, openapi_security, openapi_methods_by_path = openapi_operations(spec)

    mentions: list[DocEndpointMention] = []
    for md_file in iter_markdown_files(docs_root):
        rel = md_file.relative_to(repo_root).as_posix()
        text = _read_text(md_file)
        mentions.extend(extract_doc_endpoints(text, rel))

    mentions_by_key: dict[tuple[str, str], list[str]] = defaultdict(list)
    for m in mentions:
        mentions_by_key[(m.method, m.path)].append(m.doc_path)

    total = len(mentions_by_key)
    ok = 0
    missing = 0
    method_mismatch = 0

    rows: list[dict[str, Any]] = []
    missing_by_file: dict[str, list[tuple[str, str]]] = defaultdict(list)

    for (method, path), files in sorted(mentions_by_key.items()):
        key = (method, path)
        if key in openapi_set:
            ok += 1
            status = "OK"
        else:
            if path in openapi_methods_by_path and method not in openapi_methods_by_path[path]:
                method_mismatch += 1
                status = "METHOD_MISMATCH"
            else:
                missing += 1
                status = "MISSING"

            for f in sorted(set(files)):
                missing_by_file[f].append((method, path))

        sec = openapi_security.get(key, "")
        methods_for_path = ",".join(sorted(openapi_methods_by_path.get(path, set())))

        rows.append(
            {
                "status": status,
                "method": method,
                "path": path,
                "doc_files": "|".join(sorted(set(files))),
                "openapi_methods_for_path": methods_for_path,
                "openapi_security_required": sec,
            }
        )

    stamp = _date_stamp()
    out_csv = out_dir / f"doc_openapi_sync_{stamp}.csv"
    out_md = out_dir / f"doc_openapi_sync_{stamp}.md"

    write_csv(out_csv, rows)
    write_md(
        out_md,
        openapi_url=args.openapi_url,
        total_doc_mentions=total,
        ok=ok,
        missing=missing,
        method_mismatch=method_mismatch,
        missing_by_file=missing_by_file,
    )

    print(f"OK: wrote {out_csv}")
    print(f"OK: wrote {out_md}")
    print(f"SUMMARY: total={total}, ok={ok}, missing={missing}, method_mismatch={method_mismatch}")

    # Non-zero exit for CI-style usage if there are mismatches.
    return 0 if (missing == 0 and method_mismatch == 0) else 1


if __name__ == "__main__":
    raise SystemExit(main())
