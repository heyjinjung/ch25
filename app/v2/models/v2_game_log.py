"""V2 Game Log Model for external casino game log imports.

This model stores game log data imported from external CSV files,
enabling real-time revenue analysis, streak detection, and risk assessment.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.v2.utils.timezone import kst_now


class V2GameLog(Base):
    """외부 게임 로그 저장 테이블.
    
    CSV Import를 통해 반입된 외부 카지노 게임 로그를 저장합니다.
    - 실시간 수익/지출 분석
    - 연패 감지 및 이탈 위험 분석
    - 고액 배팅 유저 추적
    """

    __tablename__ = "v2_game_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # 중복 방지 키 (선택적)
    dedup_key = Column(
        String(128),
        unique=True,
        nullable=True,
        index=True,
        comment="중복 방지 키 (user_id + game_type + timestamp)",
    )
    
    # 유저 연결 (V2User와 FK)
    user_id = Column(
        Integer,
        ForeignKey("v2_user.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="V2 유저 ID",
    )
    
    # 게임 정보
    game_type = Column(
        String(32),
        nullable=False,
        comment="게임 종류 (DICE, ROULETTE, SLOT, POKER 등)",
    )
    result = Column(
        String(16),
        nullable=False,
        comment="게임 결과 (WIN, LOSE, DRAW, JACKPOT)",
    )
    
    # 금액 정보
    bet_amount = Column(
        BigInteger,
        nullable=False,
        default=0,
        comment="배팅 금액 (원)",
    )
    payout_amount = Column(
        BigInteger,
        nullable=False,
        default=0,
        comment="지급 금액 (원)",
    )
    balance_after = Column(
        BigInteger,
        nullable=False,
        default=0,
        comment="게임 후 잔액 (원)",
    )
    
    # 외부 시스템 참조
    external_user_id = Column(
        String(128),
        nullable=True,
        comment="외부 시스템 유저 ID",
    )
    session_id = Column(
        String(128),
        nullable=True,
        index=True,
        comment="게임 세션 ID",
    )
    
    # 메타데이터
    game_metadata = Column(
        JSON,
        nullable=True,
        comment="게임별 추가 정보 (JSON)",
    )
    
    # 타임스탬프
    recorded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="CSV의 기록 일시 (원본 데이터)",
    )
    # Assuming _kst_now is defined elsewhere or will be added.
    # For a complete solution, _kst_now would need to be imported or defined.
    # Example:
    # from pytz import timezone
    # KST = timezone('Asia/Seoul')
    # def _kst_now():
    #     return datetime.now(KST)
    created_at = Column(DateTime, nullable=False, default=kst_now)
    updated_at = Column(DateTime, nullable=False, default=kst_now, onupdate=kst_now)

    imported_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="시스템 반입 시각",
    )
    
    # Import 추적
    import_job_id = Column(
        String(64),
        nullable=True,
        index=True,
        comment="CSV Import Job ID",
    )

    # Relationships
    user = relationship("V2User", back_populates="game_logs", lazy="joined")

    __table_args__ = (
        Index("ix_v2_game_log_user_recorded", "user_id", "recorded_at"),
        Index("ix_v2_game_log_recorded_at", "recorded_at"),
        Index("ix_v2_game_log_result_recorded", "result", "recorded_at"),
        Index("ix_v2_game_log_game_type", "game_type"),
        {"comment": "V2 외부 게임 로그 테이블"},
    )

    def __repr__(self) -> str:
        return (
            f"<V2GameLog(id={self.id}, user_id={self.user_id}, "
            f"game_type={self.game_type}, result={self.result}, "
            f"bet={self.bet_amount}, payout={self.payout_amount})>"
        )

    @property
    def net_result(self) -> int:
        """순 결과 금액 (지급 - 배팅). 음수면 유저 손실."""
        return self.payout_amount - self.bet_amount

    @property
    def is_win(self) -> bool:
        """승리 여부."""
        return self.result in ("WIN", "JACKPOT")

    @property
    def is_loss(self) -> bool:
        """패배 여부."""
        return self.result == "LOSE"
