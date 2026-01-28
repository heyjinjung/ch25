"""
V2 Auth Event 모델

로그인/로그아웃/토큰갱신 등 인증 이벤트 기록
감사 로그 정책: 90일 보존
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Enum, Integer, String, Index
from app.db.base_class import Base


class AuthEventType(str, PyEnum):
    """인증 이벤트 타입"""

    LOGIN_SUCCESS = "LOGIN_SUCCESS"  # 로그인 성공
    LOGIN_FAILED = "LOGIN_FAILED"  # 로그인 실패
    LOGOUT = "LOGOUT"  # 로그아웃
    TOKEN_REFRESH = "TOKEN_REFRESH"  # 토큰 갱신
    TELEGRAM_LINK = "TELEGRAM_LINK"  # 텔레그램 연동
    TELEGRAM_UNLINK = "TELEGRAM_UNLINK"  # 텔레그램 해제
    RBAC_DENIED = "RBAC_DENIED"  # RBAC 권한 거부


class V2UserAuthEvent(Base):
    """
    V2 유저 인증 이벤트 로그

    모든 인증 관련 이벤트를 기록합니다.
    - 로그인 성공/실패
    - 로그아웃
    - 토큰 갱신
    - 텔레그램 연동/해제
    - RBAC 권한 거부
    """

    __tablename__ = "v2_user_auth_event"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True, comment="유저 ID (실패 시 0)")
    event_type = Column(
        Enum(AuthEventType), nullable=False, comment="이벤트 타입"
    )
    ip_address = Column(String(45), nullable=True, comment="클라이언트 IP (IPv6 지원)")
    user_agent = Column(String(500), nullable=True, comment="User-Agent 헤더")
    telegram_id = Column(BigInteger, nullable=True, comment="텔레그램 유저 ID")
    success = Column(Boolean, nullable=False, default=True, comment="성공 여부")
    error_message = Column(String(500), nullable=True, comment="실패 시 에러 메시지")
    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, index=True, comment="생성 시각"
    )

    __table_args__ = (
        Index("idx_v2_user_auth_event_user_created", "user_id", "created_at"),
        {"comment": "V2 유저 인증 이벤트 로그 (90일 보존)"},
    )

    def __repr__(self):
        return f"<V2UserAuthEvent(id={self.id}, user_id={self.user_id}, event_type={self.event_type})>"
