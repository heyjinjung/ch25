# /workspace/ch25/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers

settings = get_settings()

app = FastAPI(title="XMAS 1Week Event System")

# Apply environment-aware CORS policy: default to explicit origins; allow "*" only for local.
cors_origins = settings.cors_origins or (["*"] if settings.env == "local" else [])
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/", summary="Root ping")
def root() -> dict[str, str]:
    """Simple root endpoint placeholder."""

    return {"message": "XMAS 1Week backend running"}
