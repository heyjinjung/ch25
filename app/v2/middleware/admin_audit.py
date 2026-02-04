"""Admin Audit Middleware & Decorators.

어드민 작업에 대한 감사 로그를 자동으로 기록하는 미들웨어/데코레이터.

사용 예시:
    @audit_admin(action="USER_UPDATE", target_type="user")
    def update_user(user_id: int, ...):
        ...
"""

from __future__ import annotations

import functools
import logging
from typing import Any, Callable, TypeVar

from sqlalchemy.orm import Session

from app.v2.services.admin_audit_service import V2AdminAuditService

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])


def audit_admin(
    action: str,
    target_type: str | None = None,
    get_target_id: Callable[..., str | None] | None = None,
    get_before: Callable[..., dict | None] | None = None,
    get_after: Callable[..., dict | None] | None = None,
) -> Callable[[F], F]:
    """Decorator to automatically log admin actions.
    
    Args:
        action: 감사 로그에 기록될 액션 이름 (예: "USER_UPDATE", "SEGMENT_RULE_CREATE")
        target_type: 대상 타입 (예: "user", "segment_rule")
        get_target_id: 대상 ID를 추출하는 함수 (함수 인자를 받음)
        get_before: before 상태를 추출하는 함수
        get_after: after 상태를 추출하는 함수
    
    사용 예시:
        @audit_admin(
            action="SEGMENT_RULE_CREATE",
            target_type="segment_rule",
            get_target_id=lambda result: str(result.id),
        )
        def create_segment_rule(...):
            ...
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # DB 세션과 admin_info 추출 시도
            db: Session | None = kwargs.get("db")
            admin_info = kwargs.get("admin_info")
            
            admin_id: int | None = None
            if admin_info:
                if isinstance(admin_info, tuple) and len(admin_info) >= 1:
                    admin_id = admin_info[0]
                elif isinstance(admin_info, int):
                    admin_id = admin_info
            
            # 함수 실행
            result = func(*args, **kwargs)
            
            # 감사 로그 기록 시도
            if db and admin_id:
                try:
                    target_id = None
                    if get_target_id:
                        target_id = get_target_id(result)
                    
                    before = None
                    if get_before:
                        before = get_before(*args, **kwargs)
                    
                    after = None
                    if get_after:
                        after = get_after(result)
                    
                    V2AdminAuditService.log(
                        db,
                        admin_id=admin_id,
                        action=action,
                        target_type=target_type,
                        target_id=target_id,
                        before=before,
                        after=after,
                        auto_commit=True,
                    )
                except Exception as e:
                    logger.warning(f"Failed to log admin audit for {action}: {e}")
            
            return result
        
        return wrapper  # type: ignore
    
    return decorator


def log_admin_action(
    db: Session,
    admin_id: int,
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    before: Any = None,
    after: Any = None,
) -> None:
    """Helper function to log admin action manually.
    
    데코레이터를 사용할 수 없는 경우 (복잡한 로직 등) 직접 호출.
    
    Args:
        db: SQLAlchemy 세션
        admin_id: 어드민 사용자 ID
        action: 액션 이름
        target_type: 대상 타입
        target_id: 대상 ID
        before: 변경 전 상태
        after: 변경 후 상태
    """
    try:
        V2AdminAuditService.log(
            db,
            admin_id=admin_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            before=before,
            after=after,
            auto_commit=True,
        )
    except Exception as e:
        logger.warning(f"Failed to log admin audit for {action}: {e}")
