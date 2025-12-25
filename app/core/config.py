"""Application configuration settings."""

from datetime import date
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

    # Vault event flags
    # Disabled by default so local dev/tests are deterministic.
    vault_accrual_multiplier_enabled: bool = Field(
        False,
        validation_alias=AliasChoices(
            "VAULT_ACCRUAL_MULTIPLIER_ENABLED",
            "vault_accrual_multiplier_enabled",
        ),
    )
    vault_accrual_multiplier_value: float = Field(
        2.0,
        validation_alias=AliasChoices(
            "VAULT_ACCRUAL_MULTIPLIER_VALUE",
            "vault_accrual_multiplier_value",
        ),
    )
    vault_accrual_multiplier_start_kst: date | None = Field(
        None,
        validation_alias=AliasChoices(
            "VAULT_ACCRUAL_MULTIPLIER_START_KST",
            "vault_accrual_multiplier_start_kst",
        ),
    )
    vault_accrual_multiplier_end_kst: date | None = Field(
        None,
        validation_alias=AliasChoices(
            "VAULT_ACCRUAL_MULTIPLIER_END_KST",
            "vault_accrual_multiplier_end_kst",
        ),
    )

    # Trial (ticket-zero) controls
    enable_trial_grant_auto: bool = Field(
        True,
        validation_alias=AliasChoices(
            "ENABLE_TRIAL_GRANT_AUTO",
            "enable_trial_grant_auto",
        ),
    )
    trial_daily_cap: int = Field(
        1,
        validation_alias=AliasChoices(
            "TRIAL_DAILY_CAP",
            "trial_daily_cap",
        ),
    )
    # 0 means "no weekly cap" (keep legacy behavior unless configured).
    trial_weekly_cap: int = Field(
        0,
        validation_alias=AliasChoices(
            "TRIAL_WEEKLY_CAP",
            "trial_weekly_cap",
        ),
    )
    tiered_grant_enabled: bool = Field(
        False,
        validation_alias=AliasChoices(
            "TIERED_GRANT_ENABLED",
            "tiered_grant_enabled",
        ),
    )

    # If enabled, trial rewards can be routed into Vault rather than direct token grants.
    # Default OFF to avoid behavior changes.
    enable_trial_payout_to_vault: bool = Field(
        False,
        validation_alias=AliasChoices(
            "ENABLE_TRIAL_PAYOUT_TO_VAULT",
            "enable_trial_payout_to_vault",
        ),
    )
    # Optional: valuation map for trial rewards (operational tuning).
    trial_reward_valuation: dict[str, int] = Field(
        default_factory=dict,
        validation_alias=AliasChoices(
            "TRIAL_REWARD_VALUATION",
            "trial_reward_valuation",
        ),
    )

    # Vault earn events (game accrual)
    # Default OFF for safe rollout (no behavior change unless explicitly enabled).
    enable_vault_game_earn_events: bool = Field(
        False,
        validation_alias=AliasChoices(
            "ENABLE_VAULT_GAME_EARN_EVENTS",
            "enable_vault_game_earn_events",
        ),
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
