# /workspace/ch25/app/api/admin/routes/admin_dice.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_dice import AdminDiceConfigCreate, AdminDiceConfigResponse, AdminDiceConfigUpdate
from app.services.admin_dice_service import AdminDiceService

router = APIRouter(prefix="/admin/api/dice-config", tags=["admin-dice"])


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
