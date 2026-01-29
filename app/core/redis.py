"""Redis client wrapper for V2 services"""
import redis
from app.core.config import get_settings

settings = get_settings()

# Initialize Redis client
# In production, use connection pool and proper configuration
redis_client = redis.Redis(
    host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
    port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
    db=settings.REDIS_DB if hasattr(settings, 'REDIS_DB') else 0,
    decode_responses=True,  # Auto-decode bytes to str
)
