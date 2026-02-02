"""Prospect Linking Service - Admin 수동 매칭 + 유저 자체 연동 지원."""
from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Optional
from difflib import SequenceMatcher

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.v2.models.user import V2User
from app.v2.models.hq_prospective_user import HQProspectiveUser
from app.v2.models import V2UserSegment

logger = logging.getLogger(__name__)


class ProspectLinkingService:
    """
    잠재 유저(HQProspectiveUser)와 실제 유저(V2User) 연결 서비스.
    
    기능:
    1. Admin 수동 매칭 - 퍼지 매칭 추천 포함
    2. 유저 자체 연동 (Self-Linking)
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== 유사도 계산 ====================
    
    @staticmethod
    def normalize_nickname(nickname: str) -> str:
        """닉네임 정규화 (소문자, 숫자/특수문자 제거)."""
        if not nickname:
            return ""
        # 소문자 변환
        normalized = nickname.lower()
        # 숫자와 특수문자 제거 (한글/영문만 남김)
        normalized = re.sub(r'[^a-z가-힣]', '', normalized)
        return normalized
    
    @staticmethod
    def calculate_similarity(str1: str, str2: str) -> float:
        """
        두 문자열의 유사도 계산 (0.0 ~ 1.0).
        SequenceMatcher 사용 (difflib).
        """
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1, str2).ratio()
    
    def find_similar_users(
        self, 
        prospect_nickname: str, 
        min_similarity: float = 0.6,
        limit: int = 5
    ) -> list[dict]:
        """
        잠재 유저 닉네임과 유사한 V2User 목록 반환.
        
        Args:
            prospect_nickname: 잠재 유저 닉네임
            min_similarity: 최소 유사도 (0.0 ~ 1.0)
            limit: 최대 반환 개수
            
        Returns:
            [{"user_id": int, "nickname": str, "similarity": float}, ...]
        """
        normalized_prospect = self.normalize_nickname(prospect_nickname)
        
        # 모든 V2User 조회 (닉네임 있는 유저만)
        users = self.db.query(V2User).filter(
            V2User.nickname.isnot(None),
            V2User.external_nickname.is_(None)  # 아직 연동 안된 유저
        ).all()
        
        candidates = []
        for user in users:
            normalized_user = self.normalize_nickname(user.nickname or "")
            
            # 1. 정규화된 닉네임 비교
            sim1 = self.calculate_similarity(normalized_prospect, normalized_user)
            
            # 2. 원본 닉네임 직접 비교 (대소문자 무시)
            sim2 = self.calculate_similarity(
                prospect_nickname.lower(), 
                (user.nickname or "").lower()
            )
            
            # 더 높은 유사도 사용
            similarity = max(sim1, sim2)
            
            if similarity >= min_similarity:
                candidates.append({
                    "user_id": user.id,
                    "nickname": user.nickname,
                    "telegram_username": user.telegram_username,
                    "similarity": round(similarity * 100, 1),  # 퍼센트로 변환
                })
        
        # 유사도 내림차순 정렬
        candidates.sort(key=lambda x: -x["similarity"])
        return candidates[:limit]
    
    # ==================== 잠재 유저 목록 조회 ====================
    
    def get_unlinked_prospects(
        self,
        segment_filter: Optional[str] = None,
        include_ignored: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> dict:
        """
        연결되지 않은 잠재 유저 목록 + 유사 V2User 추천.
        
        Returns:
            {
                "total": int,
                "prospects": [
                    {
                        "id": int,
                        "nickname": str,
                        "segment": str,
                        "total_margin": int,
                        "total_charge": int,
                        "suggestions": [{"user_id": int, "nickname": str, "similarity": float}]
                    }
                ]
            }
        """
        query = self.db.query(HQProspectiveUser).filter(
            HQProspectiveUser.is_joined == False,
            HQProspectiveUser.linked_user_id.is_(None)
        )
        
        if not include_ignored:
            query = query.filter(
                or_(HQProspectiveUser.ignored == False, HQProspectiveUser.ignored.is_(None))
            )
        
        if segment_filter:
            query = query.filter(HQProspectiveUser.segment == segment_filter)
        
        total = query.count()
        prospects = query.order_by(
            HQProspectiveUser.total_margin.desc()
        ).offset(offset).limit(limit).all()
        
        result = []
        for p in prospects:
            suggestions = self.find_similar_users(p.nickname, min_similarity=0.5, limit=3)
            result.append({
                "id": p.id,
                "nickname": p.nickname,
                "cc_id": p.cc_id,
                "segment": p.segment,
                "total_margin": p.total_margin,
                "total_charge": p.total_charge,
                "inactive_days": p.inactive_days,
                "ignored": p.ignored or False,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "suggestions": suggestions,
            })
        
        return {
            "total": total,
            "prospects": result
        }
    
    # ==================== Admin 수동 연결 ====================
    
    def admin_link_prospect(
        self,
        prospect_id: int,
        user_id: int,
        admin_id: int
    ) -> dict:
        """
        Admin이 잠재 유저를 V2User와 수동 연결.
        
        Returns:
            {"success": bool, "message": str, "prospect": dict, "user": dict}
        """
        prospect = self.db.query(HQProspectiveUser).filter_by(id=prospect_id).first()
        if not prospect:
            return {"success": False, "message": "잠재 유저를 찾을 수 없습니다."}
        
        if prospect.is_joined or prospect.linked_user_id:
            return {"success": False, "message": "이미 연결된 잠재 유저입니다."}
        
        user = self.db.query(V2User).filter_by(id=user_id).first()
        if not user:
            return {"success": False, "message": "V2 유저를 찾을 수 없습니다."}
        
        if user.external_nickname:
            return {"success": False, "message": f"해당 유저는 이미 '{user.external_nickname}'과 연동되어 있습니다."}
        
        now = datetime.utcnow()
        
        # HQProspectiveUser 업데이트
        prospect.is_joined = True
        prospect.linked_user_id = user_id
        prospect.linked_at = now
        
        # V2User 업데이트
        user.external_nickname = prospect.nickname
        user.external_linked_at = now
        user.hq_segment = prospect.segment
        
        # V2UserSegment도 업데이트 (존재하면)
        segment = self.db.query(V2UserSegment).filter_by(user_id=user_id).first()
        if segment:
            segment.segment = prospect.segment
            segment.is_synced_from_hq = True
            segment.last_synced_at = now
        else:
            # 새로 생성
            new_segment = V2UserSegment(
                user_id=user_id,
                segment=prospect.segment,
                is_synced_from_hq=True,
                last_synced_at=now
            )
            self.db.add(new_segment)
        
        self.db.commit()
        
        logger.info(f"[ProspectLink] Admin {admin_id} linked prospect {prospect_id} ({prospect.nickname}) to user {user_id}")
        
        return {
            "success": True,
            "message": f"'{prospect.nickname}'이(가) 유저 #{user_id}와 연결되었습니다. 세그먼트: {prospect.segment}",
            "prospect": {
                "id": prospect.id,
                "nickname": prospect.nickname,
                "segment": prospect.segment
            },
            "user": {
                "id": user.id,
                "nickname": user.nickname,
                "external_nickname": user.external_nickname,
                "hq_segment": user.hq_segment
            }
        }
    
    # ==================== Admin 무시 처리 ====================
    
    def admin_ignore_prospect(
        self,
        prospect_id: int,
        admin_id: int,
        reason: Optional[str] = None
    ) -> dict:
        """
        Admin이 잠재 유저를 무시 처리.
        """
        prospect = self.db.query(HQProspectiveUser).filter_by(id=prospect_id).first()
        if not prospect:
            return {"success": False, "message": "잠재 유저를 찾을 수 없습니다."}
        
        prospect.ignored = True
        prospect.ignored_at = datetime.utcnow()
        prospect.ignored_reason = reason or f"Admin {admin_id}에 의해 무시됨"
        
        self.db.commit()
        
        logger.info(f"[ProspectLink] Admin {admin_id} ignored prospect {prospect_id} ({prospect.nickname})")
        
        return {
            "success": True,
            "message": f"'{prospect.nickname}'이(가) 무시 처리되었습니다."
        }
    
    # ==================== 유저 자체 연동 (Self-Linking) ====================
    
    def user_self_link(
        self,
        user_id: int,
        external_nickname: str
    ) -> dict:
        """
        유저가 직접 외부 닉네임을 입력하여 연동.
        
        Returns:
            {"success": bool, "message": str, "segment": str | None}
        """
        user = self.db.query(V2User).filter_by(id=user_id).first()
        if not user:
            return {"success": False, "message": "유저를 찾을 수 없습니다."}
        
        if user.external_nickname:
            return {
                "success": False, 
                "message": f"이미 '{user.external_nickname}'으로 연동되어 있습니다."
            }
        
        # HQProspectiveUser에서 닉네임으로 검색 (정확 일치)
        prospect = self.db.query(HQProspectiveUser).filter(
            func.lower(HQProspectiveUser.nickname) == external_nickname.lower(),
            HQProspectiveUser.is_joined == False,
            HQProspectiveUser.linked_user_id.is_(None)
        ).first()
        
        if not prospect:
            # 유사 매칭 시도 (90% 이상)
            all_prospects = self.db.query(HQProspectiveUser).filter(
                HQProspectiveUser.is_joined == False,
                HQProspectiveUser.linked_user_id.is_(None)
            ).all()
            
            for p in all_prospects:
                sim = self.calculate_similarity(
                    external_nickname.lower(), 
                    p.nickname.lower()
                )
                if sim >= 0.9:
                    prospect = p
                    break
        
        now = datetime.utcnow()
        
        if prospect:
            # 매칭 성공!
            prospect.is_joined = True
            prospect.linked_user_id = user_id
            prospect.linked_at = now
            
            user.external_nickname = prospect.nickname
            user.external_linked_at = now
            user.hq_segment = prospect.segment
            
            # V2UserSegment 업데이트
            segment = self.db.query(V2UserSegment).filter_by(user_id=user_id).first()
            if segment:
                segment.segment = prospect.segment
                segment.is_synced_from_hq = True
                segment.last_synced_at = now
            else:
                new_segment = V2UserSegment(
                    user_id=user_id,
                    segment=prospect.segment,
                    is_synced_from_hq=True,
                    last_synced_at=now
                )
                self.db.add(new_segment)
            
            self.db.commit()
            
            logger.info(f"[SelfLink] User {user_id} linked to prospect {prospect.id} ({prospect.nickname}), segment: {prospect.segment}")
            
            # 세그먼트별 메시지
            segment_benefits = {
                "VIP": "🎉 VIP 회원으로 등록되었습니다! 일일 보너스 2배, 전용 이벤트 참여 자격이 부여됩니다.",
                "WHALE": "🐋 WHALE(큰손) 회원으로 등록되었습니다! 최고 등급 혜택이 적용됩니다.",
                "AT_RISK": "계정이 연동되었습니다. 특별 복귀 보너스를 확인해보세요!",
            }
            
            return {
                "success": True,
                "message": segment_benefits.get(prospect.segment, "계정이 성공적으로 연동되었습니다!"),
                "segment": prospect.segment,
                "total_margin": prospect.total_margin,
                "total_charge": prospect.total_charge
            }
        else:
            # 매칭 실패 - 그래도 외부 닉네임 기록 (추후 매칭용)
            user.external_nickname = external_nickname
            user.external_linked_at = now
            self.db.commit()
            
            logger.info(f"[SelfLink] User {user_id} registered external nickname '{external_nickname}' but no prospect match")
            
            return {
                "success": True,
                "message": "계정 연동 정보가 등록되었습니다. 본사 데이터 동기화 후 혜택이 적용됩니다.",
                "segment": None,
                "pending": True
            }
    
    # ==================== 통계 ====================
    
    def get_linking_stats(self) -> dict:
        """연동 현황 통계."""
        total_prospects = self.db.query(HQProspectiveUser).count()
        linked_count = self.db.query(HQProspectiveUser).filter(
            HQProspectiveUser.is_joined == True
        ).count()
        ignored_count = self.db.query(HQProspectiveUser).filter(
            HQProspectiveUser.ignored == True
        ).count()
        pending_count = self.db.query(HQProspectiveUser).filter(
            HQProspectiveUser.is_joined == False,
            or_(HQProspectiveUser.ignored == False, HQProspectiveUser.ignored.is_(None))
        ).count()
        
        # 세그먼트별 통계
        segment_stats = self.db.query(
            HQProspectiveUser.segment,
            func.count(HQProspectiveUser.id),
            func.sum(func.cast(HQProspectiveUser.is_joined, sa.Integer))
        ).group_by(HQProspectiveUser.segment).all()
        
        by_segment = {}
        for seg, total, linked in segment_stats:
            by_segment[seg] = {
                "total": total,
                "linked": linked or 0,
                "pending": total - (linked or 0)
            }
        
        return {
            "total_prospects": total_prospects,
            "linked": linked_count,
            "ignored": ignored_count,
            "pending": pending_count,
            "link_rate": round(linked_count / total_prospects * 100, 1) if total_prospects > 0 else 0,
            "by_segment": by_segment
        }


# SQLAlchemy import for stats query
import sqlalchemy as sa
