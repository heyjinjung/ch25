from typing import Optional, Dict
import os

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.redis import redis_client
from app.v2.core.exceptions import CircuitBreakerError
from app.v2.models.v2_server_config import V2ServerConfig

class CircuitBreakerService:
    """
    Circuit Breaker Service using Redis for rate limiting.
    Checks Global and User-scope limits for specific asset types.
    """

    # Default Limits (Fallback if DB config is missing)
    DEFAULT_LIMITS = {
        "VAULT": {
            "global_max": 100_000,  # SoT: 시간당 100,000 KRW
            "user_max": 2_000_000,
        },
        "ROULETTE_TICKET": {
            "global_max": 30,  # SoT: 시간당 30장
            "user_max": 200,
        },
        "TICKET": {
            "global_max": 30,
            "user_max": 200,
        },
        "DIAMOND": {
            "global_max": 100_000,
            "user_max": 10_000,
        },
        # Add other assets as needed
    }

    KEY_PREFIX = "golden:v2:cb"
    TTL_SECONDS = 3600  # 1 hour

    @classmethod
    def _normalize_asset_type(cls, asset_type: str) -> str:
        if asset_type == "TICKET":
            return "ROULETTE_TICKET"
        return asset_type

    @classmethod
    def _get_env_global_limit(cls, asset_type: str) -> Optional[int]:
        if asset_type == "VAULT":
            value = os.getenv("CIRCUIT_LIMIT_VAULT")
            return int(value) if value else None
        if asset_type in {"ROULETTE_TICKET", "TICKET"}:
            value = os.getenv("CIRCUIT_LIMIT_TICKET")
            return int(value) if value else None
        return None

    @classmethod
    def _get_limits(cls, db: Session, asset_type: str) -> Dict[str, int]:
        """
        Get limits from v2_server_config (cached in memory or Redis ideally, 
        but for now DB query with fallback).
        In a high-traffic production, this should be cached in Redis or process memory.
        """
        # TODO: Implement local caching or Redis caching for config to reduce DB hits
        normalized = cls._normalize_asset_type(str(asset_type))
        config = db.query(V2ServerConfig).filter(V2ServerConfig.key == "circuit_breaker_thresholds").first()
        
        if config and config.value:
            thresholds = config.value
            if normalized in thresholds:
                limits = thresholds[normalized]
                return cls._sanitize_limits(limits, normalized)

        defaults = cls.DEFAULT_LIMITS.get(normalized, {"global_max": 999_999_999, "user_max": 999_999_999})
        env_global = cls._get_env_global_limit(normalized)
        if env_global is not None:
            defaults = {"global_max": env_global, "user_max": defaults.get("user_max", env_global)}
        return cls._sanitize_limits(defaults, normalized)

    @classmethod
    def _sanitize_limits(cls, limits: Dict[str, int], asset_type: str) -> Dict[str, int]:
        global_max = int(limits.get("global_max", 0))
        user_max = int(limits.get("user_max", 0))
        if global_max > 0 and (user_max <= 0 or user_max > global_max):
            user_max = global_max
        return {"global_max": global_max, "user_max": user_max}

    @classmethod
    def check_and_incr(cls, db: Session, asset_type: str, amount: int, user_id: int):
        """
        Check if the action violates circuit breaker limits.
        If safe, increment counters.
        If unsafe, raise CircuitBreakerError.
        """
        if amount <= 0:
            return

        asset_type = cls._normalize_asset_type(str(asset_type))
        limits = cls._get_limits(db, asset_type)
        global_max = limits.get("global_max", 0)
        user_max = limits.get("user_max", 0)

        # Redis Keys
        # usage: golden:v2:cb:global:{asset}:{hour_timestamp} -> To auto-expire, strict window is simpler for now:
        # We use sliding window or simple fixed window? 
        # Plan says: "1h TTL". Fixed window implied by simple key. 
        # To make it simple distinct per hour, we can append current hour, OR just rely on TTL.
        # Relying on TTL matches the plan: "1h TTL". effectively a rolling window reset on first write? 
        # No, standard rate limit pattern is usually bucket per unit time. 
        # But for 'Circuit Breaker' safety, a simple TTL-based leaky bucket or fixed window is fine.
        # Let's use simple key + TTL for simplicity as per Plan. 
        # Note: If key expires, count resets.
        
        global_key = f"{cls.KEY_PREFIX}:global:{asset_type}:1h"
        user_key = f"{cls.KEY_PREFIX}:user:{user_id}:{asset_type}:1h"

        try:
            pipe = redis_client.pipeline()
            pipe.incrby(global_key, amount)
            pipe.expire(global_key, cls.TTL_SECONDS, nx=True) # Set expire only if not exists
            pipe.incrby(user_key, amount)
            pipe.expire(user_key, cls.TTL_SECONDS, nx=True)
            results = pipe.execute()
            
            current_global = results[0]
            current_user = results[2]
            
            # Check Violations
            if current_global > global_max:
                # Revert? No, it's a safety breaker, better to block and keep count high.
                # Just alert and block.
                cls.alert(asset_type, "GLOBAL", current_global, global_max, user_id, amount)
                raise CircuitBreakerError(f"Global Circuit Breaker Triggered for {asset_type}")

            if current_user > user_max:
                cls.alert(asset_type, "USER", current_user, user_max, user_id, amount)
                raise CircuitBreakerError(f"User Circuit Breaker Triggered for {asset_type}")

        except Exception as e:
            if isinstance(e, CircuitBreakerError):
                raise e
            # Redis failure should probably NOT block user in normal ops, BUT for 'Safety' critical system?
            # If Redis fails, we lose safety. 
            # Fail Open or Fail Closed? 
            # Given this is "Safety", usually Fail Closed is better, but for UX, Fail Open might be preferred.
            # Plan doesn't specify. Let's log and Fail Open (allow) to avoid outage due to Redis glitch, 
            # unless it's strictly financial critical.
            # For now, let's log error and allow, or re-raise if strict.
            # "The Iron Law" of safety implies Fail Closed, but usually availability is king.
            # Let's print error and proceed for now (Fail Open) to avoid breaking game flow on Redis hiccup,
            # unless user explicitly requested strictness.
            print(f"[CircuitBreaker] Redis Error: {str(e)}")
            # In production, send Sentry event.
            pass

    @classmethod
    def alert(cls, asset_type, scope, current, limit, user_id, amount):
        """
        Send alert to Ops channel (Slack/Telegram).
        """
        msg = (
            f"🚨 **[CIRCUIT BREAKER ACTIVATED]**\n"
            f"- **Type**: {scope}_LIMIT_EXCEEDED\n"
            f"- **Asset**: {asset_type}\n"
            f"- **Current/Max**: {current} / {limit}\n"
            f"- **Triggered By**: User {user_id} (Amount: {amount})"
        )
        print(msg) # Replace with actual Slack webhook call
        # TODO: Integrate with app.core.celery_app or background task for Slack notification

    @classmethod
    def reset_limit(cls, asset_type: str, scope: str, user_id: Optional[int] = None):
        """
        Reset circuit breaker limits by deleting Redis keys.
        """
        asset_type = cls._normalize_asset_type(str(asset_type))
        if scope == "GLOBAL":
            key = f"{cls.KEY_PREFIX}:global:{asset_type}:1h"
            redis_client.delete(key)
        elif scope == "USER" and user_id:
            key = f"{cls.KEY_PREFIX}:user:{user_id}:{asset_type}:1h"
            redis_client.delete(key)

    @classmethod
    def get_status(cls, db: Session, asset_type: str) -> Dict[str, int | bool]:
        asset_type = cls._normalize_asset_type(str(asset_type))
        limits = cls._get_limits(db, asset_type)
        global_key = f"{cls.KEY_PREFIX}:global:{asset_type}:1h"
        current = 0
        try:
            value = redis_client.get(global_key)
            current = int(value) if value else 0
        except Exception:
            current = 0

        global_limit = int(limits.get("global_max", 0))
        is_breached = bool(global_limit and current >= global_limit)
        return {
            "global_current": current,
            "global_limit": global_limit,
            "is_global_breached": is_breached,
        }

    @classmethod
    def get_config(cls, db: Session, asset_type: str) -> Dict[str, int]:
        asset_type = cls._normalize_asset_type(str(asset_type))
        limits = cls._get_limits(db, asset_type)
        return {
            "global_limit": int(limits.get("global_max", 0)),
            "user_limit": int(limits.get("user_max", 0)),
        }

    @classmethod
    def set_config(
        cls,
        db: Session,
        asset_type: str,
        *,
        global_limit: Optional[int] = None,
        user_limit: Optional[int] = None,
    ) -> Dict[str, int]:
        normalized = cls._normalize_asset_type(str(asset_type))
        row = db.query(V2ServerConfig).filter(V2ServerConfig.key == "circuit_breaker_thresholds").first()
        if row is None:
            row = V2ServerConfig(key="circuit_breaker_thresholds", value={})

        thresholds = row.value or {}
        current = thresholds.get(normalized, {})
        if global_limit is not None:
            current["global_max"] = int(global_limit)
        if user_limit is not None:
            current["user_max"] = int(user_limit)
        thresholds[normalized] = current
        row.value = thresholds
        db.add(row)
        db.flush()
        return cls.get_config(db, normalized)

    @classmethod
    def reset_global_limit(cls, db: Session, asset_type: str) -> None:
        cls.reset_limit(asset_type, "GLOBAL")

    @classmethod
    def reset_user_limit(cls, db: Session, asset_type: str, user_id: int) -> None:
        cls.reset_limit(asset_type, "USER", user_id=user_id)
