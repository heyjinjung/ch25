"""add new user welcome missions

Revision ID: 20260114_0001_add_new_user_welcome_missions
Revises: 20260113_0930_add_user_identity_history
Create Date: 2026-01-14 00:01:00.000000

"""

from __future__ import annotations

from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260114_0001_add_new_user_welcome_missions"
down_revision = "20260113_0930_add_user_identity_history"
branch_labels = None
depends_on = None


def _upsert_mission(
    *,
    logic_key: str,
    title: str,
    description: str | None,
    category: str,
    action_type: str | None,
    target_value: int,
    reward_type: str,
    reward_amount: int,
    xp_reward: int,
    auto_claim: bool,
    is_active: bool,
) -> None:
    bind = op.get_bind()

    row = bind.execute(sa.text("SELECT id FROM mission WHERE logic_key = :logic_key"), {"logic_key": logic_key}).fetchone()

    payload = {
        "title": title,
        "description": description,
        "category": category,
        "logic_key": logic_key,
        "action_type": action_type,
        "target_value": int(target_value),
        "reward_type": reward_type,
        "reward_amount": int(reward_amount),
        "xp_reward": int(xp_reward),
        "requires_approval": 0,
        "auto_claim": 1 if auto_claim else 0,
        "is_active": 1 if is_active else 0,
        "created_at": datetime.utcnow(),
    }

    if row:
        bind.execute(
            sa.text(
                """
                UPDATE mission
                SET
                    title = :title,
                    description = :description,
                    category = :category,
                    action_type = :action_type,
                    target_value = :target_value,
                    reward_type = :reward_type,
                    reward_amount = :reward_amount,
                    xp_reward = :xp_reward,
                    requires_approval = :requires_approval,
                    auto_claim = :auto_claim,
                    is_active = :is_active
                WHERE logic_key = :logic_key
                """
            ),
            payload,
        )
    else:
        bind.execute(
            sa.text(
                """
                INSERT INTO mission (
                    title,
                    description,
                    category,
                    logic_key,
                    action_type,
                    target_value,
                    reward_type,
                    reward_amount,
                    xp_reward,
                    requires_approval,
                    auto_claim,
                    is_active,
                    created_at
                ) VALUES (
                    :title,
                    :description,
                    :category,
                    :logic_key,
                    :action_type,
                    :target_value,
                    :reward_type,
                    :reward_amount,
                    :xp_reward,
                    :requires_approval,
                    :auto_claim,
                    :is_active,
                    :created_at
                )
                """
            ),
            payload,
        )


def upgrade() -> None:
    _upsert_mission(
        logic_key="NEW_USER_WELCOME_CASH",
        title="정착 지원금",
        description="웰컴 선물: 금고 2,000P",
        category="NEW_USER",
        action_type=None,
        target_value=1,
        reward_type="CASH_UNLOCK",
        reward_amount=2000,
        xp_reward=0,
        auto_claim=True,
        is_active=True,
    )

    _upsert_mission(
        logic_key="NEW_USER_WELCOME_TICKET",
        title="웰컴 티켓",
        description="웰컴 선물: 로또 티켓 5장",
        category="NEW_USER",
        action_type=None,
        target_value=1,
        reward_type="TICKET_LOTTERY",
        reward_amount=5,
        xp_reward=0,
        auto_claim=True,
        is_active=True,
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM mission WHERE logic_key IN (:k1, :k2)"), {"k1": "NEW_USER_WELCOME_CASH", "k2": "NEW_USER_WELCOME_TICKET"})
