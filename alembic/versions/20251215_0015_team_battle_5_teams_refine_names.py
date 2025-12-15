"""Ensure 5 active team battle teams with refined names.

Revision ID: 20251215_0015
Revises: 20251215_0014
Create Date: 2025-12-15
"""

from alembic import op
import sqlalchemy as sa

revision = "20251215_0015"
down_revision = "20251215_0014"
branch_labels = None
depends_on = None


DESIRED_TEAM_NAMES: list[str] = [
    "노엘",
    "루미에르",
    "에버그린",
    "오로라",
    "코발트",
]

RENAME_MAP: dict[str, str] = {
    "지민산타": "노엘",
    "지민루돌프": "루미에르",
}


def _placeholders(prefix: str, values: list[str]) -> tuple[str, dict]:
    params = {f"{prefix}{idx}": value for idx, value in enumerate(values)}
    ph = ", ".join([f":{k}" for k in params.keys()])
    return ph, params


def upgrade() -> None:
    conn = op.get_bind()

    rows = conn.execute(sa.text("SELECT id, name FROM team")).fetchall()
    by_name = {r.name: r.id for r in rows}

    # Rename existing two teams if present (avoid unique conflicts).
    for old_name, new_name in RENAME_MAP.items():
        if old_name not in by_name:
            continue
        if new_name in by_name:
            conn.execute(sa.text("UPDATE team SET is_active = 0 WHERE id = :id"), {"id": by_name[old_name]})
            continue
        conn.execute(
            sa.text("UPDATE team SET name = :new_name, is_active = 1 WHERE id = :id"),
            {"new_name": new_name, "id": by_name[old_name]},
        )
        by_name[new_name] = by_name.pop(old_name)

    # Insert missing teams.
    current_names = set(
        conn.execute(sa.text("SELECT name FROM team")).scalars().all()
    )
    for name in DESIRED_TEAM_NAMES:
        if name in current_names:
            continue
        conn.execute(
            sa.text(
                """
                INSERT INTO team (name, icon, is_active, created_at, updated_at)
                VALUES (:name, NULL, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            ),
            {"name": name},
        )

    # Ensure exactly these 5 teams are active.
    ph, params = _placeholders("n", DESIRED_TEAM_NAMES)
    conn.execute(sa.text(f"UPDATE team SET is_active = 1 WHERE name IN ({ph})"), params)
    conn.execute(sa.text(f"UPDATE team SET is_active = 0 WHERE name NOT IN ({ph})"), params)


def downgrade() -> None:
    conn = op.get_bind()

    # Best-effort rollback: restore old names if possible.
    rename_back = {v: k for k, v in RENAME_MAP.items()}

    rows = conn.execute(sa.text("SELECT id, name FROM team")).fetchall()
    existing_names = {r.name for r in rows}
    by_name = {r.name: r.id for r in rows}

    for new_name, old_name in rename_back.items():
        if new_name not in by_name:
            continue
        if old_name in existing_names:
            # Avoid unique conflict; just keep name.
            continue
        conn.execute(
            sa.text("UPDATE team SET name = :old_name WHERE id = :id"),
            {"old_name": old_name, "id": by_name[new_name]},
        )

    # Remove the additional three teams.
    extras = [n for n in DESIRED_TEAM_NAMES if n not in rename_back]
    if extras:
        ph, params = _placeholders("e", extras)
        conn.execute(sa.text(f"DELETE FROM team WHERE name IN ({ph})"), params)

    # Reactivate remaining teams.
    conn.execute(sa.text("UPDATE team SET is_active = 1"))
