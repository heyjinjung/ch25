import argparse
import csv
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pymysql


@dataclass
class HqProspect:
    nickname: str
    cc_id: str
    segment: str
    total_margin: int | None
    total_charge: int | None
    is_joined: bool | None
    linked_at: datetime | None
    linked_user_id: int | None
    updated_at: datetime | None


@dataclass
class V2User:
    id: int
    nickname: str | None
    cc_id: str
    telegram_id: int | None
    created_at: datetime
    first_deposit_at: datetime | None


def parse_start(d: str) -> datetime:
    return datetime.fromisoformat(d + " 00:00:00")


def read_names(path: Path) -> list[str]:
    names: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        name = raw.strip()
        if not name:
            continue
        names.append(name)
    return names


def best_hq_per_nickname(rows: list[HqProspect]) -> dict[str, HqProspect]:
    # Pick the most recently updated prospect for a nickname.
    best: dict[str, HqProspect] = {}
    for r in rows:
        cur = best.get(r.nickname)
        if cur is None:
            best[r.nickname] = r
            continue
        cur_key = cur.updated_at or datetime.min
        new_key = r.updated_at or datetime.min
        if new_key > cur_key:
            best[r.nickname] = r
    return best


def best_v2_per_nickname(rows: list[V2User]) -> dict[str, V2User]:
    best: dict[str, V2User] = {}
    for r in rows:
        if not r.nickname:
            continue
        cur = best.get(r.nickname)
        if cur is None or r.created_at > cur.created_at:
            best[r.nickname] = r
    return best


