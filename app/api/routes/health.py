"""Health check endpoint."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Health check")
def health_check() -> dict[str, str]:
    """Return service health information."""

    return {"status": "ok"}
