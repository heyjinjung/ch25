# /workspace/ch25/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers
from app.core.kst_response import KstJSONResponse
from app.workers.ops_outbox_worker import run_ops_outbox_worker
from app.workers.ch25_event_worker import run_ch25_event_worker
from app.v2.workers.golden_event_worker import run_golden_event_worker
from app.v2.workers.golden_intervention_worker import run_golden_intervention_worker

settings = get_settings()

app = FastAPI(title="XMAS 1Week Event System", default_response_class=KstJSONResponse)


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

# [INFRA FIX] Trust X-Forwarded-For headers from Nginx (Docker internal IP)
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compat path aliases should run before routing.
app.add_middleware(LegacyAdminPathAliasMiddleware)

_outbox_task = None
_outbox_stop = None
_ch25_task = None
_ch25_stop = None
_golden_task = None
_golden_stop = None
_golden_intervention_task = None
_golden_intervention_stop = None

@app.on_event("startup")
async def startup_event():
    print(f"Startup: CORS origins loaded: {cors_origins}", flush=True)
    global _outbox_task, _outbox_stop, _ch25_task, _ch25_stop, _golden_task, _golden_stop
    global _golden_intervention_task, _golden_intervention_stop
    import asyncio

    _outbox_stop = asyncio.Event()
    _outbox_task = asyncio.create_task(run_ops_outbox_worker(stop_event=_outbox_stop))
    app.state.ops_outbox_task = _outbox_task
    _ch25_stop = asyncio.Event()
    _ch25_task = asyncio.create_task(run_ch25_event_worker(stop_event=_ch25_stop))
    app.state.ch25_event_task = _ch25_task
    _golden_stop = asyncio.Event()
    _golden_task = asyncio.create_task(run_golden_event_worker(stop_event=_golden_stop))
    app.state.golden_event_task = _golden_task
    _golden_intervention_stop = asyncio.Event()
    _golden_intervention_task = asyncio.create_task(
        run_golden_intervention_worker(stop_event=_golden_intervention_stop)
    )
    app.state.golden_intervention_task = _golden_intervention_task


@app.on_event("shutdown")
async def shutdown_event():
    global _outbox_task, _outbox_stop, _ch25_task, _ch25_stop, _golden_task, _golden_stop
    global _golden_intervention_task, _golden_intervention_stop
    import asyncio
    if _outbox_stop is not None:
        _outbox_stop.set()
    if _outbox_task is not None:
        _outbox_task.cancel()
        try:
            await _outbox_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
    _outbox_task = None
    _outbox_stop = None
    if _ch25_stop is not None:
        _ch25_stop.set()
    if _ch25_task is not None:
        _ch25_task.cancel()
        try:
            await _ch25_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
    _ch25_task = None
    _ch25_stop = None
    if _golden_stop is not None:
        _golden_stop.set()
    if _golden_task is not None:
        _golden_task.cancel()
        try:
            await _golden_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
    _golden_task = None
    _golden_stop = None
    if _golden_intervention_stop is not None:
        _golden_intervention_stop.set()
    if _golden_intervention_task is not None:
        _golden_intervention_task.cancel()
        try:
            await _golden_intervention_task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
    _golden_intervention_task = None
    _golden_intervention_stop = None

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/", summary="Root ping")
def root() -> dict[str, str]:
    """Simple root endpoint placeholder."""

    return {"message": "XMAS 1Week backend running"}
