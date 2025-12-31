from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.mission import Mission
from app.schemas.mission import MissionCreate, MissionUpdate, MissionSchema

# /workspace/ch25/app/api/routes/admin_mission.py
router = APIRouter(prefix="/api/admin-mission", tags=["admin-mission"])

@router.post("/", response_model=MissionSchema)
def create_mission(
    payload: MissionCreate,
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> Any:
    """Create a new mission."""
    # Check if logic_key exists?
    existing = db.query(Mission).filter(Mission.logic_key == payload.logic_key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Logic key already exists")
        
    mission = Mission(**payload.dict())
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

@router.get("/", response_model=List[MissionSchema])
def list_missions(
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> Any:
    """List all missions (including inactive)."""
    return db.query(Mission).all()

@router.put("/{mission_id}", response_model=MissionSchema)
def update_mission(
    mission_id: int,
    payload: MissionUpdate,
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> Any:
    """Update a mission."""
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    update_data = payload.dict(exclude_unset=True)
    if "logic_key" in update_data:
        # Check uniqueness if changing
        if update_data["logic_key"] != mission.logic_key:
             existing = db.query(Mission).filter(Mission.logic_key == update_data["logic_key"]).first()
             if existing:
                 raise HTTPException(status_code=400, detail="Logic key already taken")

    for field, value in update_data.items():
        setattr(mission, field, value)
        
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return mission

@router.delete("/{mission_id}")
def delete_mission(
    mission_id: int,
    db: Session = Depends(deps.get_db),
    admin_id: int = Depends(deps.get_current_admin_id),
) -> Any:
    """Soft delete a mission (set active=False)."""
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Mission not found")
        
    mission.is_active = False
    db.add(mission)
    db.commit()
    return {"success": True, "message": "Mission deactivated"}
