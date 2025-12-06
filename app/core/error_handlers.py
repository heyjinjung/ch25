"""Exception handlers that normalize API error responses."""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.status import HTTP_422_UNPROCESSABLE_ENTITY

from app.core.exceptions import (
    DailyLimitReachedError,
    FeatureNotActiveError,
    InvalidConfigError,
    NoFeatureTodayError,
)


ERROR_MAP = {
    FeatureNotActiveError: "FEATURE_NOT_ACTIVE",
    NoFeatureTodayError: "NO_FEATURE_TODAY",
    InvalidConfigError: "INVALID_CONFIG",
    DailyLimitReachedError: "DAILY_LIMIT_REACHED",
}


def register_exception_handlers(app: FastAPI) -> None:
    """Attach shared exception handlers to the FastAPI app."""

    @app.exception_handler(tuple(ERROR_MAP.keys()))
    async def handle_custom_errors(request: Request, exc: Exception) -> JSONResponse:  # type: ignore[arg-type]
        code = ERROR_MAP.get(exc.__class__, "UNKNOWN_ERROR")
        message = exc.detail if hasattr(exc, "detail") else str(exc)
        status_code = getattr(exc, "status_code", 400)
        return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": {"code": "VALIDATION_ERROR", "message": exc.errors()}},
        )
