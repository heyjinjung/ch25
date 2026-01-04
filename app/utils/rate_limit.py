from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from typing import Optional

from app.core.config import get_settings

try:
    import redis
except ImportError:  # pragma: no cover - optional dependency path
    redis = None


class BaseRateLimiter:
    def allow(self, key: str, limit: int, burst: int) -> bool:  # pragma: no cover - interface
        raise NotImplementedError


class SlidingWindowRateLimiter(BaseRateLimiter):
    """In-memory sliding window limiter (per-process)."""

    def __init__(self, window_seconds: float = 1.0) -> None:
        self.window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, limit: int, burst: int) -> bool:
        now = monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= burst:
                return False
            bucket.append(now)
            return True


class RedisRateLimiter(BaseRateLimiter):
    """Redis-backed fixed-window limiter (burst guard)."""

    SCRIPT = """
    local current = redis.call('incr', KEYS[1])
    if current == 1 then
        redis.call('pexpire', KEYS[1], ARGV[1])
    end
    if current > tonumber(ARGV[2]) then
        return 0
    end
    return 1
    """

    def __init__(self, client: "redis.Redis", window_seconds: float = 1.0) -> None:
        self.client = client
        self.window_ms = int(window_seconds * 1000)
        self._script = self.client.register_script(self.SCRIPT)

    def allow(self, key: str, limit: int, burst: int) -> bool:
        try:
            res = self._script(keys=[key], args=[self.window_ms, burst])
            return bool(res)
        except Exception:
            return False


def _build_rate_limiter() -> BaseRateLimiter:
    settings = get_settings()
    if redis and settings.redis_url:
        try:
            client = redis.from_url(settings.redis_url, decode_responses=False)
            client.ping()
            return RedisRateLimiter(client)
        except Exception:
            pass
    return SlidingWindowRateLimiter()


# Module-level singleton for ease of reuse
rate_limiter: BaseRateLimiter = _build_rate_limiter()
