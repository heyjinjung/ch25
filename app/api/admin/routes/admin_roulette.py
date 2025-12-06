# /workspace/ch25/app/api/admin/routes/admin_roulette.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_roulette import AdminRouletteConfigCreate, AdminRouletteConfigResponse, AdminRouletteConfigUpdate
from app.services.admin_roulette_service import AdminRouletteService

router = APIRouter(prefix="/admin/api/roulette-config", tags=["admin-roulette"])


@router.get("/", response_model=list[AdminRouletteConfigResponse])
def list_configs(db: Session = Depends(get_db)):
    configs = AdminRouletteService.list_configs(db)
    return [AdminRouletteConfigResponse.from_orm(config) for config in configs]


@router.get("/{config_id}", response_model=AdminRouletteConfigResponse)
def get_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminRouletteService.get_config(db, config_id)
    return AdminRouletteConfigResponse.from_orm(config)


@router.post("/", response_model=AdminRouletteConfigResponse, status_code=201)
def create_config(payload: AdminRouletteConfigCreate, db: Session = Depends(get_db)):
    config = AdminRouletteService.create_config(db, payload)
    return AdminRouletteConfigResponse.from_orm(config)


@router.put("/{config_id}", response_model=AdminRouletteConfigResponse)
def update_config(config_id: int, payload: AdminRouletteConfigUpdate, db: Session = Depends(get_db)):
    config = AdminRouletteService.update_config(db, config_id, payload)
    return AdminRouletteConfigResponse.from_orm(config)


@router.post("/{config_id}/activate", response_model=AdminRouletteConfigResponse)
def activate_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminRouletteService.toggle_active(db, config_id, True)
    return AdminRouletteConfigResponse.from_orm(config)


@router.post("/{config_id}/deactivate", response_model=AdminRouletteConfigResponse)
def deactivate_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminRouletteService.toggle_active(db, config_id, False)
    return AdminRouletteConfigResponse.from_orm(config)
