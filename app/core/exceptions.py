"""Custom exception classes with standardized error codes."""
from fastapi import HTTPException, status


class FeatureNotActiveError(HTTPException):
    """Raised when a feature is not active for today's schedule."""

    def __init__(self, message: str = "FEATURE_NOT_ACTIVE"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


class NoFeatureTodayError(HTTPException):
    """Raised when no feature is configured for today."""

    def __init__(self, message: str = "NO_FEATURE_TODAY"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=message)


class InvalidConfigError(HTTPException):
    """Raised for invalid game configurations (weights, segments, etc.)."""

    def __init__(self, message: str = "INVALID_CONFIG"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)


class DailyLimitReachedError(HTTPException):
    """Raised when a user exceeds the daily play limit."""

    def __init__(self, message: str = "DAILY_LIMIT_REACHED"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
