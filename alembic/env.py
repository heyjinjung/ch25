from logging.config import fileConfig
import os
import sys
import logging

from alembic import context
from sqlalchemy import engine_from_config, pool, create_engine, text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from app.core.config import get_settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
# Escape % for ConfigParser interpolation
safe_url = settings.database_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", safe_url)

target_metadata = Base.metadata

logger = logging.getLogger(__name__)


def _ensure_alembic_version_num_length(connection, min_len: int = 64) -> None:
    """Ensure `alembic_version.version_num` can hold our revision IDs.

    Some older schemas created `version_num` with a short VARCHAR length.
    This preflight prevents `Data too long for column 'version_num'` during upgrade.
    """
    try:
        dialect = connection.dialect.name
        if dialect != "mysql":
            return

        exists = connection.execute(
            text(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = DATABASE()
                  AND table_name = 'alembic_version'
                LIMIT 1
                """
            )
        ).scalar()
        if not exists:
            return

        current_len = connection.execute(
            text(
                """
                SELECT CHARACTER_MAXIMUM_LENGTH
                FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = 'alembic_version'
                  AND column_name = 'version_num'
                LIMIT 1
                """
            )
        ).scalar()

        if current_len is None or int(current_len) >= int(min_len):
            return

        connection.execute(
            text(
                f"ALTER TABLE alembic_version MODIFY COLUMN version_num VARCHAR({int(min_len)}) NOT NULL"
            )
        )
        logger.info(
            "Expanded alembic_version.version_num from %s to VARCHAR(%s)",
            current_len,
            min_len,
        )
    except Exception:
        # Never block deployments due to a best-effort preflight.
        logger.exception("Preflight failed while checking alembic_version.version_num length")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = create_engine(settings.database_url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        _ensure_alembic_version_num_length(connection)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
