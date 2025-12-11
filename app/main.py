# /workspace/ch25/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers

settings = get_settings()

app = FastAPI(title="XMAS 1Week Event System")

# Apply CORS: allow known local origins by default, avoid "*" when credentials are used.
default_dev_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
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

@app.on_event("startup")
async def startup_event():
    print(f"Startup: CORS origins loaded: {cors_origins}", flush=True)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/", summary="Root ping")
def root() -> dict[str, str]:
    """Simple root endpoint placeholder."""

    return {"message": "XMAS 1Week backend running"}
