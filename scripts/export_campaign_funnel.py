import argparse
import csv
from pathlib import Path

import pymysql


def export_csv(conn, sql: str, out_path: Path) -> int:
    with conn.cursor() as cur:
        cur.execute(sql)
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)

    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-02-04", help="Campaign start date (YYYY-MM-DD)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3307)
    parser.add_argument("--user", default="root")
    parser.add_argument("--password", default="2026")
    parser.add_argument("--db", default="xmas_event")
    parser.add_argument("--outdir", default="marketing_analysis_results")
    args = parser.parse_args()

    outdir = Path(args.outdir)
    start = args.start

    conn = pymysql.connect(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.db,
        charset="utf8mb4",
    )

    try:
        joins_sql = f"""
            SELECT
                nickname,
                cc_id,
                segment,
                total_margin,
                total_charge,
                linked_user_id,
                linked_at
            FROM hq_prospective_user
            WHERE is_joined=1
              AND linked_at IS NOT NULL
              AND linked_at >= '{start}'
            ORDER BY linked_at ASC
        """.strip()

        click_proxy_sql = f"""
            SELECT
                u.id,
                u.cc_id,
                u.nickname,
                u.telegram_id,
                u.created_at,
                u.first_deposit_at,
                p.segment AS hq_segment,
                p.linked_at
            FROM v2_user u
            LEFT JOIN hq_prospective_user p ON p.linked_user_id = u.id
            WHERE u.created_at >= '{start}'
            ORDER BY u.created_at ASC
        """.strip()

        joins_path = outdir / f"funnel_joins_since_{start.replace('-', '')}.csv"
        click_proxy_path = outdir / f"funnel_click_proxy_new_users_since_{start.replace('-', '')}.csv"

        joins_rows = export_csv(conn, joins_sql, joins_path)
        click_proxy_rows = export_csv(conn, click_proxy_sql, click_proxy_path)

        print(f"WROTE {joins_path} rows={joins_rows}")
        print(f"WROTE {click_proxy_path} rows={click_proxy_rows}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
