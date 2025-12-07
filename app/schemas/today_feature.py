"""Schema for today's active feature response."""
from pydantic import BaseModel


class TodayFeatureResponse(BaseModel):
    feature_type: str
    user_id: int | None = None

    @classmethod
    def validate(cls, value: dict) -> None:  # type: ignore[override]
        """Validate payload shape used by tests; return None on success."""
        cls.model_validate(value)
        return None
