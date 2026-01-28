from datetime import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_info, get_db
from app.v2.models.v2_dice import V2DiceConfig as DiceConfig
from app.v2.models.v2_lottery import V2LotteryConfig as LotteryConfig, V2LotteryPrize as LotteryPrize
from app.v2.models.v2_roulette import V2RouletteConfig as RouletteConfig, V2RouletteSegment as RouletteSegment
from app.models.roulette import RouletteConfig as LegacyRouletteConfig
from app.v2.services import V2AdminAuditService
from app.v2.schemas.v2_admin_game import (
    DiceConfigDto,
    DiceConfigUpdateRequest,
    LotteryConfigDto,
    LotteryConfigUpdateRequest,
    LotteryPrizeDto,
    LotteryPrizeUpdateRequest,
    RouletteConfigDto,
    RouletteConfigFullUpdateRequest,
    RouletteSegmentDto,
)

router = APIRouter()

logger = logging.getLogger(__name__)


def _ensure_v2_roulette_segments(
    db: Session,
    config: RouletteConfig,
    *,
    target_count: int = 8,
) -> bool:
    existing = {seg.slot_index for seg in config.segments}
    added = False
    for slot_index in range(target_count):
        if slot_index in existing:
            continue
        new_seg = RouletteSegment(
            config_id=config.id,
            slot_index=slot_index,
            label=f"빈 슬롯 {slot_index + 1}",
            weight=0,
            reward_type="NONE",
            reward_amount=0,
            is_jackpot=False,
        )
        db.add(new_seg)
        config.segments.append(new_seg)
        added = True
    if added:
        db.commit()
        db.refresh(config)
    return added


def _map_lottery_prize_integrity_error(exc: IntegrityError) -> str:
    raw = str(getattr(exc, "orig", exc))
    if "uq_v2_lottery_prize_label" in raw or "Duplicate entry" in raw:
        return "DUPLICATE_PRIZE_LABEL"
    if "ck_v2_lottery_prize_weight_non_negative" in raw:
        return "INVALID_LOTTERY_WEIGHT"
    if "ck_v2_lottery_prize_stock_non_negative" in raw:
        return "INVALID_LOTTERY_STOCK"
    return "INVALID_LOTTERY_CONFIG"


def _normalize_reward_type_for_dto(value: object) -> str:
    """Normalize reward_type for admin DTO (v2 SoT aligned).

    허용: 공통 지급 20개 + VAULT + NONE.
    POINT/CC_POINT는 UI 호환 값 VAULT로 정규화한다.
    그 외 레거시는 NONE으로 강제 변환한다.
    """

    allowed = {
        "ROULETTE_TICKET",
        "DICE_TICKET",
        "LOTTERY_TICKET",
        "VAULT",
        "GOLD_KEY_TICKET",
        "DIAMOND_TICKET",
        "GOLD_KEY_FRAGMENT",
        "DIAMOND_FRAGMENT",
        "PUZZLE_C1",
        "PUZZLE_C2",
        "PUZZLE_J",
        "PUZZLE_M",
        "DIAMOND",
        "CHICKEN_GIFTICON_5000",
        "CHICKEN_GIFTICON_10000",
        "STARBUCKS_GIFTICON_2000",
        "STARBUCKS_GIFTICON_10000",
        "PIZZA_GIFTICON_5000",
        "PIZZA_GIFTICON_10000",
        "GOOGLE_GIFTICON_5000",
        "GOOGLE_GIFTICON_10000",
        "NONE",
    }
    raw = str(value) if value is not None else ""
    if raw in {"POINT", "CC_POINT"}:
        return "VAULT"
    if raw in allowed:
        return raw
    return "NONE"


def _normalize_reward_type_for_write(value: object) -> str:
    """Normalize incoming reward_type before persisting (v2 SoT aligned)."""

    raw = str(value) if value is not None else ""
    if raw in {"VAULT", "POINT", "CC_POINT"}:
        return "POINT"
    allowed = {
        "ROULETTE_TICKET",
        "DICE_TICKET",
        "LOTTERY_TICKET",
        "GOLD_KEY_TICKET",
        "DIAMOND_TICKET",
        "GOLD_KEY_FRAGMENT",
        "DIAMOND_FRAGMENT",
        "PUZZLE_C1",
        "PUZZLE_C2",
        "PUZZLE_J",
        "PUZZLE_M",
        "DIAMOND",
        "CHICKEN_GIFTICON_5000",
        "CHICKEN_GIFTICON_10000",
        "STARBUCKS_GIFTICON_2000",
        "STARBUCKS_GIFTICON_10000",
        "PIZZA_GIFTICON_5000",
        "PIZZA_GIFTICON_10000",
        "GOOGLE_GIFTICON_5000",
        "GOOGLE_GIFTICON_10000",
        "NONE",
    }
    return raw if raw in allowed else "NONE"


