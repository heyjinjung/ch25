# /workspace/ch25/app/api/admin/routes/admin_lottery.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.admin_lottery import AdminLotteryConfigCreate, AdminLotteryConfigResponse, AdminLotteryConfigUpdate
from app.services.admin_lottery_service import AdminLotteryService

router = APIRouter(prefix="/admin/api/lottery-config", tags=["admin-lottery"])


@router.get("/", response_model=list[AdminLotteryConfigResponse])
def list_configs(db: Session = Depends(get_db)):
    configs = AdminLotteryService.list_configs(db)
    return [AdminLotteryConfigResponse.from_orm(config) for config in configs]


@router.get("/{config_id}", response_model=AdminLotteryConfigResponse)
def get_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminLotteryService.get_config(db, config_id)
    return AdminLotteryConfigResponse.from_orm(config)


@router.post("/", response_model=AdminLotteryConfigResponse, status_code=201)
def create_config(payload: AdminLotteryConfigCreate, db: Session = Depends(get_db)):
    config = AdminLotteryService.create_config(db, payload)
    return AdminLotteryConfigResponse.from_orm(config)


@router.put("/{config_id}", response_model=AdminLotteryConfigResponse)
def update_config(config_id: int, payload: AdminLotteryConfigUpdate, db: Session = Depends(get_db)):
    config = AdminLotteryService.update_config(db, config_id, payload)
    return AdminLotteryConfigResponse.from_orm(config)


@router.post("/{config_id}/activate", response_model=AdminLotteryConfigResponse)
def activate_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminLotteryService.toggle_active(db, config_id, True)
    return AdminLotteryConfigResponse.from_orm(config)


@router.post("/{config_id}/deactivate", response_model=AdminLotteryConfigResponse)
def deactivate_config(config_id: int, db: Session = Depends(get_db)):
    config = AdminLotteryService.toggle_active(db, config_id, False)
    return AdminLotteryConfigResponse.from_orm(config)
