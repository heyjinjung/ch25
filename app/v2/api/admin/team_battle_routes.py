"""V2 Admin Team Battle Routes.

어드민 전용 팀배틀 관리 API:
- /seasons: 시즌 CRUD
- /teams: 팀 관리
- /scores: 점수 조정
- /members: 멤버 강제 관리
"""

from datetime import datetime
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_db
from app.v2.services.team_battle_admin_service import TeamBattleAdminService

router = APIRouter()
logger = logging.getLogger("uvicorn.error")

# Service instance
_service = TeamBattleAdminService()


# -------------------------------------------------------------------------
# Request/Response Schemas
# -------------------------------------------------------------------------

class SeasonCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    starts_at: datetime
    ends_at: datetime
    rewards_schema: dict | None = None
    is_active: bool = False


class SeasonUpdateRequest(BaseModel):
    name: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    rewards_schema: dict | None = None
    is_active: bool | None = None


class SeasonEndRequest(BaseModel):
    distribute_rewards: bool = False


class TeamCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: str | None = None


class TeamUpdateRequest(BaseModel):
    name: str | None = None
    icon: str | None = None
    is_active: bool | None = None


class ScoreAdjustRequest(BaseModel):
    team_id: int
    season_id: int
    delta: int = Field(..., description="점수 변경량 (양수/음수)")
    reason: str = Field(..., min_length=1, description="조정 사유")


class MemberForceJoinRequest(BaseModel):
    user_id: int
    team_id: int
    reason: str = "Admin forced join"


class MemberForceLeaveRequest(BaseModel):
    user_id: int
    reason: str = "Admin forced leave"


class SeasonDto(BaseModel):
    id: int
    name: str
    starts_at: datetime | None
    ends_at: datetime | None
    is_active: bool
    rewards_schema: dict | None = None
    created_at: datetime | None
    updated_at: datetime | None
    
    class Config:
        from_attributes = True


class TeamDto(BaseModel):
    id: int
    name: str
    icon: str | None
    is_active: bool
    created_at: datetime | None
    updated_at: datetime | None
    
    class Config:
        from_attributes = True


class TeamDetailDto(BaseModel):
    id: int
    name: str
    icon: str | None
    is_active: bool
    created_at: str | None
    members: List[dict]
    member_count: int


class TeamScoreDto(BaseModel):
    team_id: int
    season_id: int
    points: int
    updated_at: datetime | None
    
    class Config:
        from_attributes = True


class SeasonStatsDto(BaseModel):
    season_id: int
    season_name: str
    is_active: bool
    starts_at: str | None
    ends_at: str | None
    team_count: int
    user_count: int
    total_points: int
    event_count: int


# -------------------------------------------------------------------------
# Season Endpoints
# -------------------------------------------------------------------------

