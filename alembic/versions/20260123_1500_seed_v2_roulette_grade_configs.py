"""Seed v2 roulette configs for all grades.

문서 SoT 상 룰렛 설정은 grade 4종(COMMON/VIP/WHALE/AT_RISK)으로 분리되어야 한다.
로컬/신규 DB에서는 v2_roulette_config가 COMMON 1개만 존재하는 경우가 있어,
어드민 UI에서 4개 탭이 모두 같은 설정처럼 보이는(실제로는 동일 row를 편집) 문제가 발생한다.

이 마이그레이션은 다음을 보장한다:
- v2_roulette_config에 grade 4종이 모두 존재
- 각 config는 slot_index 0~5 (6개) v2_roulette_segment를 보유
- 기존 COMMON config/segments가 있으면 이를 복제하여 생성(데이터 보존)

Revision ID: 20260123_1500_seed_v2_roulette_grade_configs
Revises: 20260123_1130_seed_feature_config_rows
Create Date: 2026-01-23
"""

from typing import Any, Dict, Optional

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision = "20260123_1500_seed_v2_roulette_grade_configs"
down_revision = "20260123_1130_seed_feature_config_rows"
branch_labels = None
depends_on = None


def _fetch_one(conn, sql: str, params: Optional[Dict[str, Any]] = None):
    return conn.execute(text(sql), params or {}).mappings().first()


def _fetch_all(conn, sql: str, params: Optional[Dict[str, Any]] = None):
    return conn.execute(text(sql), params or {}).mappings().all()


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect not in {"mysql", "mariadb"}:
        # 현재 운영/로컬은 MySQL 계열. 다른 DB에서는 안전하게 no-op.
        return

    # 1) 기준 COMMON config 확보 (없으면 생성)
    base = _fetch_one(
        conn,
        """
        SELECT id, name, ticket_type, is_active, max_daily_spins
        FROM v2_roulette_config
        WHERE grade = 'COMMON'
        ORDER BY id DESC
        LIMIT 1
        """,
    )

    if base is None:
        conn.execute(
            text(
                """
                INSERT INTO v2_roulette_config
                    (name, ticket_type, is_active, max_daily_spins, grade, created_at, updated_at)
                VALUES
                    (:name, :ticket_type, 1, 10, 'COMMON', NOW(), NOW())
                """
            ),
            {"name": "Roulette (COMMON)", "ticket_type": "ROULETTE_TICKET"},
        )
        base_id = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()
        base = {
            "id": base_id,
            "name": "Roulette (COMMON)",
            "ticket_type": "ROULETTE_TICKET",
            "is_active": 1,
            "max_daily_spins": 10,
        }
    else:
        base_id = base["id"]

    # 2) 기준 segments 확보 (없으면 기본 6개 생성)
    base_segments = _fetch_all(
        conn,
        """
        SELECT slot_index, label, reward_type, reward_amount, weight, is_jackpot
        FROM v2_roulette_segment
        WHERE config_id = :config_id
        ORDER BY slot_index
        """,
        {"config_id": base_id},
    )

    if len(base_segments) < 6:
        # base에 segments가 비어있거나 부족하면, 먼저 base에 기본 슬롯을 채운다.
        defaults = [
            {"slot_index": 0, "label": "Slot 1", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": 0},
            {"slot_index": 1, "label": "Slot 2", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": 0},
            {"slot_index": 2, "label": "Slot 3", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": 0},
            {"slot_index": 3, "label": "Slot 4", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": 0},
            {"slot_index": 4, "label": "Slot 5", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": 0},
            {"slot_index": 5, "label": "Slot 6", "reward_type": "NONE", "reward_amount": 0, "weight": 1, "is_jackpot": 0},
        ]
        for seg in defaults:
            conn.execute(
                text(
                    """
                    INSERT IGNORE INTO v2_roulette_segment
                        (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
                    VALUES
                        (:config_id, :slot_index, :label, :reward_type, :reward_amount, :weight, :is_jackpot, NOW(), NOW())
                    """
                ),
                {"config_id": base_id, **seg},
            )
        base_segments = _fetch_all(
            conn,
            """
            SELECT slot_index, label, reward_type, reward_amount, weight, is_jackpot
            FROM v2_roulette_segment
            WHERE config_id = :config_id
            ORDER BY slot_index
            """,
            {"config_id": base_id},
        )

    # clone 시 정확히 6개만 사용
    clone_segments = list(base_segments)[:6]

    # 3) grade 4종 보장 (ticket_type은 default와 호환되도록 동일하게 유지)
    grades = ["COMMON", "VIP", "WHALE", "AT_RISK"]

    for grade in grades:
        exists = _fetch_one(
            conn,
            """
            SELECT id
            FROM v2_roulette_config
            WHERE grade = :grade AND ticket_type = :ticket_type
            ORDER BY id DESC
            LIMIT 1
            """,
            {"grade": grade, "ticket_type": base["ticket_type"]},
        )
        if exists is not None:
            continue

        conn.execute(
            text(
                """
                INSERT INTO v2_roulette_config
                    (name, ticket_type, is_active, max_daily_spins, grade, created_at, updated_at)
                VALUES
                    (:name, :ticket_type, :is_active, :max_daily_spins, :grade, NOW(), NOW())
                """
            ),
            {
                "name": f"{base['name'].split('(')[0].strip()} ({grade})",
                "ticket_type": base["ticket_type"],
                "is_active": 1 if base["is_active"] else 0,
                "max_daily_spins": int(base["max_daily_spins"] or 0),
                "grade": grade,
            },
        )
        new_id = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()

        for seg in clone_segments:
            conn.execute(
                text(
                    """
                    INSERT INTO v2_roulette_segment
                        (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
                    VALUES
                        (:config_id, :slot_index, :label, :reward_type, :reward_amount, :weight, :is_jackpot, NOW(), NOW())
                    """
                ),
                {
                    "config_id": new_id,
                    "slot_index": int(seg["slot_index"]),
                    "label": str(seg["label"]),
                    "reward_type": str(seg["reward_type"]),
                    "reward_amount": int(seg["reward_amount"] or 0),
                    "weight": int(seg["weight"] or 0),
                    "is_jackpot": 1 if seg["is_jackpot"] else 0,
                },
            )


def downgrade() -> None:
    # 데이터 시드 성격이라 자동 삭제는 위험(운영/로컬 커스텀 설정 손실 가능).
    pass
