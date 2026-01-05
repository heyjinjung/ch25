from __future__ import annotations

import argparse
import csv
import os
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path


@dataclass(frozen=True)
class DbMatch:
    nickname: str
    user_id: int
    in_external_ranking: bool
    source: str


def _normalize(s: str | None) -> str:
    return (s or "").strip()


def _decode_hex_utf8(hex_s: str | None) -> str:
    if not hex_s:
        return ""
    try:
        return bytes.fromhex(hex_s.strip()).decode("utf-8", errors="replace").strip()
    except ValueError:
        return ""


def _today_str() -> str:
    return date.today().isoformat()


def _read_retention_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return [dict(r) for r in csv.DictReader(f)]


def _run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, text=True, encoding="utf-8")


def _docker_env(container: str, key: str) -> str:
    # Read env var from container without printing it.
    p = _run(["docker", "exec", container, "printenv", key])
    return p.stdout.strip()


def _mysql_query(container: str, root_password: str, database: str, sql: str) -> str:
    # Use MYSQL_PWD to avoid leaking password in argv.
    p = _run(
        [
            "docker",
            "exec",
            "-e",
            f"MYSQL_PWD={root_password}",
            container,
            "mysql",
            "-uroot",
            "-D",
            database,
            "-N",
            "-B",
            "-e",
            sql,
        ]
    )
    return p.stdout


def _escape_sql_literal(s: str) -> str:
    # Minimal escape for single quotes.
    return s.replace("'", "''")


