from __future__ import annotations

import datetime as dt
import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


LEARNED_ROOT_REL = Path("docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_")

RE_DATE_PREFIX = re.compile(r"^(?P<date>\d{8})[_-].+")
RE_META_LINE = re.compile(r"^\s*(?P<key>[^:]{1,50})\s*:\s*(?P<value>.+?)\s*$")


@dataclass(frozen=True)
class DocItem:
    rel_path: str
    file_name: str
    date_prefix: str | None
    created_at: str
    created_date: dt.date | None


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _as_rel(path: Path, repo_root: Path) -> str:
    return path.relative_to(repo_root).as_posix()


def _iter_domain_dirs(learned_root: Path) -> Iterable[Path]:
    for child in sorted(learned_root.iterdir()):
        if child.is_dir() and not child.name.startswith("__"):
            yield child


def _extract_date_prefix(file_name: str) -> str | None:
    m = RE_DATE_PREFIX.match(file_name)
    return m.group("date") if m else None


def _read_text_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="cp949", errors="replace")


def _extract_meta_created_at(text: str) -> str:
    for line in text.splitlines()[:80]:
        m = RE_META_LINE.match(line)
        if not m:
            continue
        if m.group("key").strip() == "작성일":
            return m.group("value").strip()
    return ""


def _parse_date(value: str) -> dt.date | None:
    raw = (value or "").strip()
    if not raw:
        return None
    # common formats
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(raw, fmt).date()
        except ValueError:
            pass
    # allow loose tokens like '2026-02-06 (KST)'
    m = re.search(r"(\d{4})[-./](\d{2})[-./](\d{2})", raw)
    if m:
        try:
            return dt.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


def _collect_items(domain_dir: Path, repo_root: Path) -> list[DocItem]:
    items: list[DocItem] = []
    for p in sorted(domain_dir.glob("*.md")):
        if p.name.lower().startswith("readme"):
            continue
        text = _read_text_safe(p)
        created_at = _extract_meta_created_at(text)
        created_date = _parse_date(created_at)
        items.append(
            DocItem(
                rel_path=_as_rel(p, repo_root),
                file_name=p.name,
                date_prefix=_extract_date_prefix(p.name),
                created_at=created_at,
                created_date=created_date,
            )
        )
    return items


def _pick_stable_sot(items: list[DocItem]) -> list[DocItem]:
    # Heuristic: SoT-like names
    sot = [i for i in items if i.file_name.startswith("v2_") and "sot" in i.file_name.lower()]
    # Also include the numbered domain SoT (e.g., 07.level.md) as a stable entry point
    numbered = [i for i in items if re.match(r"^\d{2}\..+\.md$", i.file_name)]
    # Keep order: numbered first then sot
    by_name = {i.rel_path: i for i in (numbered + sot)}
    result = list(by_name.values())
    return sorted(result, key=lambda x: x.file_name)


def _pick_recent(items: list[DocItem], days: int = 30, limit: int = 15) -> list[DocItem]:
    cutoff = dt.date.today() - dt.timedelta(days=days)

    dated: list[tuple[dt.date, DocItem]] = []
    for i in items:
        d: dt.date | None = i.created_date
        if d is None and i.date_prefix:
            try:
                d = dt.datetime.strptime(i.date_prefix, "%Y%m%d").date()
            except ValueError:
                d = None
        if d is None:
            continue
        if d >= cutoff:
            dated.append((d, i))

    dated.sort(key=lambda x: (x[0], x[1].file_name), reverse=True)
    return [i for _, i in dated[:limit]]


def _md_link(rel_path: str) -> str:
    return f"[{rel_path}]({rel_path})"


def _label_date(item: DocItem) -> str:
    if item.created_date is not None:
        return item.created_date.isoformat()
    if item.date_prefix:
        try:
            return dt.datetime.strptime(item.date_prefix, "%Y%m%d").date().isoformat()
        except ValueError:
            return item.date_prefix
    return ""


def _render_readme(domain: str, domain_rel: str, stable: list[DocItem], recent: list[DocItem]) -> str:
    today = dt.date.today().isoformat()

    lines: list[str] = []
    lines.append("문서 타입: 도메인 허브")
    lines.append("버전: v1.0")
    lines.append(f"작성일: {today}")
    lines.append("작성자: GitHub Copilot")
    lines.append("대상: BE/FE/기획/운영")
    lines.append("상태: ACTIVE")
    lines.append("")
    lines.append("## 1. 목적 (Purpose)")
    lines.append(f"{domain} 도메인 문서를 ‘찾기 쉽게’ 모으는 랜딩 페이지다.")
    lines.append("")
    lines.append("## 2. 범위 (Scope)")
    lines.append(f"- 기준 경로: `{domain_rel}`")
    lines.append("- 본 문서는 링크/탐색 편의를 위한 허브이며, 정책/구현 변경을 포함하지 않는다.")
    lines.append("")

    lines.append("## 3. 빠른 링크")
    if stable:
        for item in stable[:15]:
            date_label = _label_date(item)
            prefix = f"{date_label} · " if date_label else ""
            lines.append(f"- {prefix}{_md_link(item.rel_path)}")
    else:
        lines.append("- (정본/핵심 문서 후보 없음)")
    lines.append("")

    lines.append("## 4. 최근 변경 기록(최근 30일)")
    if recent:
        for item in recent:
            date_label = _label_date(item)
            prefix = f"{date_label} · " if date_label else ""
            lines.append(f"- {prefix}{_md_link(item.rel_path)}")
    else:
        lines.append("- (최근 30일 내 문서 없음)")
    lines.append("")

    lines.append("## 5. 운영 규칙")
    lines.append("- 정본(Stable SoT)과 변경기록(learned_)을 혼동하지 않는다.")
    lines.append("- 이동/통합 시 기존 경로는 Redirect 스텁으로 호환성을 유지한다.")
    lines.append("")

    lines.append("## 6. 변경 이력")
    lines.append(f"- v1.0 ({today}, GitHub Copilot): 도메인 허브 자동 생성")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate domain hub README.md files under learned_/*")
    parser.add_argument(
        "--domains",
        type=str,
        default="",
        help="Comma-separated domain names (e.g., 'vault,user,auth'). Empty means all domains.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not write files; only print what would be generated.",
    )
    args = parser.parse_args()

    repo_root = _repo_root()
    learned_root = repo_root / LEARNED_ROOT_REL
    if not learned_root.exists():
        raise SystemExit(f"Missing learned_ root: {learned_root}")

    selected_domains: set[str] | None = None
    if args.domains.strip():
        selected_domains = {d.strip() for d in args.domains.split(",") if d.strip()}

    created = 0
    for domain_dir in _iter_domain_dirs(learned_root):
        domain = domain_dir.name
        if selected_domains is not None and domain not in selected_domains:
            continue
        items = _collect_items(domain_dir, repo_root)
        if not items:
            continue

        stable = _pick_stable_sot(items)
        recent = _pick_recent(items)

        readme_path = domain_dir / "README.md"
        content = _render_readme(domain, domain_dir.relative_to(repo_root).as_posix(), stable, recent)
        if args.dry_run:
            print(f"DRY_RUN: would write {readme_path}")
        else:
            readme_path.write_text(content, encoding="utf-8")
            created += 1

    if args.dry_run:
        print("OK: dry-run complete")
    else:
        print(f"OK: generated {created} domain READMEs")


if __name__ == "__main__":
    main()
