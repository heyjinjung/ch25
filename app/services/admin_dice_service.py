# /workspace/ch25/app/services/admin_dice_service.py
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.dice import DiceConfig
from app.schemas.admin_dice import AdminDiceConfigCreate, AdminDiceConfigUpdate


class AdminDiceService:
    """Admin CRUD operations for dice configurations."""

    @staticmethod
    def list_configs(db: Session):
        return db.query(DiceConfig).all()

    @staticmethod
    def get_config(db: Session, config_id: int) -> DiceConfig:
        config = db.get(DiceConfig, config_id)
        if not config:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DICE_CONFIG_NOT_FOUND")
        return config

    @staticmethod
    def _validate_limits(max_daily_plays: int):
        if max_daily_plays < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="INVALID_MAX_DAILY_PLAYS")

    @staticmethod
    def create_config(db: Session, data: AdminDiceConfigCreate) -> DiceConfig:
        AdminDiceService._validate_limits(data.max_daily_plays)
        config = DiceConfig(
            name=data.name,
            is_active=data.is_active,
            max_daily_plays=data.max_daily_plays,
            win_reward_type=data.win_reward_type,
            win_reward_amount=data.win_reward_value,
            draw_reward_type=data.draw_reward_type,
            draw_reward_amount=data.draw_reward_value,
            lose_reward_type=data.lose_reward_type,
            lose_reward_amount=data.lose_reward_value,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def update_config(db: Session, config_id: int, data: AdminDiceConfigUpdate) -> DiceConfig:
        config = AdminDiceService.get_config(db, config_id)
        update_data = data.dict(exclude_unset=True)
        if "max_daily_plays" in update_data:
            AdminDiceService._validate_limits(update_data["max_daily_plays"])
        for field, value in update_data.items():
            if field == "win_reward_value":
                config.win_reward_amount = value
            elif field == "draw_reward_value":
                config.draw_reward_amount = value
            elif field == "lose_reward_value":
                config.lose_reward_amount = value
            else:
                setattr(config, field, value)
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def toggle_active(db: Session, config_id: int, active: bool) -> DiceConfig:
        config = AdminDiceService.get_config(db, config_id)
        config.is_active = active
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def get_event_params(db: Session):
        from app.services.vault2_service import Vault2Service, DEFAULT_CONFIG
        vault_service = Vault2Service()
        
        game_earn_config_val = vault_service.get_config_value(db, "game_earn_config", {})
        dice_rewards = game_earn_config_val.get("DICE", {})
        
        probs = vault_service.get_config_value(db, "probability", {}).get("DICE", {})
        caps = vault_service.get_config_value(db, "caps", {}).get("DICE", {})
        eligibility = vault_service.get_config_value(db, "eligibility", {})
        
        # Determine active state: must have both config and probability set
        is_active = bool(dice_rewards and probs)
        
        from app.schemas.admin_dice import DiceEventParams
        
        # Fallback to DEFAULT_CONFIG instead of hardcoded strings
        def_dice_prob = DEFAULT_CONFIG["probability"]["DICE"]
        def_dice_rewards = DEFAULT_CONFIG["game_earn_config"]["DICE"]
        def_dice_caps = DEFAULT_CONFIG["caps"]["DICE"]

        return DiceEventParams(
            is_active=is_active,
            probability={"DICE": probs} if probs else {"DICE": def_dice_prob},
            game_earn_config={"DICE": dice_rewards} if dice_rewards else {"DICE": def_dice_rewards},
            caps={"DICE": caps} if caps else {"DICE": def_dice_caps},
            eligibility=eligibility or (DEFAULT_CONFIG["eligibility"] if "eligibility" in DEFAULT_CONFIG else {"tags": {"blocklist": ["Blacklist"]}})
        )

    @staticmethod
    def update_event_params(db: Session, params: "DiceEventParams", admin_id: int = 0):
        from app.services.vault2_service import Vault2Service, DEFAULT_CONFIG
        vault_service = Vault2Service()
        program = vault_service.get_default_program(db, ensure=True)
        
        # Read-Modify-Write
        # Note: We use Vault2Service logic which handles default config merging
        cfg = DEFAULT_CONFIG.copy()
        if isinstance(program.config_json, dict):
            cfg.update(program.config_json)
        
        # Update Keys
        if "game_earn_config" not in cfg: cfg["game_earn_config"] = {}
        if "probability" not in cfg: cfg["probability"] = {}
        if "caps" not in cfg: cfg["caps"] = {}
        
        if params.is_active:
             # Add or update DICE configs
             if params.game_earn_config and "DICE" in params.game_earn_config:
                 cfg["game_earn_config"]["DICE"] = params.game_earn_config["DICE"]
             if params.probability and "DICE" in params.probability:
                 cfg["probability"]["DICE"] = params.probability["DICE"]
        else:
             # Deactivate by removing DICE configs
             cfg["game_earn_config"].pop("DICE", None)
             cfg["probability"].pop("DICE", None)

        if params.caps and "DICE" in params.caps:
            cfg["caps"]["DICE"] = params.caps["DICE"]
        
        if params.eligibility is not None:
            cfg["eligibility"] = params.eligibility
        
        # Save
        program.config_json = cfg
        
        from app.models.admin_audit_log import AdminAuditLog
        from app.services.audit_service import AuditService
        AuditService.record_admin_audit(
            db, 
            admin_id=admin_id, 
            action="UPDATE_DICE_EVENT_PARAMS", 
            target_type="VaultProgram", 
            target_id=program.key,
            after={"config_json": cfg}
        )
        
        db.add(program)
        db.commit()
        db.refresh(program)
        return params
