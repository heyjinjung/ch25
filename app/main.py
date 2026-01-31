# /workspace/ch25/app/main.py
import os
import logging
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

# Sentry 초기화 (프로덕션 에러 추적)
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        logging_integration = LoggingIntegration(
            level=logging.INFO,  # INFO 레벨 이상 로그 캡처
            event_level=logging.WARNING,  # WARNING 이상은 이벤트로 전송
        )

        def traces_sampler(sampling_context):
            """최신 SDK 권장: 트랜잭션별 샘플링 결정"""
            # ASGI scope에서 경로 추출
            asgi_scope = sampling_context.get("asgi_scope")
            if asgi_scope:
                path = asgi_scope.get("path", "")

                # 헬스체크/정적 파일은 샘플링 제외
                if path in ["/", "/health", "/ping"] or path.startswith("/static"):
                    return 0.0

                # 에러가 발생한 트랜잭션은 100% 샘플링
                if sampling_context.get("parent_sampled") is False:
                    return 1.0

                # API 엔드포인트는 100% 샘플링 (전체 로그 추적)
                if path.startswith("/api") or path.startswith("/admin"):
                    return 1.0

            # 기본: 100% 샘플링 (전체 추적)
            return 1.0

        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=settings.env,
            # 최신 SDK 권장: traces_sample_rate 대신 traces_sampler 사용
            traces_sampler=traces_sampler,
            profiles_sample_rate=0.1,  # 10% 프로파일링
            integrations=[
                FastApiIntegration(),
                SqlalchemyIntegration(),
                logging_integration,
            ],
            # 전체 로그 추적 강화
            enable_tracing=True,  # 트레이싱 활성화
            _experiments={
                "continuous_profiling_auto_start": True,  # 자동 프로파일링
            },
            # 민감 정보 필터링
            send_default_pii=False,
            before_send=lambda event, hint: event if settings.env == "production" else None,
            # 브레드크럼 설정 (사용자 액션 추적)
            max_breadcrumbs=100,  # 기본 100개
            attach_stacktrace=True,  # 모든 메시지에 스택트레이스 첨부
        )
        print(f"✅ Sentry initialized (env={settings.env})", flush=True)
    except ImportError:
        print("⚠️ Sentry SDK not installed. Run: pip install sentry-sdk", flush=True)
    except Exception as e:
        print(f"⚠️ Sentry initialization failed: {e}", flush=True)
else:
    print("ℹ️ Sentry DSN not configured. Skipping Sentry initialization.", flush=True)

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
    from app.core.config import get_settings
    settings = get_settings()
    if settings.test_mode:
        print("Startup: test_mode detected. Skipping background workers.", flush=True)
        return

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


@app.get("/debug-sentry", summary="Sentry test endpoint")
def debug_sentry():
    """Trigger a test error to verify Sentry integration."""
    import sentry_sdk
    from sentry_sdk import metrics

    logger = logging.getLogger("app.sentry")
    logger.info("Sentry log test from /debug-sentry endpoint")
    metrics.incr("debug.sentry_metric", 1, tags={"source": "debug-sentry"})
    sentry_sdk.capture_message("Sentry test message from /debug-sentry endpoint")
    raise ValueError("This is a test error for Sentry verification")
