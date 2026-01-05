# /workspace/ch25/app/api/admin/routes/admin_dice.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db

from app.schemas.admin_dice import AdminDiceConfigCreate, AdminDiceConfigResponse, AdminDiceConfigUpdate, DiceEventParams
from app.services.admin_dice_service import AdminDiceService
from app.api.deps import get_db, get_current_admin_id

router = APIRouter(prefix="/admin/api/dice-config", tags=["admin-dice"])


@router.get("/event-params", response_model=DiceEventParams)
def get_event_params(db: Session = Depends(get_db)):
    return AdminDiceService.get_event_params(db)

@router.put("/event-params", response_model=DiceEventParams)
def update_event_params(
    params: DiceEventParams, 
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id)
):
    return AdminDiceService.update_event_params(db, params, admin_id)


@router.get("/", response_model=list[AdminDiceConfigResponse])
def list_configs(db: Session = Depends(get_db)):
    configs = AdminDiceService.list_configs(db)
    return [AdminDiceConfigResponse.from_orm(config) for config in configs]


@router.get("/{config_id}", response_model=AdminDiceConfigResponse)
def get_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminDiceService.get_config(db, config_id)
    return AdminDiceConfigResponse.from_orm(config)


@router.post("/", response_model=AdminDiceConfigResponse, status_code=201)
def create_config(payload: AdminDiceConfigCreate, db: Session = Depends(get_db)):
    config = AdminDiceService.create_config(db, payload)
    return AdminDiceConfigResponse.from_orm(config)


@router.put("/{config_id}", response_model=AdminDiceConfigResponse)
def update_config(config_id: int, payload: AdminDiceConfigUpdate, db: Session = Depends(get_db)):
    config = AdminDiceService.update_config(db, config_id, payload)
    return AdminDiceConfigResponse.from_orm(config)


@router.post("/{config_id}/activate", response_model=AdminDiceConfigResponse)
def activate_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminDiceService.toggle_active(db, config_id, True)
    return AdminDiceConfigResponse.from_orm(config)


@router.post("/{config_id}/deactivate", response_model=AdminDiceConfigResponse)
def deactivate_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminDiceService.toggle_active(db, config_id, False)
    return AdminDiceConfigResponse.from_orm(config)
