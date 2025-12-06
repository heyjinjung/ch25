"""Application configuration settings."""
from functools import lru_cache
from pydantic import Field, ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Base application settings loaded from environment variables."""

    # Required settings
    database_url: str = Field(..., env="DATABASE_URL")
    jwt_secret: str = Field(..., env="JWT_SECRET")
    
    # Optional settings with defaults
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(1440, env="JWT_EXPIRE_MINUTES")
    env: str = Field("local", env="ENV")
    cors_origins: list[str] = Field(default_factory=list, env="CORS_ORIGINS")
    log_level: str = Field("INFO", env="LOG_LEVEL")
    timezone: str = Field("Asia/Seoul", env="TIMEZONE")
    
    # Test mode: bypasses feature_schedule validation (all games accessible)
    test_mode: bool = Field(False, env="TEST_MODE")
    
    # MySQL credentials (used by Docker Compose)
    mysql_root_password: str | None = Field(None, env="MYSQL_ROOT_PASSWORD")
    mysql_database: str | None = Field(None, env="MYSQL_DATABASE")
    mysql_user: str | None = Field(None, env="MYSQL_USER")
    mysql_password: str | None = Field(None, env="MYSQL_PASSWORD")

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra fields not defined in the model
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""

    return Settings()
