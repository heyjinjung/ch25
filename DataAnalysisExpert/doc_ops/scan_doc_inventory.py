from __future__ import annotations

import csv
import datetime as dt
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


RE_META_LINE = re.compile(r"^\s*(?P<key>[^:]{1,50})\s*:\s*(?P<value>.+?)\s*$")
RE_FINAL_REVIEW = re.compile(r"\[최종\s*검토일\s*:\s*(?P<value>[^\]]+)\]", re.IGNORECASE)
RE_REDIRECT_LINK = re.compile(r"\(\.\./00_sot_meta/00_A_sot_code_ops_chk/learned_/.+?\)")


@dataclass
class DocRow:
    path: str
    domain: str
    doc_type: str
    version: str
    created_at: str
    author: str
    target: str
    status: str
    final_review_at: str
    redirect_target: str


def _infer_domain(rel_path: str) -> str:
    # learned_ domain: docs/v2_specs/00_sot_meta/00_A.../learned_/{domain}/...
    parts = rel_path.split("/")
    if "learned_" in parts:
        idx = parts.index("learned_")
        if idx + 1 < len(parts):
            return parts[idx + 1]
    # v2_specs by folder
    if rel_path.startswith("docs/v2_specs/"):
        top = rel_path.split("/")[2]
        # 01_core 등은 core로 묶고, 나머지는 상위 폴더로
        if top == "01_core":
            return "core"
        if top == "00_sot_meta":
            return "meta"
        return top
    return "unknown"


def _read_text_safe(path: Path) -> str:
    # try utf-8 then fallback to cp949 for Windows-locale docs
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="cp949", errors="replace")


def _extract_meta(text: str) -> dict[str, str]:
    meta: dict[str, str] = {}
    for line in text.splitlines()[:80]:
        m = RE_META_LINE.match(line)
        if not m:
            continue
        key = m.group("key").strip()
        value = m.group("value").strip()
        # normalize common keys
        meta[key] = value
    return meta


def _extract_final_review(text: str) -> str:
    m = RE_FINAL_REVIEW.search(text)
    return (m.group("value").strip() if m else "")


def _extract_redirect_target(text: str) -> str:
    # heuristic: in our redirect stubs, there's a single link to learned_ target
    # Prefer first markdown link line containing learned_ path.
    for line in text.splitlines()[:120]:
        if "learned_/" in line and "](" in line:
            # get target in markdown link
            start = line.find("](")
            if start != -1:
                end = line.find(")", start + 2)
                if end != -1:
                    return line[start + 2 : end]
    # fallback regex
    m = RE_REDIRECT_LINK.search(text)
    if not m:
        return ""
    return m.group(0).strip("()")


def iter_docs(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.md"):
        # skip huge vendor-ish or irrelevant folders
        rel = path.as_posix()
        if "/node_modules/" in rel or "/.git/" in rel:
            continue
        yield path


def build_inventory(docs_root: Path, repo_root: Path) -> list[DocRow]:
    rows: list[DocRow] = []
    for path in iter_docs(docs_root):
        rel = path.relative_to(repo_root).as_posix()
        text = _read_text_safe(path)
        meta = _extract_meta(text)

        doc_type = meta.get("문서 타입") or meta.get("문서타입") or ""
        version = meta.get("버전") or ""
        created_at = meta.get("작성일") or ""
        author = meta.get("작성자") or ""
        target = meta.get("대상") or ""
        status = meta.get("상태") or ""
        final_review_at = _extract_final_review(text)
        redirect_target = _extract_redirect_target(text) if "Redirect" in status or "리다이렉트" in doc_type else ""

        rows.append(
            DocRow(
                path=rel,
                domain=_infer_domain(rel),
                doc_type=doc_type,
                version=version,
                created_at=created_at,
                author=author,
                target=target,
                status=status,
                final_review_at=final_review_at,
                redirect_target=redirect_target,
            )
        )
    return rows


def write_csv(rows: list[DocRow], out_csv: Path) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "path",
                "domain",
                "doc_type",
                "version",
                "created_at",
                "author",
                "target",
                "status",
                "final_review_at",
                "redirect_target",
            ]
        )
        for r in sorted(rows, key=lambda x: x.path):
            writer.writerow(
                [
                    r.path,
                    r.domain,
                    r.doc_type,
                    r.version,
                    r.created_at,
                    r.author,
                    r.target,
                    r.status,
                    r.final_review_at,
                    r.redirect_target,
                ]
            )


def write_md_summary(rows: list[DocRow], out_md: Path) -> None:
    out_md.parent.mkdir(parents=True, exist_ok=True)

    total = len(rows)
    with_meta = sum(1 for r in rows if r.doc_type or r.status or r.version)
    redirects = sum(1 for r in rows if r.status.lower() == "redirect" or "redirect" in r.status.lower())

    by_domain: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for r in rows:
        by_domain[r.domain] = by_domain.get(r.domain, 0) + 1
        status = (r.status or "(none)").strip()
        by_status[status] = by_status.get(status, 0) + 1

    lines: list[str] = []
    lines.append("문서 타입: 리포트")
    lines.append("버전: v1.0")
    lines.append(f"작성일: {dt.date.today().isoformat()}")
    lines.append("작성자: scan_doc_inventory.py")
    lines.append("대상: docs 전체")
    lines.append("상태: Snapshot")
    lines.append("")
    lines.append("## 1. 요약")
    lines.append(f"- 총 문서 수(.md): {total}")
    lines.append(f"- 메타(문서 타입/상태/버전 중 1개 이상) 존재: {with_meta}")
    lines.append(f"- Redirect 문서 추정: {redirects}")
    lines.append("")
    lines.append("## 2. 도메인별 분포")
    for domain, cnt in sorted(by_domain.items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"- {domain}: {cnt}")
    lines.append("")
    lines.append("## 3. 상태(Status) 분포")
    for status, cnt in sorted(by_status.items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"- {status}: {cnt}")
    lines.append("")
    lines.append("## 4. 샘플(상위 50개)")
    lines.append("| path | domain | doc_type | status | redirect_target |")
    lines.append("| :--- | :--- | :--- | :--- | :--- |")
    for r in sorted(rows, key=lambda x: x.path)[:50]:
        doc_type = (r.doc_type or "").replace("|", "\\|")
        status = (r.status or "").replace("|", "\\|")
        redirect = (r.redirect_target or "").replace("|", "\\|")
        lines.append(f"| {r.path} | {r.domain} | {doc_type} | {status} | {redirect} |")

    out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    docs_root = repo_root / "docs"
    out_dir = Path(__file__).resolve().parent

    stamp = dt.date.today().strftime("%Y%m%d")
    out_csv = out_dir / f"doc_inventory_{stamp}.csv"
    out_md = out_dir / f"doc_inventory_{stamp}.md"

    rows = build_inventory(docs_root=docs_root, repo_root=repo_root)
    write_csv(rows, out_csv)
    write_md_summary(rows, out_md)

    print(f"OK: {len(rows)} docs")
    print(f"CSV: {out_csv}")
    print(f"MD : {out_md}")


if __name__ == "__main__":
    main()
