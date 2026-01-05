from __future__ import annotations

import csv
import os
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path

# Add project root to path (so `import app...` works when running as a script)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, select
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError

from dotenv import load_dotenv

from app.models.external_ranking import ExternalRankingData
from app.models.user import User


def _resolve_database_url(raw_url: str, *, host_override: str | None, port_override: int | None) -> str:
    """Resolve a usable DB URL for scripts running on the host (Windows).

    Repo's default `.env` uses `@db:3306` (docker network DNS). When running scripts
    on the host, we need `localhost:<published_port>` (docker-compose.yml uses 3307).
    """

    url = make_url(raw_url.strip())

    target_port = port_override or url.port or 3307
    if host_override:
        return str(url.set(host=host_override, port=target_port))

    # Auto-rewrite docker DNS host `db` to `localhost:3307` by default.
    if (url.host or "").lower() == "db":
        return str(url.set(host="localhost", port=target_port))

    return str(url)


@dataclass(frozen=True)
class OutputRow:
    retention_group_updated: str
    nickname: str
    nickname_site: str
    first_charge_date: str
    last_charge_date: str
    is_signed_up: bool
    matched_by: str
    user_id: str
    is_in_external_deposit_ranking: str  # Y/N/UNKNOWN


def _read_retention_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(r) for r in reader]


def _normalize(s: str | None) -> str:
    return (s or "").strip()