def fetch_matches(container: str, nicknames: set[str], *, dbname_override: str | None = None) -> dict[str, DbMatch]:
    root_pw = _docker_env(container, "MYSQL_ROOT_PASSWORD")
    dbname = dbname_override or _docker_env(container, "MYSQL_DATABASE")

    if not nicknames:
        return {}

    matches: dict[str, DbMatch] = {}

    # NOTE: Avoid WHERE IN (...) with Korean literals due to host/terminal encoding issues.
    # Data size is small, so we fetch all candidates and match in Python.
    user_sql = (
        "SELECT u.id, HEX(u.nickname), CASE WHEN er.user_id IS NULL THEN 0 ELSE 1 END AS in_ext "
        "FROM user u "
        "LEFT JOIN external_ranking_data er ON er.user_id = u.id "
        "WHERE u.nickname IS NOT NULL AND u.nickname <> ''"
    )
    out = _mysql_query(container, root_pw, dbname, user_sql)
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        user_id = int(parts[0])
        nickname = _decode_hex_utf8(parts[1])
        in_ext = parts[2].strip() == "1"
        if nickname:
            matches.setdefault(
                nickname,
                DbMatch(nickname=nickname, user_id=user_id, in_external_ranking=in_ext, source="user.nickname"),
            )

    # CRM profile mapping (admin_user_profile.real_name) often stores "실명/사이트닉".
    # Build lookup keys from the split parts to match retention CSV rows.
    profile_sql = (
        "SELECT ap.user_id, HEX(ap.real_name), CASE WHEN er.user_id IS NULL THEN 0 ELSE 1 END AS in_ext "
        "FROM admin_user_profile ap "
        "LEFT JOIN external_ranking_data er ON er.user_id = ap.user_id "
        "WHERE ap.real_name IS NOT NULL AND ap.real_name <> ''"
    )
    prof_out = _mysql_query(container, root_pw, dbname, profile_sql)
    for line in prof_out.splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        user_id = int(parts[0])
        real_name = _decode_hex_utf8(parts[1])
        in_ext = parts[2].strip() == "1"
        if not real_name:
            continue

        # Keep original full string as a fallback key.
        matches.setdefault(
            real_name,
            DbMatch(nickname=real_name, user_id=user_id, in_external_ranking=in_ext, source="admin_user_profile.real_name"),
        )

        if "/" in real_name:
            left, right = real_name.split("/", 1)
            left_n = _normalize(left)
            right_n = _normalize(right)
            if left_n:
                matches.setdefault(
                    left_n,
                    DbMatch(nickname=left_n, user_id=user_id, in_external_ranking=in_ext, source="admin_user_profile.real_name:left"),
                )
            if right_n:
                matches.setdefault(
                    right_n,
                    DbMatch(nickname=right_n, user_id=user_id, in_external_ranking=in_ext, source="admin_user_profile.real_name:right"),
                )

    return matches


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Cross-analyze retention list vs Docker MySQL signup and external_ranking_data listing"
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
        "--db-container",
        type=str,
        default="xmas-db",
        help="Docker container name for MySQL (default: xmas-db)",
    )
    parser.add_argument(
        "--db-name",
        type=str,
        default="",
        help="Optional database name override inside container (e.g., xmas_event_import_20260105)",
    )
    args = parser.parse_args()

    if not args.retention_csv.exists():
        raise SystemExit(f"Retention CSV not found: {args.retention_csv}")

    include_groups = {g.strip() for g in args.groups.split(",") if g.strip()}
    retention_rows = _read_retention_csv(args.retention_csv)

    filtered = [r for r in retention_rows if _normalize(r.get("retention_group_updated")) in include_groups]

    nickname_candidates: set[str] = set()
    for r in filtered:
        nickname_candidates.add(_normalize(r.get("nickname")))
        nickname_candidates.add(_normalize(r.get("nickname_site")))
    nickname_candidates.discard("")

    try:
        matches = fetch_matches(args.db_container, nickname_candidates, dbname_override=args.db_name.strip() or None)
    except subprocess.CalledProcessError as e:
        stderr = (e.stderr or "").strip()
        raise SystemExit(
            "Docker DB 조회에 실패했습니다. 확인: (1) docker 실행중인지 (2) 컨테이너명(xmas-db) 맞는지 (3) external_ranking_data 테이블 존재 여부\n"
            f"stderr: {stderr[:400]}"
        )

    out_rows: list[dict[str, str]] = []
    for r in filtered:
        group = _normalize(r.get("retention_group_updated"))
        nickname = _normalize(r.get("nickname"))
        nickname_site = _normalize(r.get("nickname_site"))

        matched_by = ""
        user_id = ""
        signed_up = "N"
        in_ext = "N"

        if nickname and nickname in matches:
            m = matches[nickname]
            matched_by = m.source
            user_id = str(m.user_id)
            signed_up = "Y"
            in_ext = "Y" if m.in_external_ranking else "N"
        elif nickname_site and nickname_site in matches:
            m = matches[nickname_site]
            matched_by = m.source
            user_id = str(m.user_id)
            signed_up = "Y"
            in_ext = "Y" if m.in_external_ranking else "N"

        out_rows.append(
            {
                "retention_group_updated": group,
                "nickname": nickname,
                "nickname_site": nickname_site,
                "first_charge_date": _normalize(r.get("first_charge_date")),
                "last_charge_date": _normalize(r.get("last_charge_date")),
                "is_signed_up": signed_up,
                "matched_by": matched_by,
                "user_id": user_id,
                "is_in_external_deposit_ranking": in_ext,
            }
        )

    out_rows.sort(key=lambda x: (0 if x["is_signed_up"] == "N" else 1, x["retention_group_updated"], x["nickname"]))

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
        writer.writerows(out_rows)

    total = len(out_rows)
    signed_up_count = sum(1 for r in out_rows if r["is_signed_up"] == "Y")
    not_signed_count = total - signed_up_count

    group_counts = Counter([r["retention_group_updated"] for r in out_rows])
    ext_counts = Counter([r["is_in_external_deposit_ranking"] for r in out_rows if r["is_signed_up"] == "Y"])

    def _display_person(r: dict[str, str]) -> str:
        base = r["nickname"].strip() if r.get("nickname") else ""
        site = r["nickname_site"].strip() if r.get("nickname_site") else ""
        if base and site:
            return f"{base} ({site})"
        return base or site

    report_lines: list[str] = []
    report_lines.append("# 리텐션(활성/이탈단기) × 가입여부 × 외부입금랭킹 등재 리포트\n")
    report_lines.append(f"- 생성일: {_today_str()}\n")
    report_lines.append(f"- 입력: {args.retention_csv.as_posix()}\n")
    report_lines.append(f"- 출력 CSV: {args.out_csv.as_posix()}\n")
    report_lines.append(f"- DB 조회: docker 컨테이너 `{args.db_container}` 내 MySQL\n")
    report_lines.append(f"- 포함 그룹: {', '.join(sorted(include_groups))}\n")
    report_lines.append("- 개인정보: 연락처/핸드폰 등 PII는 사용/출력하지 않음\n")

    report_lines.append("\n## 1) 요약\n")
    report_lines.append(f"- 대상(행 기준): {total}\n")
    report_lines.append(f"- 가입 O: {signed_up_count}\n")
    report_lines.append(f"- 가입 X(연락 우선): {not_signed_count}\n")

    report_lines.append("\n## 2) 그룹별 분포\n")
    for g, c in sorted(group_counts.items(), key=lambda x: (-x[1], x[0])):
        report_lines.append(f"- {g}: {c}\n")

    report_lines.append("\n## 3) 외부입금랭킹 등재(가입 O 대상)\n")
    for k in ["Y", "N"]:
        if k in ext_counts:
            report_lines.append(f"- {k}: {ext_counts[k]}\n")

    report_lines.append("\n## 4) 가입 O 인원 리스트\n")
    signed_rows = [r for r in out_rows if r["is_signed_up"] == "Y"]
    if not signed_rows:
        report_lines.append("- (없음)\n")
    else:
        report_lines.append("\n### 4-1) 전체\n")
        for r in signed_rows:
            report_lines.append(f"- [{r['retention_group_updated']}] {_display_person(r)}\n")

        report_lines.append("\n### 4-2) 외부입금랭킹 Y\n")
        signed_y = [r for r in signed_rows if r["is_in_external_deposit_ranking"] == "Y"]
        if not signed_y:
            report_lines.append("- (없음)\n")
        else:
            for r in signed_y:
                report_lines.append(f"- [{r['retention_group_updated']}] {_display_person(r)}\n")

        report_lines.append("\n### 4-3) 외부입금랭킹 N\n")
        signed_n = [r for r in signed_rows if r["is_in_external_deposit_ranking"] == "N"]
        if not signed_n:
            report_lines.append("- (없음)\n")
        else:
            for r in signed_n:
                report_lines.append(f"- [{r['retention_group_updated']}] {_display_person(r)}\n")

    report_lines.append("\n## 5) 연락 우선: 가입 X 리스트\n")
    not_signed = [r for r in out_rows if r["is_signed_up"] == "N"]
    if not not_signed:
        report_lines.append("- (없음)\n")
    else:
        for r in not_signed:
            name = r["nickname"] or r["nickname_site"]
            report_lines.append(f"- [{r['retention_group_updated']}] {name}\n")

    args.out_report.parent.mkdir(parents=True, exist_ok=True)
    args.out_report.write_text("".join(report_lines), encoding="utf-8")

    print(f"Wrote CSV: {args.out_csv}")
    print(f"Wrote report: {args.out_report}")
    print(f"Total={total} signed_up={signed_up_count} not_signed={not_signed_count}")


if __name__ == "__main__":
    main()
