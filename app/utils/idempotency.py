from threading import Lock
from time import monotonic
from typing import Optional

from app.core.config import get_settings

try:
    import redis
except ImportError:  # pragma: no cover - optional dependency path
    redis = None


class BaseIdempotencyCache:
    def register(self, key: str, ttl_seconds: int) -> bool:  # pragma: no cover - interface
        raise NotImplementedError


class InMemoryIdempotencyCache(BaseIdempotencyCache):
    """Lightweight in-memory idempotency guard (per-process)."""

    def __init__(self) -> None:
        self._store: dict[str, float] = {}
        self._lock = Lock()

    def _purge(self, now: float, ttl_seconds: int) -> None:
        expiry_cutoff = now - ttl_seconds
        expired = [k for k, ts in self._store.items() if ts < expiry_cutoff]
        for k in expired:
            self._store.pop(k, None)

    def register(self, key: str, ttl_seconds: int) -> bool:
        now = monotonic()
        with self._lock:
            self._purge(now, ttl_seconds)
            if key in self._store:
                return False
            self._store[key] = now
            return True


class RedisIdempotencyCache(BaseIdempotencyCache):
    """Redis-backed idempotency guard."""

    def __init__(self, client: "redis.Redis") -> None:
        self.client = client

    def register(self, key: str, ttl_seconds: int) -> bool:
        try:
            res = self.client.set(key, b"1", nx=True, ex=ttl_seconds)
            return bool(res)
        except Exception:
            return False


def _build_idempotency_cache() -> BaseIdempotencyCache:
    settings = get_settings()
    if redis and settings.redis_url:
        try:
            client = redis.from_url(settings.redis_url, decode_responses=False)
            client.ping()
            return RedisIdempotencyCache(client)
        except Exception:
            pass
    return InMemoryIdempotencyCache()


# Module-level singleton
idempotency_cache: BaseIdempotencyCache = _build_idempotency_cache()
