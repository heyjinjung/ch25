"""Add survey and retention tables.

Revision ID: 20251215_0013
Revises: 20251212_0012
Create Date: 2025-12-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision = "20251215_0013"
down_revision = "20251212_0012"
branch_labels = None
depends_on = None


SURVEY_STATUS_ENUM = sa.Enum("DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", name="survey_status")
SURVEY_CHANNEL_ENUM = sa.Enum(
    "GLOBAL",
    "SEASON_PASS",
    "ROULETTE",
    "DICE",
    "LOTTERY",
    "TEAM_BATTLE",
    name="survey_channel",
)
QUESTION_TYPE_ENUM = sa.Enum(
    "SINGLE_CHOICE",
    "MULTI_CHOICE",
    "LIKERT",
    "TEXT",
    "NUMBER",
    name="survey_question_type",
)
TRIGGER_TYPE_ENUM = sa.Enum(
    "LEVEL_UP",
    "INACTIVE_DAYS",
    "GAME_RESULT",
    "MANUAL_PUSH",
    name="survey_trigger_type",
)
RESPONSE_STATUS_ENUM = sa.Enum(
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "DROPPED",
    "EXPIRED",
    name="survey_response_status",
)
REWARD_STATUS_ENUM = sa.Enum("NONE", "SCHEDULED", "GRANTED", "FAILED", name="survey_reward_status")


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    return bool(
        conn.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = :table
                """
            ),
            {"table": table},
        ).scalar()
    )


def upgrade() -> None:
    SURVEY_STATUS_ENUM.create(op.get_bind(), checkfirst=True)
    SURVEY_CHANNEL_ENUM.create(op.get_bind(), checkfirst=True)
    QUESTION_TYPE_ENUM.create(op.get_bind(), checkfirst=True)
    TRIGGER_TYPE_ENUM.create(op.get_bind(), checkfirst=True)
    RESPONSE_STATUS_ENUM.create(op.get_bind(), checkfirst=True)
    REWARD_STATUS_ENUM.create(op.get_bind(), checkfirst=True)

    if not _table_exists("survey"):
        op.create_table(
            "survey",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("title", sa.String(length=150), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("status", SURVEY_STATUS_ENUM, nullable=False, server_default="DRAFT"),
            sa.Column("channel", SURVEY_CHANNEL_ENUM, nullable=False, server_default="GLOBAL"),
            sa.Column("target_segment_json", sa.JSON(), nullable=True),
            sa.Column("reward_json", sa.JSON(), nullable=True),
            sa.Column("auto_launch", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("start_at", sa.DateTime(), nullable=True),
            sa.Column("end_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), sa.ForeignKey("user.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
        )

    if not _table_exists("survey_question"):
        op.create_table(
            "survey_question",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("survey_id", sa.Integer(), sa.ForeignKey("survey.id", ondelete="CASCADE"), nullable=False),
            sa.Column("order_index", sa.Integer(), nullable=False),
            sa.Column("randomize_group", sa.String(length=50), nullable=True),
            sa.Column("question_type", QUESTION_TYPE_ENUM, nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("helper_text", sa.String(length=255), nullable=True),
            sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("config_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.UniqueConstraint("survey_id", "order_index", name="uq_survey_question_order"),
        )

    if not _table_exists("survey_option"):
        op.create_table(
            "survey_option",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("question_id", sa.Integer(), sa.ForeignKey("survey_question.id", ondelete="CASCADE"), nullable=False),
            sa.Column("value", sa.String(length=100), nullable=False),
            sa.Column("label", sa.String(length=150), nullable=False),
            sa.Column("order_index", sa.Integer(), nullable=False),
            sa.Column("weight", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
        )

    if not _table_exists("survey_trigger_rule"):
        op.create_table(
            "survey_trigger_rule",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("survey_id", sa.Integer(), sa.ForeignKey("survey.id", ondelete="CASCADE"), nullable=False),
            sa.Column("trigger_type", TRIGGER_TYPE_ENUM, nullable=False),
            sa.Column("trigger_config_json", sa.JSON(), nullable=True),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("cooldown_hours", sa.Integer(), nullable=False, server_default="24"),
            sa.Column("max_per_user", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Index("idx_survey_trigger_active", "is_active", "priority"),
        )

    if not _table_exists("survey_response"):
        op.create_table(
            "survey_response",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("survey_id", sa.Integer(), sa.ForeignKey("survey.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
            sa.Column("trigger_rule_id", sa.Integer(), sa.ForeignKey("survey_trigger_rule.id", ondelete="SET NULL"), nullable=True),
            sa.Column("status", RESPONSE_STATUS_ENUM, nullable=False, server_default="PENDING"),
            sa.Column("started_at", sa.DateTime(), nullable=True),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("dropped_at", sa.DateTime(), nullable=True),
            sa.Column("reward_status", REWARD_STATUS_ENUM, nullable=False, server_default="NONE"),
            sa.Column("reward_payload", sa.JSON(), nullable=True),
            sa.Column("last_question_id", sa.Integer(), sa.ForeignKey("survey_question.id", ondelete="SET NULL"), nullable=True),
            sa.Column("last_activity_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
                server_onupdate=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Index("idx_survey_response_user", "user_id", "status"),
            sa.Index("idx_survey_response_survey", "survey_id", "status"),
        )

    if not _table_exists("survey_response_answer"):
        op.create_table(
            "survey_response_answer",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("response_id", sa.Integer(), sa.ForeignKey("survey_response.id", ondelete="CASCADE"), nullable=False),
            sa.Column("question_id", sa.Integer(), sa.ForeignKey("survey_question.id", ondelete="CASCADE"), nullable=False),
            sa.Column("option_id", sa.Integer(), sa.ForeignKey("survey_option.id", ondelete="SET NULL"), nullable=True),
            sa.Column("answer_text", sa.Text(), nullable=True),
            sa.Column("answer_number", sa.Integer(), nullable=True),
            sa.Column("meta_json", sa.JSON(), nullable=True),
            sa.Column("answered_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.UniqueConstraint("response_id", "question_id", name="uq_response_question"),
        )


def downgrade() -> None:
    op.drop_table("survey_response_answer")
    op.drop_index("idx_survey_response_user", table_name="survey_response")
    op.drop_index("idx_survey_response_survey", table_name="survey_response")
    op.drop_table("survey_response")
    op.drop_index("idx_survey_trigger_active", table_name="survey_trigger_rule")
    op.drop_table("survey_trigger_rule")
    op.drop_table("survey_option")
    op.drop_table("survey_question")
    op.drop_table("survey")
    REWARD_STATUS_ENUM.drop(op.get_bind(), checkfirst=True)
    RESPONSE_STATUS_ENUM.drop(op.get_bind(), checkfirst=True)
    TRIGGER_TYPE_ENUM.drop(op.get_bind(), checkfirst=True)
    QUESTION_TYPE_ENUM.drop(op.get_bind(), checkfirst=True)
    SURVEY_CHANNEL_ENUM.drop(op.get_bind(), checkfirst=True)
    SURVEY_STATUS_ENUM.drop(op.get_bind(), checkfirst=True)
