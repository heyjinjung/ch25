"""
V2 Refresh Token 모델

30일 sliding window Refresh Token 저장
토큰 갱신 시 last_used_at 업데이트, 만료 30일 미만 시 새 토큰 발급
"""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, Index
from app.db.base_class import Base


class V2UserRefreshToken(Base):
    """
    V2 유저 Refresh Token

    JWT Refresh Token의 메타데이터를 저장합니다.
    - jti: JWT Token ID (UUID)
    - expires_at: 만료 시각 (30일)
    - revoked_at: 폐기 시각 (로그아웃 시)
    - last_used_at: 마지막 사용 시각 (sliding window)
    """

    __tablename__ = "v2_user_refresh_token"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=False, index=True, comment="유저 ID")
    jti = Column(
        String(64), nullable=False, unique=True, index=True, comment="JWT Token ID (UUID)"
    )
    expires_at = Column(DateTime, nullable=False, index=True, comment="만료 시각")
    revoked_at = Column(DateTime, nullable=True, comment="폐기 시각 (NULL이면 유효)")
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), comment="생성 시각"
    )
    last_used_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), comment="마지막 사용 시각"
    )

    __table_args__ = (
        Index("idx_v2_refresh_token_user_expires", "user_id", "expires_at"),
        {"comment": "V2 유저 Refresh Token (30일 sliding window)"},
    )

    @property
    def is_valid(self) -> bool:
        """토큰 유효성 확인"""
        if self.revoked_at is not None:
            return False
        if self._as_utc(self.expires_at) < datetime.now(timezone.utc):
            return False
        return True

    @property
    def is_revoked(self) -> bool:
        """토큰 폐기 여부"""
        return self.revoked_at is not None

    @property
    def is_expired(self) -> bool:
        """토큰 만료 여부"""
        return self._as_utc(self.expires_at) < datetime.now(timezone.utc)

    @staticmethod
    def _as_utc(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def __repr__(self):
        return f"<V2UserRefreshToken(id={self.id}, user_id={self.user_id}, jti={self.jti[:8]}...)>"