def _normalize_roulette_grade_for_dto(value: object) -> str:
    allowed = {"COMMON", "VIP", "WHALE", "AT_RISK"}
    raw = str(value) if value is not None else ""
    if raw in allowed:
        return raw
    if raw in {"NEW", "NEW_USER", "NEWBIE"}:
        return "COMMON"
    if raw in {"RISK", "ATRISK"}:
        return "AT_RISK"
    return "COMMON"


def _normalize_roulette_ticket_type_for_v2(value: object) -> str:
    raw = str(value or "").strip().upper()
    mapping = {
        "ROULETTE_COIN": "ROULETTE_TICKET",
        "GOLD_KEY": "GOLD_KEY_TICKET",
        "DIAMOND_KEY": "DIAMOND_TICKET",
        "TRIAL_TOKEN": "TRIAL_TICKET",
    }
    normalized = mapping.get(raw, raw)
    allowed = {"ROULETTE_TICKET", "GOLD_KEY_TICKET", "DIAMOND_TICKET", "TRIAL_TICKET"}
    return normalized if normalized in allowed else "ROULETTE_TICKET"


@router.get("/game/roulette/configs", response_model=list[RouletteConfigDto])
def get_roulette_configs(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    # ticket_type별로 가장 높은 ID가 먼저 오도록 정렬
    # 유저 API(id DESC)와 동일한 config를 어드민이 편집하도록 보장
    configs = (
        db.query(RouletteConfig)
        .options(selectinload(RouletteConfig.segments))
        .order_by(RouletteConfig.ticket_type, RouletteConfig.id.desc())
        .all()
    )

    if not configs:
        legacy_configs = (
            db.query(LegacyRouletteConfig)
            .options(selectinload(LegacyRouletteConfig.segments))
            .all()
        )
        existing_keys: set[tuple[str, str]] = set()
        for legacy in legacy_configs:
            v2_grade = _normalize_roulette_grade_for_dto(legacy.grade)
            v2_ticket = _normalize_roulette_ticket_type_for_v2(legacy.ticket_type)
            key = (v2_grade, v2_ticket)
            if key in existing_keys:
                continue
            existing_keys.add(key)
            new_config = RouletteConfig(
                name=legacy.name,
                grade=v2_grade,
                ticket_type=v2_ticket,
                is_active=legacy.is_active,
                max_daily_spins=legacy.max_daily_spins,
            )
            db.add(new_config)
            db.flush()
            segments = [
                RouletteSegment(
                    config_id=new_config.id,
                    slot_index=seg.slot_index,
                    label=seg.label,
                    weight=seg.weight,
                    reward_type=_normalize_reward_type_for_write(seg.reward_type),
                    reward_amount=seg.reward_amount,
                    is_jackpot=seg.is_jackpot,
                )
                for seg in sorted(legacy.segments, key=lambda x: x.slot_index)
            ]
            if segments:
                db.add_all(segments)
        if legacy_configs:
            db.commit()
        configs = (
            db.query(RouletteConfig)
            .options(selectinload(RouletteConfig.segments))
            .order_by(RouletteConfig.ticket_type, RouletteConfig.id.desc())
            .all()
        )

    result = []
    for config in configs:
        _ensure_v2_roulette_segments(db, config)
        try:
            segments_dto = [
                RouletteSegmentDto(
                    id=seg.id,
                    slot_index=seg.slot_index,
                    label=seg.label,
                    weight=seg.weight,
                    reward_type=_normalize_reward_type_for_dto(str(seg.reward_type)),
                    reward_amount=seg.reward_amount,
                    is_jackpot=seg.is_jackpot,
                )
                for seg in sorted(config.segments, key=lambda x: x.slot_index)
            ]

            result.append(
                RouletteConfigDto(
                    id=config.id,
                    name=config.name,
                    grade=_normalize_roulette_grade_for_dto(config.grade),
                    ticket_type=config.ticket_type,
                    max_daily_spins=config.max_daily_spins,
                    is_active=config.is_active,
                    segments=segments_dto,
                    created_at=config.created_at,
                    updated_at=config.updated_at,
                )
            )
        except ValidationError:
            logger.exception(
                "Failed to serialize roulette config",
                extra={"config_id": getattr(config, "id", None)},
            )
            continue

    return result


@router.get("/game/roulette/config/{config_id}", response_model=RouletteConfigDto)
def get_roulette_config(
    config_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    config = (
        db.query(RouletteConfig)
        .options(selectinload(RouletteConfig.segments))
        .filter(RouletteConfig.id == config_id)
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="ROULETTE_CONFIG_NOT_FOUND")

    _ensure_v2_roulette_segments(db, config)

    segments_dto = [
        RouletteSegmentDto(
            id=seg.id,
            slot_index=seg.slot_index,
            label=seg.label,
            weight=seg.weight,
            reward_type=_normalize_reward_type_for_dto(str(seg.reward_type)),
            reward_amount=seg.reward_amount,
            is_jackpot=seg.is_jackpot,
        )
        for seg in sorted(config.segments, key=lambda x: x.slot_index)
    ]

    try:
        return RouletteConfigDto(
            id=config.id,
            name=config.name,
            grade=_normalize_roulette_grade_for_dto(config.grade),
            ticket_type=config.ticket_type,
            max_daily_spins=config.max_daily_spins,
            is_active=config.is_active,
            segments=segments_dto,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )
    except ValidationError:
        logger.exception(
            "Failed to serialize roulette config",
            extra={"config_id": config_id},
        )
        raise HTTPException(status_code=500, detail="ROULETTE_CONFIG_SERIALIZATION_FAILED")


@router.put("/game/roulette/config/{config_id}", response_model=RouletteConfigDto)
def update_roulette_config(
    config_id: int,
    payload: RouletteConfigFullUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = (
        db.query(RouletteConfig)
        .options(selectinload(RouletteConfig.segments))
        .filter(RouletteConfig.id == config_id)
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="ROULETTE_CONFIG_NOT_FOUND")

    before_data = {
        "name": config.name,
        "ticket_type": config.ticket_type,
        "max_daily_spins": config.max_daily_spins,
        "is_active": config.is_active,
    }

    if payload.name is not None:
        config.name = payload.name
    if payload.ticket_type is not None:
        config.ticket_type = payload.ticket_type
    if payload.max_daily_spins is not None:
        config.max_daily_spins = payload.max_daily_spins
    if payload.is_active is not None:
        config.is_active = payload.is_active

    if payload.segments is not None:
        segment_map = {seg.slot_index: seg for seg in config.segments}

        for seg_update in payload.segments:
            if seg_update.slot_index in segment_map:
                seg = segment_map[seg_update.slot_index]
                seg.label = seg_update.label
                seg.weight = seg_update.weight
                seg.reward_type = _normalize_reward_type_for_write(seg_update.reward_type)
                seg.reward_amount = seg_update.reward_amount
                seg.is_jackpot = seg_update.is_jackpot
                seg.updated_at = datetime.utcnow()
            else:
                new_seg = RouletteSegment(
                    config_id=config.id,
                    slot_index=seg_update.slot_index,
                    label=seg_update.label,
                    weight=seg_update.weight,
                    reward_type=_normalize_reward_type_for_write(seg_update.reward_type),
                    reward_amount=seg_update.reward_amount,
                    is_jackpot=seg_update.is_jackpot,
                )
                db.add(new_seg)

    config.updated_at = datetime.utcnow()

    after_data = {
        "name": config.name,
        "ticket_type": config.ticket_type,
        "max_daily_spins": config.max_daily_spins,
        "is_active": config.is_active,
    }
    V2AdminAuditService.log(
        db,
        admin_id,
        "ROULETTE_CONFIG_UPDATE",
        "GAME_CONFIG",
        str(config_id),
        before=before_data,
        after=after_data,
    )

    db.commit()
    db.refresh(config)

    segments_dto = [
        RouletteSegmentDto(
            id=seg.id,
            slot_index=seg.slot_index,
            label=seg.label,
            weight=seg.weight,
            reward_type=_normalize_reward_type_for_dto(seg.reward_type),
            reward_amount=seg.reward_amount,
            is_jackpot=seg.is_jackpot,
        )
        for seg in sorted(config.segments, key=lambda x: x.slot_index)
    ]

    try:
        return RouletteConfigDto(
            id=config.id,
            name=config.name,
            grade=_normalize_roulette_grade_for_dto(config.grade),
            ticket_type=config.ticket_type,
            max_daily_spins=config.max_daily_spins,
            is_active=config.is_active,
            segments=segments_dto,
            created_at=config.created_at,
            updated_at=config.updated_at,
        )
    except ValidationError:
        logger.exception(
            "Failed to serialize roulette config",
            extra={"config_id": config_id},
        )
        raise HTTPException(status_code=500, detail="ROULETTE_CONFIG_SERIALIZATION_FAILED")


@router.get("/game/dice/config", response_model=DiceConfigDto)
def get_dice_config(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    config = db.query(DiceConfig).first()

    if not config:
        raise HTTPException(status_code=404, detail="DICE_CONFIG_NOT_FOUND")

    return DiceConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_plays,
        win_probability=config.win_probability,
        draw_probability=config.draw_probability,
        lose_probability=config.lose_probability,
        win_reward_type=_normalize_reward_type_for_dto(config.win_reward_type),
        win_reward_amount=config.win_reward_amount,
        draw_reward_type=_normalize_reward_type_for_dto(config.draw_reward_type),
        draw_reward_amount=config.draw_reward_amount,
        lose_reward_type=_normalize_reward_type_for_dto(config.lose_reward_type),
        lose_reward_amount=config.lose_reward_amount,
        daily_gain_cap=config.daily_gain_cap,
        enable_golden_hour=config.enable_golden_hour,
        golden_hour_multiplier=config.golden_hour_multiplier,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.put("/game/dice/config/{config_id}", response_model=DiceConfigDto)
def update_dice_config(
    config_id: int,
    payload: DiceConfigUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = db.query(DiceConfig).filter(DiceConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="DICE_CONFIG_NOT_FOUND")

    before_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_plays": config.max_daily_plays,
        "win_probability": config.win_probability,
        "draw_probability": config.draw_probability,
        "lose_probability": config.lose_probability,
        "win_reward": f"{config.win_reward_type}:{config.win_reward_amount}",
        "draw_reward": f"{config.draw_reward_type}:{config.draw_reward_amount}",
        "lose_reward": f"{config.lose_reward_type}:{config.lose_reward_amount}",
        "daily_gain_cap": config.daily_gain_cap,
    }

    if payload.name is not None:
        config.name = payload.name
    if payload.is_active is not None:
        config.is_active = payload.is_active
    if payload.max_daily_plays is not None:
        config.max_daily_plays = payload.max_daily_plays
    if payload.win_probability is not None:
        config.win_probability = payload.win_probability
    if payload.draw_probability is not None:
        config.draw_probability = payload.draw_probability
    if payload.lose_probability is not None:
        config.lose_probability = payload.lose_probability
    if payload.win_reward_type is not None:
        config.win_reward_type = _normalize_reward_type_for_write(payload.win_reward_type)
    if payload.win_reward_amount is not None:
        config.win_reward_amount = payload.win_reward_amount
    if payload.draw_reward_type is not None:
        config.draw_reward_type = _normalize_reward_type_for_write(payload.draw_reward_type)
    if payload.draw_reward_amount is not None:
        config.draw_reward_amount = payload.draw_reward_amount
    if payload.lose_reward_type is not None:
        config.lose_reward_type = _normalize_reward_type_for_write(payload.lose_reward_type)
    if payload.lose_reward_amount is not None:
        config.lose_reward_amount = payload.lose_reward_amount
    if payload.daily_gain_cap is not None:
        pass # V2DiceConfig has no daily_gain_cap
    if payload.enable_golden_hour is not None:
        config.enable_golden_hour = payload.enable_golden_hour
    if payload.golden_hour_multiplier is not None:
        config.golden_hour_multiplier = payload.golden_hour_multiplier

    config.updated_at = datetime.utcnow()

    after_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_plays": config.max_daily_plays,
        "win_probability": config.win_probability,
        "draw_probability": config.draw_probability,
        "lose_probability": config.lose_probability,
        "win_reward": f"{config.win_reward_type}:{config.win_reward_amount}",
        "draw_reward": f"{config.draw_reward_type}:{config.draw_reward_amount}",
        "lose_reward": f"{config.lose_reward_type}:{config.lose_reward_amount}",
        "daily_gain_cap": config.daily_gain_cap,
        "enable_golden_hour": config.enable_golden_hour,
        "golden_hour_multiplier": config.golden_hour_multiplier,
    }
    V2AdminAuditService.log(
        db,
        admin_id,
        "DICE_CONFIG_UPDATE",
        "GAME_CONFIG",
        str(config_id),
        before=before_data,
        after=after_data,
    )

    db.commit()
    db.refresh(config)

    return DiceConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_plays,
        win_probability=config.win_probability,
        draw_probability=config.draw_probability,
        lose_probability=config.lose_probability,
        win_reward_type=_normalize_reward_type_for_dto(config.win_reward_type),
        win_reward_amount=config.win_reward_amount,
        draw_reward_type=_normalize_reward_type_for_dto(config.draw_reward_type),
        draw_reward_amount=config.draw_reward_amount,
        lose_reward_type=_normalize_reward_type_for_dto(config.lose_reward_type),
        lose_reward_amount=config.lose_reward_amount,
        daily_gain_cap=config.daily_gain_cap,
        enable_golden_hour=config.enable_golden_hour,
        golden_hour_multiplier=config.golden_hour_multiplier,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.get("/game/lottery/configs", response_model=list[LotteryConfigDto])
def get_lottery_configs(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    configs = (
        db.query(LotteryConfig)
        .options(selectinload(LotteryConfig.prizes))
        .order_by(LotteryConfig.ticket_type.asc(), LotteryConfig.id.asc())
        .all()
    )

    result = []
    for config in configs:
        prizes_dto = [
            LotteryPrizeDto(
                id=prize.id,
                label=prize.label,
                weight=prize.weight,
                stock=prize.stock,
                reward_type=_normalize_reward_type_for_dto(prize.reward_type),
                reward_amount=prize.reward_amount,
                is_active=prize.is_active,
            )
            for prize in config.prizes
        ]

        result.append(
            LotteryConfigDto(
                id=config.id,
                name=config.name,
                is_active=config.is_active,
                max_daily_plays=config.max_daily_tickets,
                ticket_type=config.ticket_type,
                puzzle_piece_probability=config.puzzle_piece_probability,
                prizes=prizes_dto,
                created_at=config.created_at,
                updated_at=config.updated_at,
            )
        )

    return result


@router.get("/game/lottery/config/{config_id}", response_model=LotteryConfigDto)
def get_lottery_config(
    config_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    config = (
        db.query(LotteryConfig)
        .options(selectinload(LotteryConfig.prizes))
        .filter(LotteryConfig.id == config_id)
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="LOTTERY_CONFIG_NOT_FOUND")

    prizes_dto = [
        LotteryPrizeDto(
            id=prize.id,
            label=prize.label,
            weight=prize.weight,
            stock=prize.stock,
            reward_type=_normalize_reward_type_for_dto(prize.reward_type),
            reward_amount=prize.reward_amount,
            is_active=prize.is_active,
        )
        for prize in config.prizes
    ]

    return LotteryConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_tickets,
        ticket_type=config.ticket_type,
        puzzle_piece_probability=config.puzzle_piece_probability,
        prizes=prizes_dto,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.put("/game/lottery/config/{config_id}", response_model=LotteryConfigDto)
def update_lottery_config(
    config_id: int,
    payload: LotteryConfigUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = (
        db.query(LotteryConfig)
        .options(selectinload(LotteryConfig.prizes))
        .filter(LotteryConfig.id == config_id)
        .first()
    )

    if not config:
        raise HTTPException(status_code=404, detail="LOTTERY_CONFIG_NOT_FOUND")

    before_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_tickets": config.max_daily_tickets,
        "ticket_type": config.ticket_type,
    }

    if payload.name is not None:
        config.name = payload.name
    if payload.ticket_type is not None:
        config.ticket_type = payload.ticket_type
    if payload.is_active is not None:
        config.is_active = payload.is_active
    if payload.max_daily_plays is not None:
        config.max_daily_tickets = payload.max_daily_plays
    if payload.puzzle_piece_probability is not None:
        config.puzzle_piece_probability = payload.puzzle_piece_probability

    config.updated_at = datetime.utcnow()

    after_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_tickets": config.max_daily_tickets,
        "ticket_type": config.ticket_type,
    }
    V2AdminAuditService.log(
        db,
        admin_id,
        "LOTTERY_CONFIG_UPDATE",
        "GAME_CONFIG",
        str(config_id),
        before=before_data,
        after=after_data,
    )

    db.commit()
    db.refresh(config)

    prizes_dto = [
        LotteryPrizeDto(
            id=prize.id,
            label=prize.label,
            weight=prize.weight,
            stock=prize.stock,
            reward_type=_normalize_reward_type_for_dto(prize.reward_type),
            reward_amount=prize.reward_amount,
            is_active=prize.is_active,
        )
        for prize in config.prizes
    ]

    return LotteryConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_tickets,
        ticket_type=config.ticket_type,
        puzzle_piece_probability=config.puzzle_piece_probability,
        prizes=prizes_dto,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.put("/game/lottery/config/{config_id}/prize/{prize_id}", response_model=LotteryPrizeDto)
def update_lottery_prize(
    config_id: int,
    prize_id: int,
    payload: LotteryPrizeUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "OPERATOR", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    prize = (
        db.query(LotteryPrize)
        .filter(LotteryPrize.id == prize_id, LotteryPrize.config_id == config_id)
        .first()
    )

    if not prize:
        raise HTTPException(status_code=404, detail="LOTTERY_PRIZE_NOT_FOUND")

    try:
        # 부분 업데이트 지원: None이 아닌 필드만 업데이트
        if payload.label is not None:
            prize.label = payload.label
        if payload.weight is not None:
            prize.weight = payload.weight
        if payload.stock is not None:
            prize.stock = payload.stock
        elif hasattr(payload, "stock"):
            # 명시적으로 stock=None 전달 시 무제한으로 설정
            prize.stock = None
        if payload.reward_type is not None:
            prize.reward_type = _normalize_reward_type_for_write(payload.reward_type)
        if payload.reward_amount is not None:
            prize.reward_amount = payload.reward_amount
        if payload.is_active is not None:
            prize.is_active = payload.is_active
        prize.updated_at = datetime.utcnow()

        V2AdminAuditService.log(
            db,
            admin_id,
            "LOTTERY_PRIZE_UPDATE",
            "GAME_CONFIG",
            f"{config_id}/{prize_id}",
            before={},
            after={"label": prize.label, "weight": prize.weight, "reward": f"{prize.reward_type}:{prize.reward_amount}"},
        )

        db.commit()
        db.refresh(prize)
    except IntegrityError as exc:
        db.rollback()
        detail = _map_lottery_prize_integrity_error(exc)
        raise HTTPException(status_code=400, detail=detail) from exc

    return LotteryPrizeDto(
        id=prize.id,
        label=prize.label,
        weight=prize.weight,
        stock=prize.stock,
        reward_type=prize.reward_type,
        reward_amount=prize.reward_amount,
        is_active=prize.is_active,
    )


@router.post("/game/lottery/config/{config_id}/prize", response_model=LotteryPrizeDto)
def create_lottery_prize(
    config_id: int,
    payload: LotteryPrizeUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = db.query(LotteryConfig).filter(LotteryConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="LOTTERY_CONFIG_NOT_FOUND")

    try:
        new_prize = LotteryPrize(
            config_id=config_id,
            label=payload.label,
            weight=payload.weight,
            stock=payload.stock,
            reward_type=_normalize_reward_type_for_write(payload.reward_type),
            reward_amount=payload.reward_amount,
            is_active=payload.is_active,
        )
        db.add(new_prize)

        V2AdminAuditService.log(
            db,
            admin_id,
            "LOTTERY_PRIZE_CREATE",
            "GAME_CONFIG",
            str(config_id),
            after={"label": new_prize.label, "weight": new_prize.weight},
        )

        db.commit()
        db.refresh(new_prize)
    except IntegrityError as exc:
        db.rollback()
        detail = _map_lottery_prize_integrity_error(exc)
        raise HTTPException(status_code=400, detail=detail) from exc

    return LotteryPrizeDto(
        id=new_prize.id,
        label=new_prize.label,
        weight=new_prize.weight,
        stock=new_prize.stock,
        reward_type=new_prize.reward_type,
        reward_amount=new_prize.reward_amount,
        is_active=new_prize.is_active,
    )


@router.delete("/game/lottery/config/{config_id}/prize/{prize_id}")
def delete_lottery_prize(
    config_id: int,
    prize_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, admin_role = admin_info

    if admin_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    prize = (
        db.query(LotteryPrize)
        .filter(LotteryPrize.id == prize_id, LotteryPrize.config_id == config_id)
        .first()
    )

    if not prize:
        raise HTTPException(status_code=404, detail="LOTTERY_PRIZE_NOT_FOUND")

    label = prize.label
    db.delete(prize)

    V2AdminAuditService.log(
        db,
        admin_id,
        "LOTTERY_PRIZE_DELETE",
        "GAME_CONFIG",
        f"{config_id}/{prize_id}",
        before={"label": label},
    )

    db.commit()
    return {"message": "DELETED", "id": prize_id}
