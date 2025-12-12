"""Application configuration settings."""
from functools import lru_cache
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Base application settings loaded from environment variables."""

    # Required settings
    database_url: str = Field(..., validation_alias=AliasChoices("DATABASE_URL", "database_url"))
    jwt_secret: str = Field(..., validation_alias=AliasChoices("JWT_SECRET", "jwt_secret"))

    # Optional settings with defaults
    jwt_algorithm: str = Field("HS256", validation_alias=AliasChoices("JWT_ALGORITHM", "jwt_algorithm"))
    jwt_expire_minutes: int = Field(1440, validation_alias=AliasChoices("JWT_EXPIRE_MINUTES", "jwt_expire_minutes"))
    env: str = Field("local", validation_alias=AliasChoices("ENV", "env"))
    cors_origins: list[str] = Field(default_factory=list, validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins"))
    log_level: str = Field("INFO", validation_alias=AliasChoices("LOG_LEVEL", "log_level"))
    timezone: str = Field("Asia/Seoul", validation_alias=AliasChoices("TIMEZONE", "timezone"))

    # Test mode: bypasses feature_schedule validation (all games accessible)
    test_mode: bool = Field(False, validation_alias=AliasChoices("TEST_MODE", "test_mode"))

    # MySQL credentials (used by Docker Compose)
    mysql_root_password: str | None = Field(None, validation_alias=AliasChoices("MYSQL_ROOT_PASSWORD", "mysql_root_password"))
    mysql_database: str | None = Field(None, validation_alias=AliasChoices("MYSQL_DATABASE", "mysql_database"))
    mysql_user: str | None = Field(None, validation_alias=AliasChoices("MYSQL_USER", "mysql_user"))
    mysql_password: str | None = Field(None, validation_alias=AliasChoices("MYSQL_PASSWORD", "mysql_password"))

    # Feature flags
    xp_from_game_reward: bool = Field(False, validation_alias=AliasChoices("XP_FROM_GAME_REWARD", "xp_from_game_reward"))
    feature_gate_enabled: bool = Field(
        False, validation_alias=AliasChoices("FEATURE_GATE_ENABLED", "feature_gate_enabled")
    )

    # External ranking anti-abuse (deposit -> XP)
    external_ranking_deposit_step_amount: int = Field(
        100_000, validation_alias=AliasChoices("EXTERNAL_RANKING_DEPOSIT_STEP_AMOUNT", "external_ranking_deposit_step_amount")
    )
    external_ranking_deposit_xp_per_step: int = Field(
        20, validation_alias=AliasChoices("EXTERNAL_RANKING_DEPOSIT_XP_PER_STEP", "external_ranking_deposit_xp_per_step")
    )
    external_ranking_deposit_max_steps_per_day: int = Field(
        50, validation_alias=AliasChoices("EXTERNAL_RANKING_DEPOSIT_MAX_STEPS_PER_DAY", "external_ranking_deposit_max_steps_per_day")
    )
    external_ranking_deposit_cooldown_minutes: int = Field(
        0, validation_alias=AliasChoices("EXTERNAL_RANKING_DEPOSIT_COOLDOWN_MINUTES", "external_ranking_deposit_cooldown_minutes")
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra fields not defined in the model
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""

    return Settings()