def chunked(seq: list[Any], size: int) -> list[list[Any]]:
    return [seq[i : i + size] for i in range(0, len(seq), size)]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-02-04", help="Campaign start date (YYYY-MM-DD)")
    parser.add_argument(
        "--in",
        dest="in_path",
        default="marketing_analysis_results/sent_list_20260206.txt",
        help="newline-separated nickname list",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3307)
    parser.add_argument("--user", default="root")
    parser.add_argument("--password", default="2026")
    parser.add_argument("--db", default="xmas_event")
    parser.add_argument("--outdir", default="marketing_analysis_results")
    args = parser.parse_args()

    start_dt = parse_start(args.start)
    in_path = Path(args.in_path)
    outdir = Path(args.outdir)

    names = read_names(in_path)
    sent_total = len(names)

    conn = pymysql.connect(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.db,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
    )

    try:
        hq_rows: list[HqProspect] = []
        v2_rows: list[V2User] = []

        # Avoid very long IN clause; chunk defensively.
        for chunk in chunked(names, 200):
            placeholders = ",".join(["%s"] * len(chunk))

            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT nickname, cc_id, segment, total_margin, total_charge,
                           is_joined, linked_at, linked_user_id, updated_at
                    FROM hq_prospective_user
                    WHERE nickname IN ({placeholders})
                    """.strip(),
                    chunk,
                )
                for r in cur.fetchall():
                    hq_rows.append(
                        HqProspect(
                            nickname=r["nickname"],
                            cc_id=r["cc_id"],
                            segment=r["segment"],
                            total_margin=r.get("total_margin"),
                            total_charge=r.get("total_charge"),
                            is_joined=bool(r["is_joined"]) if r.get("is_joined") is not None else None,
                            linked_at=r.get("linked_at"),
                            linked_user_id=r.get("linked_user_id"),
                            updated_at=r.get("updated_at"),
                        )
                    )

            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT id, nickname, cc_id, telegram_id, created_at, first_deposit_at
                    FROM v2_user
                    WHERE nickname IN ({placeholders})
                    """.strip(),
                    chunk,
                )
                for r in cur.fetchall():
                    v2_rows.append(
                        V2User(
                            id=r["id"],
                            nickname=r.get("nickname"),
                            cc_id=r["cc_id"],
                            telegram_id=r.get("telegram_id"),
                            created_at=r["created_at"],
                            first_deposit_at=r.get("first_deposit_at"),
                        )
                    )

        hq_map = best_hq_per_nickname(hq_rows)
        v2_map = best_v2_per_nickname(v2_rows)

        out_csv = outdir / f"funnel_sent_list_user_status_since_{args.start.replace('-', '')}.csv"
        out_md = outdir / f"funnel_sent_list_analysis_since_{args.start.replace('-', '')}.md"

        outdir.mkdir(parents=True, exist_ok=True)

        joined_after_start = 0
        click_proxy_after_start = 0
        deposit_after_start = 0
        hq_found = 0
        v2_found = 0

        by_segment: dict[str, int] = {}
        joined_by_date: dict[str, int] = {}
        detail_rows: list[dict[str, Any]] = []

        with out_csv.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(
                [
                    "nickname",
                    "hq_found",
                    "segment",
                    "total_margin",
                    "total_charge",
                    "is_joined",
                    "linked_at",
                    "linked_user_id",
                    "v2_found",
                    "v2_user_id",
                    "v2_created_at",
                    "first_deposit_at",
                    "notes",
                ]
            )

            for name in names:
                hq = hq_map.get(name)
                v2 = v2_map.get(name)

                notes: list[str] = []

                if hq is not None:
                    hq_found += 1
                    by_segment[hq.segment] = by_segment.get(hq.segment, 0) + 1
                else:
                    notes.append("NOT_IN_HQ_180")

                if v2 is not None:
                    v2_found += 1

                joined = False
                if hq is not None and hq.is_joined and hq.linked_at is not None and hq.linked_at >= start_dt:
                    joined = True
                    joined_after_start += 1
                    joined_date = hq.linked_at.date().isoformat()
                    joined_by_date[joined_date] = joined_by_date.get(joined_date, 0) + 1
                    notes.append("JOINED_AFTER_START")

                clicked_proxy = False
                if v2 is not None and v2.created_at >= start_dt:
                    clicked_proxy = True
                    click_proxy_after_start += 1
                    notes.append("CLICK_PROXY_NEW_USER")

                deposited = False
                if v2 is not None and v2.first_deposit_at is not None and v2.first_deposit_at >= start_dt:
                    deposited = True
                    deposit_after_start += 1
                    notes.append("DEPOSIT_AFTER_START")

                if (not joined) and (hq is not None and hq.is_joined):
                    notes.append("JOINED_BEFORE_START")

                detail_rows.append(
                    {
                        "nickname": name,
                        "segment": hq.segment if hq is not None else "",
                        "total_margin": hq.total_margin if hq is not None else None,
                        "is_joined": hq.is_joined if hq is not None else None,
                        "linked_at": hq.linked_at if hq is not None else None,
                        "v2_created_at": v2.created_at if v2 is not None else None,
                        "first_deposit_at": v2.first_deposit_at if v2 is not None else None,
                        "notes": "|".join(notes),
                    }
                )

                w.writerow(
                    [
                        name,
                        "Y" if hq is not None else "N",
                        hq.segment if hq is not None else "",
                        hq.total_margin if hq is not None else "",
                        hq.total_charge if hq is not None else "",
                        int(hq.is_joined) if hq is not None and hq.is_joined is not None else "",
                        hq.linked_at.isoformat(sep=" ") if hq is not None and hq.linked_at is not None else "",
                        hq.linked_user_id if hq is not None and hq.linked_user_id is not None else "",
                        "Y" if v2 is not None else "N",
                        v2.id if v2 is not None else "",
                        v2.created_at.isoformat(sep=" ") if v2 is not None else "",
                        v2.first_deposit_at.isoformat(sep=" ") if v2 is not None and v2.first_deposit_at is not None else "",
                        "|".join(notes),
                    ]
                )

        # Markdown summary
        def pct(n: int, d: int) -> str:
            if d <= 0:
                return "0.0%"
            return f"{(n / d) * 100:.1f}%"

        lines: list[str] = []
        lines.append(f"# 보낸 리스트 기준 퍼널 분석 — {args.start} ~")
        lines.append("")
        lines.append("## 1) 입력(보낸 리스트)")
        lines.append(f"- 소스: `{in_path.as_posix()}`")
        lines.append(f"- 총 인원: {sent_total}")
        lines.append("")
        lines.append("## 2) 매칭 요약(DB)")
        lines.append(f"- HQ(180명) 매칭: {hq_found}/{sent_total} ({pct(hq_found, sent_total)})")
        lines.append(f"- v2_user 매칭: {v2_found}/{sent_total} ({pct(v2_found, sent_total)})")
        lines.append("")
        lines.append("## 3) 퍼널 집계(보낸 리스트 기준)")
        lines.append(f"- 클릭(대체: 신규 v2_user 생성): {click_proxy_after_start}/{sent_total} ({pct(click_proxy_after_start, sent_total)})")
        lines.append(f"- 가입(joins, hq_prospective_user.linked_at): {joined_after_start}/{sent_total} ({pct(joined_after_start, sent_total)})")
        lines.append(f"- 첫입금(first_deposit_at): {deposit_after_start}/{sent_total} ({pct(deposit_after_start, sent_total)})")
        lines.append("")
        lines.append("## 4) 세그먼트 분포(HQ 매칭된 경우)")
        for seg, cnt in sorted(by_segment.items(), key=lambda x: (-x[1], x[0])):
            lines.append(f"- {seg}: {cnt}")
        lines.append("")
        lines.append("## 5) 가입(joins) 일자별")
        for d, cnt in sorted(joined_by_date.items()):
            lines.append(f"- {d}: {cnt}")
        lines.append("")
        lines.append("## 6) 산출물")
        lines.append(f"- CSV(유저별 상태): `{out_csv.as_posix()}`")
        lines.append(f"- 이 리포트: `{out_md.as_posix()}`")
        lines.append("")
        lines.append("## 7) 주의(클릭/답장 로그)")
        lines.append("- DB에 클릭/답장 이벤트 로그 테이블이 없어, 클릭은 `v2_user.created_at`(신규 유저 생성)으로 대체했습니다.")
        lines.append("- 답장(replies)은 운영 시트 값 외에 DB에서 재구성 불가합니다.")
        lines.append("")
        lines.append("## 8) 유저별 상세(보낸 리스트 25명)")
        lines.append("| nickname | segment(HQ) | total_margin | joined? | linked_at | v2_created_at(클릭대체) | first_deposit_at | notes |")
        lines.append("|---|---|---:|---:|---|---|---|---|")

        def fmt_dt(v: datetime | None) -> str:
            return v.isoformat(sep=" ") if v is not None else ""

        for r in detail_rows:
            total_margin = r["total_margin"]
            total_margin_str = "" if total_margin is None else str(total_margin)
            is_joined = r["is_joined"]
            is_joined_str = "" if is_joined is None else ("1" if is_joined else "0")
            lines.append(
                "| "
                + " | ".join(
                    [
                        str(r["nickname"]),
                        str(r["segment"]),
                        total_margin_str,
                        is_joined_str,
                        fmt_dt(r["linked_at"]),
                        fmt_dt(r["v2_created_at"]),
                        fmt_dt(r["first_deposit_at"]),
                        str(r["notes"]),
                    ]
                )
                + " |"
            )

        out_md.write_text("\n".join(lines) + "\n", encoding="utf-8")

        print(f"WROTE {out_csv} (rows={sent_total})")
        print(f"WROTE {out_md}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()
