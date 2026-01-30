"""Health check endpoint."""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health check")
@router.get("/api/health", summary="Health check")
def health_check() -> dict[str, str]:
    """Return service health information."""

    return {"status": "ok"}
