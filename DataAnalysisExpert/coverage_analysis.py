import re
from pathlib import Path

def parse_coverage_report(text: str) -> dict:
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
        # Columns are fixed-width in coverage output; split by whitespace
        parts = re.split(r"\s+", line.strip())
        if len(parts) < 4:
            continue
        # Name can include backslashes without spaces, so it's safe to take first token
        name = parts[0]
        try:
            stmts = int(parts[1])
            miss = int(parts[2])
            cover = float(parts[3].rstrip("%"))
        except ValueError:
            continue
        rows.append({"name": name, "stmts": stmts, "miss": miss, "cover": cover})

    total_stmts = sum(r["stmts"] for r in rows)
    total_miss = sum(r["miss"] for r in rows)
    total_cover = 0.0
    if total_stmts > 0:
        total_cover = (total_stmts - total_miss) / total_stmts * 100.0

    zero_coverage = [r for r in rows if r["cover"] == 0.0 and r["stmts"] > 0]
    low_coverage = [r for r in rows if 0.0 < r["cover"] < 20.0]
    top_low = sorted(low_coverage, key=lambda r: r["cover"])[:10]

    return {
        "rows": rows,
        "total_stmts": total_stmts,
        "total_miss": total_miss,
        "total_cover": total_cover,
        "zero_coverage": zero_coverage,
        "top_low": top_low,
    }


def main() -> None:
    report_path = Path("targeted_coverage.txt")
    if not report_path.exists():
        raise SystemExit("targeted_coverage.txt not found")

    try:
        text = report_path.read_text(encoding="utf-8")
    except UnicodeError:
        text = report_path.read_text(encoding="utf-16")
    result = parse_coverage_report(text)

    print("## Coverage Summary (targeted_coverage.txt)")
    print(f"Total statements: {result['total_stmts']}")
    print(f"Total missed: {result['total_miss']}")
    print(f"Overall coverage: {result['total_cover']:.2f}%")
    print("")

    print("## Zero Coverage Files (stmts > 0)")
    for r in sorted(result["zero_coverage"], key=lambda r: r["name"]):
        print(f"- {r['name']}: {r['cover']:.1f}% ({r['stmts']} stmts)")
    if not result["zero_coverage"]:
        print("- None")
    print("")

    print("## Lowest Coverage (Top 10 under 20%)")
    for r in result["top_low"]:
        print(f"- {r['name']}: {r['cover']:.1f}% ({r['miss']}/{r['stmts']} missed)")
    if not result["top_low"]:
        print("- None")


if __name__ == "__main__":
    main()
