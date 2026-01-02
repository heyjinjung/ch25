# /workspace/ch25/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers

settings = get_settings()

app = FastAPI(title="XMAS 1Week Event System")


class LegacyAdminPathAliasMiddleware(BaseHTTPMiddleware):
    """Compat: map legacy /api/admin/* to canonical /admin/api/*.

    Some routes intentionally live under /api/admin/* already (telegram/vault, etc.).
    We only rewrite when the request would otherwise miss the canonical admin router.
    """

    _src = "/api/admin"
    _dst = "/admin/api"
    _no_rewrite_prefixes = (
        "/api/admin/telegram",
        "/api/admin/vault",
        "/api/admin/vault-programs",
        "/api/admin/ui-copy",
    )

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        path = request.scope.get("path", "")
        if path == self._src or path.startswith(self._src + "/"):
            if not path.startswith(self._no_rewrite_prefixes):
                request.scope["path"] = self._dst + path[len(self._src) :]
        return await call_next(request)

# Apply CORS: allow known local origins by default, avoid "*" when credentials are used.
default_dev_origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "http://127.0.0.1:5173",
    "http://cc-jm.com",
    "https://cc-jm.com",
    "http://www.cc-jm.com",
    "https://www.cc-jm.com",
]

# Combine settings.cors_origins and default_dev_origins to ensure all are allowed
cors_origins = list(set((settings.cors_origins or []) + default_dev_origins))

# Remove '*' if present because allow_credentials=True doesn't allow it
if "*" in cors_origins:
    cors_origins.remove("*")

print(f"Loading CORS origins: {cors_origins}", flush=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compat path aliases should run before routing.
app.add_middleware(LegacyAdminPathAliasMiddleware)

@app.on_event("startup")
async def startup_event():
    print(f"Startup: CORS origins loaded: {cors_origins}", flush=True)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/", summary="Root ping")
def root() -> dict[str, str]:
    """Simple root endpoint placeholder."""

    return {"message": "XMAS 1Week backend running"}
