"""V2 Streak Service - Streak 로직 전담 서비스.

책임 분리: V2MissionService에서 Streak 관련 로직 분리
See: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/mission/10.mission_actionable_guides.md (C항목)

Public API:
- get_user_streak_info(user_id): 유저 스트릭 정보 조회
- get_pending_streak_milestone(user_id): 클레임 가능한 마일스톤 조회
- claim_streak_reward(user_id): 스트릭 보상 클레임
- compute_claimable_day(user_id): 클레임 가능 일수 계산
- get_operational_play_date(now_tz): 운영일 계산 (09:00 KST 리셋)
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.models.feature import UserEventLog
from app.v2.services.reward_service import V2RewardService
from app.v2.services.ui_config_service import UiConfigService
from app.v2.schemas.v2_mission import StreakInfoSchema

logger = logging.getLogger(__name__)


class V2StreakService:
    """V2 Streak Service - 스트릭 관련 로직 전담.
    
    SoT: v2_streak_policy_sot_ko.md
    - DB: user_mission_streak
    - 보상: 수동 클레임
    - 필드: claimable_day
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
    
    # =========================================================================
    # Time Utilities
    # =========================================================================
    
    def _now_tz(self) -> datetime:
        """현재 시각 (KST)."""
        tz = ZoneInfo(self.settings.timezone or "Asia/Seoul")
        return datetime.now(tz)
    
    @staticmethod
    def get_operational_play_date(now_tz: datetime, reset_hour: int = 9) -> date:
        """운영일 계산 (KST day with reset at configured hour).
        
        09:00 KST 리셋 기준:
        - 00:00~08:59 → 전날 운영일
        - 09:00~23:59 → 오늘 운영일
        
        Args:
            now_tz: 현재 시각 (timezone-aware)
            reset_hour: 리셋 시간 (기본 9시)
            
        Returns:
            운영일 (date)
        """
        today = now_tz.date()
        if now_tz.hour < reset_hour:
            return today - timedelta(days=1)
        return today
    
    def _operational_play_date(self, now_tz: datetime) -> date:
        """Instance method wrapper for operational play date."""
        reset_hour = int(getattr(self.settings, "streak_day_reset_hour_kst", 9) or 9)
        return self.get_operational_play_date(now_tz, reset_hour)
    
    # =========================================================================
    # Streak Info
    # =========================================================================
    
    def get_user_streak_info(self, user_id: int) -> StreakInfoSchema:
        """유저 스트릭 정보 조회.
        
        Returns:
            StreakInfoSchema with:
            - streak_days: 현재 연속 일수
            - current_multiplier: 현재 배율
            - is_hot: 핫 스트릭 여부 (3일 이상)
            - is_legend: 레전드 스트릭 여부 (7일 이상)
            - next_milestone: 다음 마일스톤
            - claimable_day: 클레임 가능한 마일스톤 일수
        """
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return StreakInfoSchema(
                streak_days=0,
                current_multiplier=1.0,
                is_hot=False,
                is_legend=False,
                next_milestone=3
            )
        
        streak_days = int(user.play_streak or 0)
        hot_threshold = int(getattr(self.settings, "streak_hot_threshold_days", 3) or 3)
        legend_threshold = int(getattr(self.settings, "streak_legend_threshold_days", 7) or 7)
        
        is_hot = streak_days >= hot_threshold
        is_legend = streak_days >= legend_threshold
        
        # 다음 마일스톤 계산
        if streak_days < hot_threshold:
            next_milestone = hot_threshold
        elif streak_days < legend_threshold:
            next_milestone = legend_threshold
        else:
            # 7일 단위로 다음 마일스톤
            next_milestone = ((streak_days // 7) + 1) * 7
        
        claimable_day = self.get_pending_streak_milestone(user_id)
        
        return StreakInfoSchema(
            streak_days=streak_days,
            current_multiplier=self._get_streak_multiplier(streak_days),
            is_hot=is_hot,
            is_legend=is_legend,
            next_milestone=next_milestone,
            claimable_day=claimable_day
        )
    
    def _get_streak_multiplier(self, streak_days: int) -> float:
        """스트릭에 따른 보상 배율 계산."""
        if not self.settings.streak_multiplier_enabled:
            return 1.0
        if streak_days >= self.settings.streak_legend_threshold_days:
            return self.settings.streak_legend_multiplier
        if streak_days >= self.settings.streak_hot_threshold_days:
            return self.settings.streak_hot_multiplier
        return 1.0
    
    # =========================================================================
    # Streak Milestone & Reward
    # =========================================================================
    
    def get_pending_streak_milestone(self, user_id: int) -> Optional[int]:
        """클레임 가능한 마일스톤 일수 조회.
        
        Returns:
            클레임 가능한 마일스톤 일수 (없으면 None)
        """
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        
        if not user or not user.play_streak:
            return None
        
        streak_days = int(user.play_streak)
        rules = self._get_streak_reward_rules()
        achieved_milestones = sorted(
            [r["day"] for r in rules if streak_days >= r["day"]],
            reverse=True
        )
        
        for m_day in achieved_milestones:
            if not user.last_play_date:
                continue
            
            hit_date = user.last_play_date - timedelta(days=(streak_days - m_day))
            event_name = f"streak.reward_grant.{m_day}.{hit_date.isoformat()}"
            
            exists = self.db.execute(
                select(UserEventLog).where(
                    UserEventLog.user_id == user_id,
                    UserEventLog.event_name == event_name
                )
            ).first()
            
            if not exists:
                return m_day
        
        return None
    
    def compute_claimable_day(self, user_id: int) -> Optional[int]:
        """클레임 가능 일수 계산 (alias for get_pending_streak_milestone)."""
        return self.get_pending_streak_milestone(user_id)
    
    def _get_streak_reward_rules(self) -> List[Dict[str, Any]]:
        """스트릭 보상 규칙 조회 (UI Config 기반)."""
        row = UiConfigService.get(self.db, "streak_reward_rules")
        if row and row.value_json:
            return row.value_json.get("rules", [])
        
        # 기본값 (Config 없을 때)
        return [
            {
                "day": 3,
                "enabled": True,
                "grants": [
                    {"kind": "WALLET", "token_type": "ROULETTE_TICKET", "amount": 1},
                    {"kind": "WALLET", "token_type": "DICE_TICKET", "amount": 1},
                    {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
                ]
            },
            {
                "day": 7,
                "enabled": True,
                "grants": [
                    {"kind": "WALLET", "token_type": "DIAMOND", "amount": 1}
                ]
            }
        ]
    
    def claim_streak_reward(self, user_id: int) -> Dict[str, Any]:
        """스트릭 마일스톤 보상 클레임.
        
        Returns:
            성공 시: {"success": True, "day": int, "grants": list}
            실패 시: {"success": False, "message": str}
        """
        target_day = self.get_pending_streak_milestone(user_id)
        if not target_day:
            return {"success": False, "message": "NO_CLAIMABLE_REWARD"}
        
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return {"success": False, "message": "USER_NOT_FOUND"}
        
        streak_days = int(user.play_streak)
        hit_date = user.last_play_date - timedelta(days=(streak_days - target_day))
        event_name = f"streak.reward_grant.{target_day}.{hit_date.isoformat()}"
        
        rules = self._get_streak_reward_rules()
        rule = next((r for r in rules if r["day"] == target_day), None)
        if not rule:
            return {"success": False, "message": "RULE_NOT_FOUND"}
        
        grants = rule.get("grants", [])
        results = []
        reward_service = V2RewardService()
        
        meta = {
            "reason": "STREAK_MILESTONE_REWARD",
            "milestone_day": target_day,
            "streak_days": streak_days,
            "hit_date": hit_date.isoformat()
        }
        
        for g in grants:
            kind = g.get("kind")
            amount = int(g.get("amount", 0))
            
            if kind == "WALLET":
                tt = g.get("token_type")
                reward_service.deliver(
                    self.db,
                    user_id=user_id,
                    reward_type=tt,
                    reward_amount=amount,
                    meta=meta,
                    commit=False
                )
                results.append({"type": tt, "amount": amount})
                
            elif kind == "INVENTORY":
                it = g.get("item_type")
                reward_service.deliver(
                    self.db,
                    user_id=user_id,
                    reward_type=it,
                    reward_amount=amount,
                    meta=meta,
                    commit=False
                )
                results.append({"type": it, "amount": amount})
        
        # 완료 로그 기록
        self.db.add(UserEventLog(
            user_id=user_id,
            feature_type="STREAK",
            event_name=event_name,
            meta_json={**meta, "grants": results}
        ))
        
        self.db.commit()
        
        logger.info(
            f"[STREAK] Reward claimed: user_id={user_id}, day={target_day}, "
            f"grants={len(results)}"
        )
        
        return {"success": True, "day": target_day, "grants": results}
    
    # =========================================================================
    # Streak Reset (Utility)
    # =========================================================================
    
    def reset_user_streak(self, user_id: int, *, commit: bool = True) -> bool:
        """유저 스트릭 초기화 (관리자/테스트용).
        
        Args:
            user_id: 유저 ID
            commit: 커밋 여부
            
        Returns:
            성공 여부
        """
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()
        
        if not user:
            return False
        
        user.play_streak = 0
        user.last_play_date = None
        
        if commit:
            self.db.commit()

        logger.info(f"[STREAK] Reset: user_id={user_id}")
        return True

    def set_streak_count(
        self,
        user_id: int,
        streak_days: int,
        *,
        adjust_last_play_date: bool = True,
        commit: bool = True,
    ) -> Dict[str, Any]:
        """스트릭 일수 직접 설정 (관리자용).

        Args:
            user_id: 유저 ID
            streak_days: 설정할 스트릭 일수
            adjust_last_play_date: last_play_date도 자동 조정할지 여부
            commit: 커밋 여부

        Returns:
            dict: 설정 결과
        """
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()

        if not user:
            return {"success": False, "message": "USER_NOT_FOUND"}

        old_streak = int(user.play_streak or 0)
        user.play_streak = streak_days

        if adjust_last_play_date:
            # streak_days가 0이면 last_play_date도 None으로
            if streak_days == 0:
                user.last_play_date = None
            else:
                # streak_days에 맞게 last_play_date 조정 (오늘 기준)
                today = self._operational_play_date(self._now_tz())
                user.last_play_date = today

        if commit:
            self.db.commit()

        logger.info(
            f"[STREAK] Set count: user_id={user_id}, "
            f"old={old_streak}, new={streak_days}"
        )

        return {
            "success": True,
            "user_id": user_id,
            "old_streak": old_streak,
            "new_streak": streak_days,
            "last_play_date": user.last_play_date.isoformat() if user.last_play_date else None,
        }

    def force_grant_milestone(
        self,
        user_id: int,
        milestone_day: int,
        *,
        reason: str = "admin_grant",
        commit: bool = True,
    ) -> Dict[str, Any]:
        """마일스톤 보상 강제 지급 (관리자용).

        Args:
            user_id: 유저 ID
            milestone_day: 지급할 마일스톤 일수 (3, 7, 14...)
            reason: 지급 사유
            commit: 커밋 여부

        Returns:
            dict: 지급 결과
        """
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()

        if not user:
            return {"success": False, "message": "USER_NOT_FOUND", "grants": []}

        # 해당 마일스톤 규칙 찾기
        rules = self._get_streak_reward_rules()
        rule = next((r for r in rules if r["day"] == milestone_day), None)

        if not rule:
            return {
                "success": False,
                "message": f"MILESTONE_RULE_NOT_FOUND: {milestone_day}",
                "grants": [],
            }

        # 이벤트 로그용 날짜 (오늘 기준)
        today = self._operational_play_date(self._now_tz())
        event_name = f"streak.reward_grant.{milestone_day}.{today.isoformat()}"

        # 이미 지급되었는지 확인
        exists = self.db.execute(
            select(UserEventLog).where(
                UserEventLog.user_id == user_id,
                UserEventLog.event_name == event_name
            )
        ).first()

        if exists:
            return {
                "success": False,
                "message": "ALREADY_GRANTED",
                "grants": [],
            }

        # 보상 지급
        grants = rule.get("grants", [])
        results = []
        reward_service = V2RewardService()

        meta = {
            "reason": reason,
            "milestone_day": milestone_day,
            "force_grant": True,
            "grant_date": today.isoformat(),
        }

        for g in grants:
            kind = g.get("kind")
            amount = int(g.get("amount", 0))

            if kind == "WALLET":
                tt = g.get("token_type")
                reward_service.deliver(
                    self.db,
                    user_id=user_id,
                    reward_type=tt,
                    reward_amount=amount,
                    meta=meta,
                    commit=False
                )
                results.append({"type": tt, "amount": amount})

            elif kind == "INVENTORY":
                it = g.get("item_type")
                reward_service.deliver(
                    self.db,
                    user_id=user_id,
                    reward_type=it,
                    reward_amount=amount,
                    meta=meta,
                    commit=False
                )
                results.append({"type": it, "amount": amount})

        # 완료 로그 기록
        self.db.add(UserEventLog(
            user_id=user_id,
            feature_type="STREAK",
            event_name=event_name,
            meta_json={**meta, "grants": results}
        ))

        if commit:
            self.db.commit()

        logger.info(
            f"[STREAK] Force grant milestone: user_id={user_id}, "
            f"day={milestone_day}, grants={len(results)}"
        )

        return {
            "success": True,
            "user_id": user_id,
            "milestone_day": milestone_day,
            "grants": results,
        }

    def get_milestone_progress(self, user_id: int) -> List[Dict[str, Any]]:
        """유저의 마일스톤 진행 현황 조회.

        Args:
            user_id: 유저 ID

        Returns:
            list: 각 마일스톤별 달성/클레임 여부
        """
        user = self.db.execute(
            select(User).where(User.id == user_id)
        ).scalar_one_or_none()

        if not user:
            return []

        streak_days = int(user.play_streak or 0)
        rules = self._get_streak_reward_rules()
        results = []

        for rule in sorted(rules, key=lambda x: x["day"]):
            m_day = rule["day"]
            achieved = streak_days >= m_day

            # 클레임 여부 확인 (최근 7일 내 이벤트 로그 검색)
            claimed = False
            claim_date = None

            if achieved and user.last_play_date:
                # 해당 마일스톤 달성 날짜 추정
                hit_date = user.last_play_date - timedelta(days=(streak_days - m_day))
                event_name = f"streak.reward_grant.{m_day}.{hit_date.isoformat()}"

                event = self.db.execute(
                    select(UserEventLog).where(
                        UserEventLog.user_id == user_id,
                        UserEventLog.event_name == event_name
                    )
                ).scalar_one_or_none()

                if event:
                    claimed = True
                    claim_date = event.created_at.isoformat() if event.created_at else None

            results.append({
                "day": m_day,
                "achieved": achieved,
                "claimed": claimed,
                "claim_date": claim_date,
                "rewards": rule.get("grants", []),
            })

        return results
