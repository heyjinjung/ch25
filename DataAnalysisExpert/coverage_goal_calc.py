from pathlib import Path
import re
from typing import Dict, List, Tuple


def parse_rows(text: str) -> List[Tuple[str, int, int, float]]:
    lines = text.splitlines()
    table_start = None
    for i, line in enumerate(lines):
        candidate = line.strip().lstrip("\ufeff")
        if candidate.startswith("Name") and "Stmts" in candidate and "Cover" in candidate:
            table_start = i + 2
            break
    if table_start is None:
        raise ValueError("Coverage table header not found")

    rows = []
    for line in lines[table_start:]:
        if line.strip().startswith("-"):
            continue
        if not line.strip():
            continue
        if line.strip().startswith("==="):
            break
        parts = re.split(r"\s+", line.strip())
        if len(parts) < 4:
            continue
        name = parts[0]
        try:
            stmts = int(parts[1])
            miss = int(parts[2])
            cover = float(parts[3].rstrip("%"))
        except ValueError:
            continue
        rows.append((name, stmts, miss, cover))
    return rows


def domain_of(path: str) -> str | None:
    p = path.replace("\\", "/")
    if "/api/admin/ops_routes.py" in p or "/services/ops_" in p:
        return "Ops"
    if "/services/hq_" in p or "/services/paste_import_service.py" in p:
        return "Ops"
    if "/services/spending_logger_service.py" in p or "/api/admin/csv_import_routes.py" in p:
        return "Ops"

    if "/services/golden_" in p or "/workers/golden_" in p:
        return "Golden"
    if "/services/retention_intervention_service.py" in p:
        return "Golden"

    if "/api/admin/" in p or "/services/admin_" in p:
        return "Admin"
    if "/middleware/admin_audit.py" in p or "/services/audit_service.py" in p:
        return "Admin"

    if "/services/v2_" in p and "_game_service.py" in p:
        return "Game"
    if "/services/team_battle" in p or "/api/team_battle" in p:
        return "Game"
    if "/services/mission_service.py" in p or "/services/streak_service.py" in p:
        return "Game"
    if "/api/exchange_routes.py" in p or "/services/v2_exchange_service.py" in p:
        return "Game"
    if "/services/ticket_zero_service.py" in p:
        return "Game"

    return None


def aggregate(rows: List[Tuple[str, int, int, float]]) -> Dict[str, Dict[str, int]]:
    summary: Dict[str, Dict[str, int]] = {}
    for name, stmts, miss, _ in rows:
        dom = domain_of(name)
        if dom is None:
            continue
        if dom not in summary:
            summary[dom] = {"stmts": 0, "miss": 0}
        summary[dom]["stmts"] += stmts
        summary[dom]["miss"] += miss
    return summary


def main() -> None:
    report_path = Path("targeted_coverage.txt")
    if not report_path.exists():
        raise SystemExit("targeted_coverage.txt not found")

    try:
        text = report_path.read_text(encoding="utf-8")
    except UnicodeError:
        text = report_path.read_text(encoding="utf-16")

    rows = parse_rows(text)
    summary = aggregate(rows)

    print("## Coverage Goal: 50% (Additional Covered Statements Needed)")
    print("Domain | Statements | Current Covered | Needed Covered | Gap")
    print("--- | ---: | ---: | ---: | ---:")

    for dom in ["Ops", "Golden", "Admin", "Game"]:
        if dom not in summary:
            print(f"{dom} | 0 | 0 | 0 | 0")
            continue
        stmts = summary[dom]["stmts"]
        miss = summary[dom]["miss"]
        covered = stmts - miss
        needed = int((stmts * 0.5) + 0.9999)
        gap = max(0, needed - covered)
        print(f"{dom} | {stmts} | {covered} | {needed} | {gap}")


if __name__ == "__main__":
    main()
