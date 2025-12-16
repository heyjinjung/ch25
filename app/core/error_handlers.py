"""Exception handlers that normalize API error responses."""
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from app.core.exceptions import (
    DailyLimitReachedError,
    FeatureNotActiveError,
    InvalidConfigError,
    LockAcquisitionError,
    NoFeatureTodayError,
)


ERROR_MAP = {
    FeatureNotActiveError: "FEATURE_NOT_ACTIVE",
    NoFeatureTodayError: "NO_FEATURE_TODAY",
    InvalidConfigError: "INVALID_CONFIG",
    DailyLimitReachedError: "DAILY_LIMIT_REACHED",
    LockAcquisitionError: "LOCK_NOT_ACQUIRED",
}

# HTTPException.detail values we surface directly as error codes for consistency with docs.
DETAIL_CODE_MAP = {
    "NO_ACTIVE_SEASON": "NO_ACTIVE_SEASON",
    "NO_ACTIVE_SEASON_CONFLICT": "NO_ACTIVE_SEASON_CONFLICT",
    "ALREADY_STAMPED_TODAY": "ALREADY_STAMPED_TODAY",
    "LEVEL_NOT_REACHED": "LEVEL_NOT_REACHED",
    "LEVEL_NOT_FOUND": "LEVEL_NOT_FOUND",
    "REWARD_ALREADY_CLAIMED": "REWARD_ALREADY_CLAIMED",
    "AUTO_CLAIM_LEVEL": "AUTO_CLAIM_LEVEL",
    "INVALID_FEATURE_SCHEDULE": "INVALID_FEATURE_SCHEDULE",
    "INVALID_ROULETTE_CONFIG": "INVALID_ROULETTE_CONFIG",
    "INVALID_LOTTERY_CONFIG": "INVALID_LOTTERY_CONFIG",
    "DAILY_LIMIT_REACHED": "DAILY_LIMIT_REACHED",
    "NO_FEATURE_TODAY": "NO_FEATURE_TODAY",
}


def register_exception_handlers(app: FastAPI) -> None:
    """Attach shared exception handlers to the FastAPI app."""

    async def handle_custom_errors(request: Request, exc: Exception) -> JSONResponse:
        message = exc.detail if hasattr(exc, "detail") else str(exc)
        code = DETAIL_CODE_MAP.get(message, ERROR_MAP.get(exc.__class__, "UNKNOWN_ERROR"))
        status_code = getattr(exc, "status_code", 400)
        return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})

    # Register the same handler for each custom exception type
    for exc_cls in ERROR_MAP.keys():
        app.add_exception_handler(exc_cls, handle_custom_errors)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail or "HTTP_ERROR"
        code = DETAIL_CODE_MAP.get(detail, detail if isinstance(detail, str) else "HTTP_ERROR")
        return JSONResponse(status_code=exc.status_code, content={"error": {"code": code, "message": detail}})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": {"code": "VALIDATION_ERROR", "message": exc.errors()}},
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        message = "DATABASE_ERROR"
        code = "DB_ERROR"

        # Common case during rollout: code is deployed but alembic upgrade hasn't run.
        if isinstance(exc, (OperationalError, ProgrammingError)):
            raw = ""
            try:
                raw = str(getattr(exc, "orig", exc))
            except Exception:
                raw = ""

            lowered = raw.lower()
            if (
                "doesn't exist" in lowered
                or "no such table" in lowered
                or "unknown column" in lowered
                or "undefined table" in lowered
                or "relation" in lowered and "does not exist" in lowered
            ):
                code = "DB_SCHEMA_MISMATCH"
                message = "DATABASE_SCHEMA_MISMATCH"

        return JSONResponse(status_code=500, content={"error": {"code": code, "message": message}})