@router.get("/seasons", response_model=List[SeasonDto])
def list_seasons(
    include_inactive: bool = Query(True, description="비활성 시즌 포함 여부"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """시즌 목록 조회."""
    seasons = _service.list_seasons(
        db,
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return [SeasonDto.model_validate(s) for s in seasons]


@router.get("/seasons/{season_id}", response_model=SeasonDto)
def get_season(
    season_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """시즌 상세 조회."""
    season = _service.get_season(db, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="SEASON_NOT_FOUND")
    return SeasonDto.model_validate(season)


@router.post("/seasons", response_model=SeasonDto)
def create_season(
    req: SeasonCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """새 시즌 생성."""
    admin_id, _ = admin_info
    try:
        season = _service.create_season(
            db,
            name=req.name,
            starts_at=req.starts_at,
            ends_at=req.ends_at,
            rewards_schema=req.rewards_schema,
            is_active=req.is_active,
            admin_id=admin_id,
        )
        return SeasonDto.model_validate(season)
    except Exception as e:
        logger.error(f"Failed to create season: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/seasons/{season_id}", response_model=SeasonDto)
def update_season(
    season_id: int,
    req: SeasonUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """시즌 정보 수정."""
    admin_id, _ = admin_info
    try:
        season = _service.update_season(
            db,
            season_id=season_id,
            name=req.name,
            starts_at=req.starts_at,
            ends_at=req.ends_at,
            rewards_schema=req.rewards_schema,
            is_active=req.is_active,
            admin_id=admin_id,
        )
        return SeasonDto.model_validate(season)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update season: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/seasons/{season_id}/end")
def end_season(
    season_id: int,
    req: SeasonEndRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """시즌 종료 처리."""
    admin_id, _ = admin_info
    try:
        result = _service.end_season(
            db,
            season_id=season_id,
            admin_id=admin_id,
            distribute_rewards=req.distribute_rewards,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to end season: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/seasons/{season_id}/stats", response_model=SeasonStatsDto)
def get_season_stats(
    season_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """시즌 통계 요약."""
    try:
        stats = _service.get_season_stats(db, season_id)
        return SeasonStatsDto(**stats)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# -------------------------------------------------------------------------
# Team Endpoints
# -------------------------------------------------------------------------

@router.get("/teams", response_model=List[TeamDto])
def list_teams(
    include_inactive: bool = Query(True, description="비활성 팀 포함 여부"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """팀 목록 조회."""
    teams = _service.list_teams(
        db,
        include_inactive=include_inactive,
        limit=limit,
        offset=offset,
    )
    return [TeamDto.model_validate(t) for t in teams]


@router.get("/teams/{team_id}", response_model=TeamDetailDto)
def get_team_detail(
    team_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """팀 상세 정보 (멤버 포함)."""
    detail = _service.get_team_detail(db, team_id)
    if not detail:
        raise HTTPException(status_code=404, detail="TEAM_NOT_FOUND")
    return TeamDetailDto(**detail)


@router.post("/teams", response_model=TeamDto)
def create_team(
    req: TeamCreateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """새 팀 생성."""
    admin_id, _ = admin_info
    try:
        team = _service.create_team(
            db,
            name=req.name,
            icon=req.icon,
            admin_id=admin_id,
        )
        return TeamDto.model_validate(team)
    except Exception as e:
        logger.error(f"Failed to create team: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/teams/{team_id}", response_model=TeamDto)
def update_team(
    team_id: int,
    req: TeamUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """팀 정보 수정."""
    admin_id, _ = admin_info
    try:
        team = _service.update_team(
            db,
            team_id=team_id,
            name=req.name,
            icon=req.icon,
            is_active=req.is_active,
            admin_id=admin_id,
        )
        return TeamDto.model_validate(team)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update team: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------------------
# Score Endpoints
# -------------------------------------------------------------------------

@router.post("/scores/adjust", response_model=TeamScoreDto)
def adjust_team_score(
    req: ScoreAdjustRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """팀 점수 조정 (관리자 수동)."""
    admin_id, _ = admin_info
    try:
        score = _service.adjust_team_score(
            db,
            team_id=req.team_id,
            season_id=req.season_id,
            delta=req.delta,
            reason=req.reason,
            admin_id=admin_id,
        )
        return TeamScoreDto.model_validate(score)
    except Exception as e:
        logger.error(f"Failed to adjust score: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------------------
# Member Endpoints
# -------------------------------------------------------------------------

@router.post("/members/force-join")
def force_join_team(
    req: MemberForceJoinRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """강제 팀 가입 (선택 기간 무시)."""
    admin_id, _ = admin_info
    try:
        member = _service.force_join_team(
            db,
            user_id=req.user_id,
            team_id=req.team_id,
            admin_id=admin_id,
            reason=req.reason,
        )
        return {
            "success": True,
            "user_id": member.user_id,
            "team_id": member.team_id,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None,
        }
    except Exception as e:
        logger.error(f"Failed to force join: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/members/force-leave")
def force_leave_team(
    req: MemberForceLeaveRequest,
    db: Session = Depends(get_db),
    admin_info: tuple = Depends(get_current_admin_info),
):
    """강제 팀 탈퇴."""
    admin_id, _ = admin_info
    success = _service.force_leave_team(
        db,
        user_id=req.user_id,
        admin_id=admin_id,
        reason=req.reason,
    )
    if not success:
        raise HTTPException(status_code=404, detail="USER_NOT_IN_TEAM")
    return {"success": True, "user_id": req.user_id}