def _today_str() -> str:
    return date.today().isoformat()


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Cross-analyze retention list vs DB signup and external deposit ranking listing"
    )
    parser.add_argument(
        "--retention-csv",
        type=Path,
        default=Path("docs/06_ops/202601/exports/retention_group_people_20251229.csv"),
    )
    parser.add_argument(
        "--out-csv",
        type=Path,
        default=Path("docs/06_ops/202601/exports/retention_contact_targets_20251229.csv"),
    )
    parser.add_argument(
        "--out-report",
        type=Path,
        default=Path("docs/06_ops/202601/retention_x_db_signup_external_ranking_report_20251229_ko.md"),
    )
    parser.add_argument(
        "--groups",
        type=str,
        default="활성,이탈위험(단기)",
        help="Comma-separated retention groups to include",
    )
    parser.add_argument(
        "--database-url",
        type=str,
        default="",
        help="Optional DB URL override. If omitted, uses .env DATABASE_URL (auto-rewrites @db:3306 -> localhost:3307).",
    )
    parser.add_argument(
        "--db-host",
        type=str,
        default="",
        help="Optional DB host override (e.g., localhost).",
    )
    parser.add_argument(
        "--db-port",
        type=int,
        default=3307,
        help="Optional DB port override (default: 3307, from docker-compose port mapping).",
    )
    args = parser.parse_args()

    if not args.retention_csv.exists():
        raise SystemExit(f"Retention CSV not found: {args.retention_csv}")

    retention_rows = _read_retention_csv(args.retention_csv)
    include_groups = {g.strip() for g in args.groups.split(",") if g.strip()}

    filtered = []
    for r in retention_rows:
        group = _normalize(r.get("retention_group_updated"))
        if group in include_groups:
            filtered.append(r)

    # Build candidate nickname set for DB lookup
    nickname_candidates: set[str] = set()
    for r in filtered:
        nickname_candidates.add(_normalize(r.get("nickname")))
        nickname_candidates.add(_normalize(r.get("nickname_site")))
    nickname_candidates.discard("")

    # Load .env for host-side scripts
    load_dotenv()
    raw_db_url = args.database_url.strip() or os.getenv("DATABASE_URL", "").strip()
    if not raw_db_url:
        raise SystemExit(
            "DATABASE_URL is not set. Provide --database-url or set DATABASE_URL in .env (host-run scripts need localhost:3307)."
        )

    resolved_db_url = _resolve_database_url(
        raw_db_url,
        host_override=args.db_host.strip() or None,
        port_override=args.db_port,
    )

    engine = create_engine(resolved_db_url, future=True)
    # Preflight connection; fall back to root if app user auth fails due to persisted volumes.
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except OperationalError as e:
        msg = str(getattr(e, "orig", e))
        # MySQL auth error commonly surfaces as errno 1045.
        if "1045" in msg:
            root_pw = os.getenv("MYSQL_ROOT_PASSWORD", "").strip()
            if root_pw:
                u = make_url(resolved_db_url)
                if (u.username or "") != "root":
                    engine = create_engine(str(u.set(username="root", password=root_pw)), future=True)
                    with engine.connect() as conn:
                        conn.exec_driver_sql("SELECT 1")
                else:
                    raise
            else:
                raise SystemExit(
                    "DB auth failed (1045). Provide correct DATABASE_URL via --database-url, or set MYSQL_ROOT_PASSWORD for fallback."
                ) from e
        else:
            raise
    from sqlalchemy.orm import sessionmaker

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

    db: Session = SessionLocal()
    try:
        # 1) Signup lookup
        nickname_to_user_id: dict[str, int] = {}
        if nickname_candidates:
            stmt = select(User.id, User.nickname).where(User.nickname.in_(sorted(nickname_candidates)))
            for user_id, nickname in db.execute(stmt).all():
                if nickname:
                    nickname_to_user_id[_normalize(nickname)] = int(user_id)

        # 2) External ranking listing lookup
        inspector = inspect(db.get_bind())
        has_external_ranking_table = inspector.has_table("external_ranking_data")

        user_ids = sorted(set(nickname_to_user_id.values()))
        listed_user_ids: set[int] = set()
        if has_external_ranking_table and user_ids:
            stmt2 = select(ExternalRankingData.user_id).where(ExternalRankingData.user_id.in_(user_ids))
            listed_user_ids = {int(r[0]) for r in db.execute(stmt2).all()}

        out_rows: list[OutputRow] = []
        for r in filtered:
            group = _normalize(r.get("retention_group_updated"))
            nickname = _normalize(r.get("nickname"))
            nickname_site = _normalize(r.get("nickname_site"))

            matched_by = ""
            user_id_val: int | None = None
            if nickname and nickname in nickname_to_user_id:
                matched_by = "nickname"
                user_id_val = nickname_to_user_id[nickname]
            elif nickname_site and nickname_site in nickname_to_user_id:
                matched_by = "nickname_site"
                user_id_val = nickname_to_user_id[nickname_site]

            is_signed_up = user_id_val is not None
            if not has_external_ranking_table:
                ext_listed = "UNKNOWN"
            else:
                ext_listed = "Y" if (user_id_val is not None and user_id_val in listed_user_ids) else "N"

            out_rows.append(
                OutputRow(
                    retention_group_updated=group,
                    nickname=nickname,
                    nickname_site=nickname_site,
                    first_charge_date=_normalize(r.get("first_charge_date")),
                    last_charge_date=_normalize(r.get("last_charge_date")),
                    is_signed_up=is_signed_up,
                    matched_by=matched_by,
                    user_id=str(user_id_val) if user_id_val is not None else "",
                    is_in_external_deposit_ranking=ext_listed,
                )
            )

        # Sort: not signed-up first, then group, then nickname
        out_rows.sort(
            key=lambda x: (
                0 if not x.is_signed_up else 1,
                x.retention_group_updated,
                x.nickname,
                x.nickname_site,
            )
        )

        args.out_csv.parent.mkdir(parents=True, exist_ok=True)
        with args.out_csv.open("w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "retention_group_updated",
                    "nickname",
                    "nickname_site",
                    "first_charge_date",
                    "last_charge_date",
                    "is_signed_up",
                    "matched_by",
                    "user_id",
                    "is_in_external_deposit_ranking",
                ],
            )
            writer.writeheader()
            for r in out_rows:
                writer.writerow(
                    {
                        "retention_group_updated": r.retention_group_updated,
                        "nickname": r.nickname,
                        "nickname_site": r.nickname_site,
                        "first_charge_date": r.first_charge_date,
                        "last_charge_date": r.last_charge_date,
                        "is_signed_up": "Y" if r.is_signed_up else "N",
                        "matched_by": r.matched_by,
                        "user_id": r.user_id,
                        "is_in_external_deposit_ranking": r.is_in_external_deposit_ranking,
                    }
                )

        # Build report
        total = len(out_rows)
        signed_up = sum(1 for r in out_rows if r.is_signed_up)
        not_signed = total - signed_up

        group_counts = Counter([r.retention_group_updated for r in out_rows])
        ext_counts = Counter([r.is_in_external_deposit_ranking for r in out_rows if r.is_signed_up])

        # Priority: not signed-up
        priority_not_signed = [r for r in out_rows if not r.is_signed_up]

        report_lines: list[str] = []
        report_lines.append(f"# 리텐션(활성/이탈단기) × 가입여부 × 외부입금랭킹 등재 리포트\n")
        report_lines.append(f"- 생성일: {_today_str()}\n")
        report_lines.append(f"- 입력: {args.retention_csv.as_posix()}\n")
        report_lines.append(f"- 출력 CSV: {args.out_csv.as_posix()}\n")
        report_lines.append(f"- 포함 그룹: {', '.join(sorted(include_groups))}\n")
        report_lines.append("- 개인정보: 연락처/핸드폰 등 PII는 사용/출력하지 않음\n")
        report_lines.append("\n## 1) 요약\n")
        report_lines.append(f"- 대상(행 기준): {total}\n")
        report_lines.append(f"- 가입 O: {signed_up}\n")
        report_lines.append(f"- 가입 X(연락 우선): {not_signed}\n")
        report_lines.append("\n## 2) 그룹별 분포\n")
        for g, c in sorted(group_counts.items(), key=lambda x: (-x[1], x[0])):
            report_lines.append(f"- {g}: {c}\n")

        report_lines.append("\n## 3) 외부입금랭킹 등재(가입 O 대상)\n")
        if not has_external_ranking_table:
            report_lines.append("- DB에 `external_ranking_data` 테이블이 없어 등재 여부를 `UNKNOWN`으로 표기\n")
        for k in ["Y", "N", "UNKNOWN"]:
            if k in ext_counts:
                report_lines.append(f"- {k}: {ext_counts[k]}\n")

        report_lines.append("\n## 4) 연락 우선: 가입 X 리스트\n")
        if not priority_not_signed:
            report_lines.append("- (없음)\n")
        else:
            for r in priority_not_signed:
                name = r.nickname or r.nickname_site
                report_lines.append(f"- [{r.retention_group_updated}] {name}\n")

        args.out_report.parent.mkdir(parents=True, exist_ok=True)
        args.out_report.write_text("".join(report_lines), encoding="utf-8")

        print(f"Wrote CSV: {args.out_csv}")
        print(f"Wrote report: {args.out_report}")
        print(f"Total={total} signed_up={signed_up} not_signed={not_signed} external_table={has_external_ranking_table}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
