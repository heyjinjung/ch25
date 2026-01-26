"""Global Circuit Breaker for Payout Safety.

이 모듈은 일일 지급 상한을 초과할 경우 자동으로 지급을 차단하는
서킷 브레이커 로직을 제공합니다.

주요 기능:
1. 일일 총 지급액 추적 (Redis 기반)
2. 글로벌 리밋 초과 시 자동 차단 (OPEN 상태)
3. 어드민 수동 리셋 지원
4. Fallback: Redis 미연결 시 DB 기반 카운팅

사용 예시:
    from app.services.circuit_breaker import CircuitBreaker
    
    cb = CircuitBreaker()
    if not cb.check_payout_allowed(amount=5000):
        raise PayoutBlockedError("Daily payout limit exceeded")
    
    # 지급 성공 후 추적
    cb.record_payout(amount=5000, source="DICE_WIN")
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, date
from enum import Enum
from typing import Optional, Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import get_settings
from app.utils.timezone import business_day_start, KST

logger = logging.getLogger(__name__)


class CircuitState(str, Enum):
    """서킷 브레이커 상태."""
    CLOSED = "CLOSED"   # 정상 운영 (지급 허용)
    OPEN = "OPEN"       # 차단 (리밋 초과)
    HALF_OPEN = "HALF_OPEN"  # 테스트 중 (일부 허용)


# 기본 설정값
DEFAULT_DAILY_PAYOUT_LIMIT = 50_000_000  # 5천만 원
DEFAULT_WARNING_THRESHOLD_PCT = 80  # 80% 도달 시 경고


class CircuitBreaker:
    """글로벌 지급 서킷 브레이커.
    
    Redis가 설정된 경우 Redis를 사용하고,
    그렇지 않으면 DB 기반 fallback을 사용합니다.
    """
    
    REDIS_KEY_PREFIX = "circuit_breaker:payout"
    REDIS_STATE_KEY = f"{REDIS_KEY_PREFIX}:state"
    REDIS_TOTAL_KEY = f"{REDIS_KEY_PREFIX}:daily_total"
    REDIS_LOG_KEY = f"{REDIS_KEY_PREFIX}:log"
    
    def __init__(
        self,
        daily_limit: int | None = None,
        warning_threshold_pct: int = DEFAULT_WARNING_THRESHOLD_PCT,
    ):
        self.settings = get_settings()
        self.daily_limit = daily_limit or DEFAULT_DAILY_PAYOUT_LIMIT
        self.warning_threshold = int(self.daily_limit * warning_threshold_pct / 100)
        self._redis_client = None
        self._redis_available: bool | None = None
    
    def _get_redis(self):
        """Redis 클라이언트 획득 (lazy init)."""
        if self._redis_available is False:
            return None
        
        if self._redis_client is None:
            redis_url = self.settings.redis_url
            if not redis_url:
                self._redis_available = False
                logger.warning("Circuit breaker: Redis URL not configured, using DB fallback")
                return None
            
            try:
                import redis
                self._redis_client = redis.from_url(redis_url, decode_responses=True)
                self._redis_client.ping()
                self._redis_available = True
                logger.info("Circuit breaker: Redis connection established")
            except Exception as e:
                logger.warning(f"Circuit breaker: Redis connection failed ({e}), using DB fallback")
                self._redis_available = False
                return None
        
        return self._redis_client
    
    def _get_business_day_key(self) -> str:
        """현재 비즈니스 일자 키 (09:00 KST 기준)."""
        start = business_day_start()
        return start.strftime("%Y%m%d_%H")
    
    def get_state(self, db: Session | None = None) -> CircuitState:
        """현재 서킷 브레이커 상태 조회."""
        redis_client = self._get_redis()
        day_key = self._get_business_day_key()
        
        if redis_client:
            try:
                state_key = f"{self.REDIS_STATE_KEY}:{day_key}"
                state = redis_client.get(state_key)
                if state:
                    return CircuitState(state)
            except Exception as e:
                logger.error(f"Circuit breaker: Redis state read failed: {e}")
        
        # Fallback: 상태가 없으면 CLOSED (정상)
        return CircuitState.CLOSED
    
    def _set_state(self, state: CircuitState, reason: str = ""):
        """서킷 브레이커 상태 설정."""
        redis_client = self._get_redis()
        day_key = self._get_business_day_key()
        
        if redis_client:
            try:
                state_key = f"{self.REDIS_STATE_KEY}:{day_key}"
                redis_client.set(state_key, state.value, ex=86400 * 2)  # 2일 TTL
                
                # 상태 변경 로그
                log_entry = {
                    "timestamp": datetime.now(KST).isoformat(),
                    "state": state.value,
                    "reason": reason,
                }
                redis_client.lpush(f"{self.REDIS_LOG_KEY}:{day_key}", json.dumps(log_entry))
                redis_client.ltrim(f"{self.REDIS_LOG_KEY}:{day_key}", 0, 99)  # 최근 100개
                
                logger.info(f"Circuit breaker state changed to {state.value}: {reason}")
            except Exception as e:
                logger.error(f"Circuit breaker: Redis state write failed: {e}")
    
    def get_daily_total(self, db: Session | None = None) -> int:
        """오늘 비즈니스 일자의 총 지급액 조회."""
        redis_client = self._get_redis()
        day_key = self._get_business_day_key()
        
        if redis_client:
            try:
                total_key = f"{self.REDIS_TOTAL_KEY}:{day_key}"
                total = redis_client.get(total_key)
                return int(total) if total else 0
            except Exception as e:
                logger.error(f"Circuit breaker: Redis total read failed: {e}")
        
        # Fallback: DB 기반 조회
        if db:
            return self._get_daily_total_from_db(db)
        
        return 0
    
    def _get_daily_total_from_db(self, db: Session) -> int:
        """DB에서 오늘 비즈니스 일자의 총 지급액 조회."""
        from app.models.user_cash_ledger import UserCashLedger
        
        start_utc = business_day_start()
        
        total = db.query(func.coalesce(func.sum(UserCashLedger.amount), 0)).filter(
            UserCashLedger.created_at >= start_utc,
            UserCashLedger.amount > 0,  # 지급(양수)만
        ).scalar() or 0
        
        return int(total)
    
    def check_payout_allowed(
        self,
        amount: int,
        db: Session | None = None,
    ) -> tuple[bool, str]:
        """지급 허용 여부 확인.
        
        Returns:
            (allowed, reason) tuple
        """
        state = self.get_state(db)
        
        if state == CircuitState.OPEN:
            return False, "Circuit breaker is OPEN - daily payout limit exceeded"
        
        current_total = self.get_daily_total(db)
        projected_total = current_total + amount
        
        if projected_total > self.daily_limit:
            # 리밋 초과 → OPEN 상태로 전환
            self._set_state(
                CircuitState.OPEN,
                f"Limit exceeded: {current_total} + {amount} > {self.daily_limit}"
            )
            return False, f"Payout would exceed daily limit ({projected_total:,} > {self.daily_limit:,})"
        
        # 경고 임계값 체크
        if projected_total >= self.warning_threshold:
            logger.warning(
                f"Circuit breaker warning: approaching limit "
                f"({projected_total:,} / {self.daily_limit:,})"
            )
        
        return True, "OK"
    
    def record_payout(
        self,
        amount: int,
        source: str,
        user_id: int | None = None,
    ) -> int:
        """지급 기록 (Redis 카운터 증가).
        
        Returns:
            새로운 일일 총액
        """
        if amount <= 0:
            return self.get_daily_total()
        
        redis_client = self._get_redis()
        day_key = self._get_business_day_key()
        
        if redis_client:
            try:
                total_key = f"{self.REDIS_TOTAL_KEY}:{day_key}"
                new_total = redis_client.incrby(total_key, amount)
                redis_client.expire(total_key, 86400 * 2)  # 2일 TTL
                
                return new_total
            except Exception as e:
                logger.error(f"Circuit breaker: Redis record failed: {e}")
        
        # Fallback: 기록 없이 현재 총액 반환 (DB가 SoT)
        return self.get_daily_total()
    
    def admin_reset(self, admin_id: int, reason: str = "Manual reset") -> bool:
        """어드민 수동 리셋.
        
        서킷 브레이커를 CLOSED 상태로 되돌립니다.
        (일일 카운터는 리셋하지 않음 - 감사 추적용)
        """
        self._set_state(
            CircuitState.CLOSED,
            f"Admin reset by {admin_id}: {reason}"
        )
        logger.info(f"Circuit breaker reset by admin {admin_id}: {reason}")
        return True
    
    def get_status_summary(self, db: Session | None = None) -> dict[str, Any]:
        """현재 서킷 브레이커 상태 요약."""
        current_total = self.get_daily_total(db)
        state = self.get_state(db)
        
        return {
            "state": state.value,
            "daily_total": current_total,
            "daily_limit": self.daily_limit,
            "usage_pct": round(current_total / self.daily_limit * 100, 2) if self.daily_limit > 0 else 0,
            "remaining": max(0, self.daily_limit - current_total),
            "warning_threshold": self.warning_threshold,
            "redis_available": self._redis_available,
            "business_day_key": self._get_business_day_key(),
        }


# 글로벌 싱글톤 인스턴스
_circuit_breaker_instance: CircuitBreaker | None = None


def get_circuit_breaker() -> CircuitBreaker:
    """글로벌 서킷 브레이커 인스턴스 획득."""
    global _circuit_breaker_instance
    if _circuit_breaker_instance is None:
        _circuit_breaker_instance = CircuitBreaker()
    return _circuit_breaker_instance


def check_payout_safe(amount: int, db: Session | None = None) -> tuple[bool, str]:
    """지급 안전성 체크 (헬퍼 함수).
    
    사용 예시:
        allowed, reason = check_payout_safe(5000, db)
        if not allowed:
            raise HTTPException(status_code=503, detail=reason)
    """
    return get_circuit_breaker().check_payout_allowed(amount, db)


def record_payout(amount: int, source: str, user_id: int | None = None) -> int:
    """지급 기록 (헬퍼 함수)."""
    return get_circuit_breaker().record_payout(amount, source, user_id)
