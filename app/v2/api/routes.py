"""V2 API routes (web verification + admin ops)."""
from datetime import date, datetime
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Header, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_info, get_current_user_id, get_db
from app.models.admin_message import AdminMessageInbox
from app.models.game_wallet import GameTokenType
from app.models.inventory import UserInventoryItem
from app.models.user import User
from app.schemas.dice import DicePlayResponse, DiceStatusResponse
from app.schemas.lottery import LotteryPlayResponse, LotteryStatusResponse
from app.schemas.mission import MissionListResponse
from app.schemas.roulette import RoulettePlayRequest, RoulettePlayResponse, RouletteStatusResponse
from app.services.inventory_service import InventoryService
from app.services.mission_service import MissionService
from app.services.feature_service import FeatureService
from app.v2.services.retention_intervention_service import V2RetentionInterventionService
from app.services.shop_service import ShopService
from app.services.team_battle_service import TeamBattleService
from app.services.game_wallet_service import GameWalletService
from app.services.dice_service import DiceService
from app.services.lottery_service import LotteryService
from app.services.roulette_service import RouletteService
from app.v2.schemas.v2_admin_message import (
    V2MessageCreate,
    V2MessageResponse,
    V2SegmentBatchResponse,
    V2InboxListResponse,
    V2InboxMessageDto,
    V2MarkInboxReadRequest,
    V2MarkInboxReadResponse,
)
from app.v2.schemas.v2_golden import (
    V2ReengagementQueueRequest,
    V2ReengagementQueueResponse,
    V2RetentionInterventionRequest,
    V2RetentionInterventionResponse,
)
from app.v2.schemas.v2_ticket_zero import V2TicketZeroBailoutResponse, V2TicketZeroStatusResponse
from app.v2.services.ticket_zero_service import TicketZeroEligibilityInput, V2TicketZeroService
from app.v2.services.admin_message_service import V2AdminMessageService
from app.v2.services.segment_service import V2SegmentService
from app.v2.models.v2_admin_message import V2AdminMessageInbox
from app.v2.models.v2_ticket_zero_log import V2TicketZeroLog
from app.core.security import decode_access_token
from app.core.config import get_settings
from app.core.exceptions import NoFeatureTodayError

router = APIRouter(tags=["v2-games"])
_feature_service = FeatureService()
_bearer_scheme = HTTPBearer(auto_error=False)

_roulette_service = RouletteService()
_dice_service = DiceService()
_lottery_service = LotteryService()
_retention_service = V2RetentionInterventionService()
_team_battle_service = TeamBattleService()
_wallet_service = GameWalletService()

from app.v2.api.admin_routes import router as admin_router
from app.v2.api.activity_routes import router as activity_router
from app.v2.api.v1_auth_user_alias import router as v1_auth_user_alias_router

router.include_router(admin_router)
router.include_router(activity_router)
router.include_router(v1_auth_user_alias_router)


class V2InventoryUseRequest(BaseModel):
    item_type: str
    amount: int = 1
    idempotency_key: str | None = None


class V2ShopPurchaseRequest(BaseModel):
    sku: str
    idempotency_key: str | None = None


def _get_optional_user_id(
    request: Request, credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme)
) -> Optional[int]:
    if credentials is None or not credentials.credentials:
        if getattr(request.app.state, "test_session_factory", None) is not None:
            return 1
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        sub = payload.get("sub")
        return int(sub) if sub else None
    except Exception:
        return None


@router.get("/health", tags=["v2-system"])
def v2_health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/today-feature", tags=["v2-system"])
def v2_today_feature(
    db: Session = Depends(get_db),
    user_id: Optional[int] = Depends(_get_optional_user_id),
) -> dict:
    now_kst = datetime.now(ZoneInfo("Asia/Seoul"))
    _ = get_settings()
    try:
        feature_type = _feature_service.get_today_feature(db, now_kst)
    except NoFeatureTodayError:
        return {"feature_type": None, "user_id": user_id} if user_id is not None else {"feature_type": None}
    feature_value = feature_type.value if hasattr(feature_type, "value") else feature_type
    result = {"feature_type": feature_value}
    if user_id is not None:
        result["user_id"] = user_id
    return result


@router.get("/metrics", tags=["v2-system"])
def v2_metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


def _map_legacy_token_to_v2(token_value: str) -> str:
    mapping = {
        GameTokenType.ROULETTE_COIN.value: "ROULETTE_TICKET",
        GameTokenType.DICE_TOKEN.value: "DICE_TICKET",
        GameTokenType.LOTTERY_TICKET.value: "LOTTERY_TICKET",
        GameTokenType.GOLD_KEY.value: "GOLD_KEY_TICKET",
        GameTokenType.DIAMOND_KEY.value: "DIAMOND_TICKET",
        GameTokenType.TRIAL_TOKEN.value: "TRIAL_TICKET",
    }
    return mapping.get(token_value, token_value)


def _map_v2_ticket_to_legacy(token_value: str) -> GameTokenType:
    mapping = {
        "ROULETTE_TICKET": GameTokenType.ROULETTE_COIN,
        "DICE_TICKET": GameTokenType.DICE_TOKEN,
        "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
        "GOLD_KEY_TICKET": GameTokenType.GOLD_KEY,
        "DIAMOND_TICKET": GameTokenType.DIAMOND_KEY,
        "TRIAL_TICKET": GameTokenType.TRIAL_TOKEN,
    }
    return mapping.get(token_value, GameTokenType.ROULETTE_COIN)


@router.get("/roulette/status", response_model=RouletteStatusResponse)
def roulette_status(
    ticket_type: str = GameTokenType.ROULETTE_COIN.value,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> RouletteStatusResponse:
    today = date.today()
    return _roulette_service.get_status(db=db, user_id=user_id, today=today, ticket_type=ticket_type)


@router.post("/roulette/play", response_model=RoulettePlayResponse)
def roulette_play(
    payload: RoulettePlayRequest | None = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> RoulettePlayResponse:
    today = date.today()
    ticket_type = payload.ticket_type if payload else GameTokenType.ROULETTE_COIN.value
    return _roulette_service.play(db=db, user_id=user_id, now=today, ticket_type=ticket_type)


@router.get("/dice/status", response_model=DiceStatusResponse)
def dice_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> DiceStatusResponse:
    today = date.today()
    return _dice_service.get_status(db=db, user_id=user_id, today=today)


@router.post("/dice/play", response_model=DicePlayResponse)
def dice_play(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> DicePlayResponse:
    today = date.today()
    return _dice_service.play(db=db, user_id=user_id, now=today)


@router.get("/lottery/status", response_model=LotteryStatusResponse)
def lottery_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LotteryStatusResponse:
    today = date.today()
    return _lottery_service.get_status(db=db, user_id=user_id, today=today)


@router.post("/lottery/play", response_model=LotteryPlayResponse)
def lottery_play(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> LotteryPlayResponse:
    today = date.today()
    return _lottery_service.play(db=db, user_id=user_id, now=today)


@router.post("/segments/run", response_model=V2SegmentBatchResponse, tags=["v2-admin"])
def run_segment_batch(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> V2SegmentBatchResponse:
    admin_id, admin_role = admin_info
    result = V2SegmentService.segment_all_users(db)
    return V2SegmentBatchResponse(**result)


@router.post("/messages", response_model=V2MessageResponse, tags=["v2-admin"])
def create_admin_message(
    payload: V2MessageCreate,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> V2MessageResponse:
    admin_id, admin_role = admin_info
    if payload.target_type != "ALL" and not (payload.target_value and payload.target_value.strip()):
        raise HTTPException(status_code=400, detail="TARGET_VALUE_REQUIRED")

    resolved_user_ids = None
    if payload.target_type == "USER" and payload.target_value:
        resolved_user_ids = []
        for raw in payload.target_value.split(","):
            raw = raw.strip()
            if not raw:
                continue
            try:
                resolved_user_ids.append(int(raw))
            except ValueError:
                continue

    msg = V2AdminMessageService.create_message(
        db,
        sender_admin_id=admin_id,
        title=payload.title,
        content=payload.content,
        target_type=payload.target_type,
        target_value=payload.target_value,
        channels=payload.channels,
    )

    V2AdminMessageService.fan_out_message(
        db,
        message_id=msg.id,
        target_type=payload.target_type,
        target_value=payload.target_value,
        resolved_user_ids=resolved_user_ids,
    )

    return msg


@router.post(
    "/golden/intervention/resolve",
    response_model=V2RetentionInterventionResponse,
    tags=["v2-golden"],
)
def resolve_golden_intervention(
    payload: V2RetentionInterventionRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2RetentionInterventionResponse:
    event_type = payload.event_type.strip().upper()
    if not event_type:
        raise HTTPException(status_code=400, detail="INVALID_EVENT_TYPE")

    result = _retention_service.resolve_intervention(
        db,
        user_id=user_id,
        event_type=event_type,
        data=payload.data or {},
    )
    return V2RetentionInterventionResponse(**result)


@router.post(
    "/golden/reengagement/queue",
    response_model=V2ReengagementQueueResponse,
    tags=["v2-golden"],
)
def queue_golden_reengagement(
    payload: V2ReengagementQueueRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2ReengagementQueueResponse:
    result = _retention_service.enqueue_reengagement(
        db,
        user_id=user_id,
        reason=payload.reason,
        channel=payload.channel,
    )
    return V2ReengagementQueueResponse(**result)


@router.get("/mission/", response_model=MissionListResponse, tags=["v2-mission"])
def list_missions(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> MissionListResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    service = MissionService(db)
    missions = service.get_user_missions(user_id)
    streak_info = service.get_streak_info(user_id)
    return MissionListResponse(missions=missions, streak_info=streak_info)


@router.post("/mission/{mission_id}/claim", tags=["v2-mission"])
def claim_mission(
    mission_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    idempotency_key: str | None = Header(None, alias="X-Idempotency-Key"),
):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="X-Idempotency-Key header required")
    service = MissionService(db)
    success, reward_type, amount = service.claim_reward(user_id, mission_id)
    if not success:
        raise HTTPException(status_code=400, detail=reward_type)
    return {"success": True, "reward_type": reward_type, "amount": amount}


@router.post("/mission/daily-gift", tags=["v2-mission"])
def claim_daily_gift(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = MissionService(db)
    success, reward_type, amount = service.claim_daily_gift(user_id)
    if not success:
        raise HTTPException(status_code=400, detail=reward_type)
    return {"success": True, "reward_type": reward_type, "amount": amount}


@router.get("/mission/streak/rules", tags=["v2-mission"])
def get_streak_rules(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    _ = user_id
    from app.services.ui_config_service import UiConfigService

    row = UiConfigService.get(db, "streak_reward_rules")
    if row and row.value_json:
        return row.value_json.get("rules", [])
    return [
        {
            "day": 3,
            "enabled": True,
            "grants": [
                {"kind": "WALLET", "token_type": "ROULETTE_COIN", "amount": 1},
                {"kind": "WALLET", "token_type": "DICE_TOKEN", "amount": 1},
                {"kind": "WALLET", "token_type": "LOTTERY_TICKET", "amount": 1},
            ],
        },
        {"day": 7, "enabled": True, "grants": [{"kind": "INVENTORY", "item_type": "DIAMOND", "amount": 1}]},
    ]


@router.post("/mission/streak/claim", tags=["v2-mission"])
def claim_streak_reward(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    service = MissionService(db)
    result = service.claim_streak_reward(user_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    streak_info = service.get_streak_info(user_id)
    return {"success": True, "streak_info": streak_info, "grants": result.get("grants")}


@router.get("/inventory", tags=["v2-inventory"])
def get_inventory(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    current_user = db.query(User).filter(User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    items = InventoryService.get_inventory(db, current_user.id)
    wallet_data: dict[str, int] = {}
    legacy_diamond_balance: int | None = None
    if current_user.game_wallets:
        for w in current_user.game_wallets:
            if w.token_type.value == "DIAMOND":
                legacy_diamond_balance = int(w.balance or 0)
                continue
            wallet_data[_map_legacy_token_to_v2(w.token_type.value)] = int(w.balance or 0)

    items_payload = [
        {"item_type": item.item_type, "quantity": item.quantity, "created_at": item.created_at}
        for item in items
    ]
    if (legacy_diamond_balance or 0) > 0 and not any(p.get("item_type") == "DIAMOND" for p in items_payload):
        from datetime import datetime

        items_payload.append(
            {"item_type": "DIAMOND", "quantity": legacy_diamond_balance, "created_at": datetime.utcnow()}
        )

    return {"items": items_payload, "wallet": wallet_data}


@router.post("/inventory/use", tags=["v2-inventory"])
def use_inventory_item(
    payload: V2InventoryUseRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    x_idempotency_key: str | None = Header(default=None, alias="X-Idempotency-Key"),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    item_type = (payload.item_type or "").strip()
    if not item_type:
        raise HTTPException(status_code=400, detail="MISSING_ITEM_TYPE")
    amount = int(payload.amount or 1)

    resolved_key = (payload.idempotency_key or x_idempotency_key or idempotency_key or "").strip()
    if not resolved_key:
        raise HTTPException(status_code=400, detail="IDEMPOTENCY_KEY_REQUIRED")

    result = InventoryService.use_voucher(
        db,
        user_id,
        item_type,
        amount,
        idempotency_key=resolved_key,
    )
    reward_token = result.get("reward_token")
    if isinstance(reward_token, str):
        result["reward_token"] = _map_legacy_token_to_v2(reward_token)
    return result


@router.get("/shop/products", tags=["v2-shop"])
def list_shop_products(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    _ = user_id
    from app.services.ui_config_service import UiConfigService

    row = UiConfigService.get(db, "v2_shop_products")
    value = row.value_json if row and isinstance(row.value_json, dict) else {}
    products = value.get("products", []) if isinstance(value, dict) else []
    if not isinstance(products, list):
        return []
    normalized = []
    for raw in products:
        if not isinstance(raw, dict):
            continue
        sku = raw.get("sku")
        name = raw.get("name")
        cost_amount = raw.get("cost_amount")
        reward_type = raw.get("reward_type")
        reward_amount = raw.get("reward_amount")
        if not sku or not name or cost_amount is None or reward_type is None or reward_amount is None:
            continue
        normalized.append(
            {
                "sku": sku,
                "name": name,
                "cost_type": "VAULT",
                "cost_amount": int(cost_amount),
                "reward_type": reward_type,
                "reward_amount": int(reward_amount),
            }
        )
    return normalized


@router.post("/shop/purchase", tags=["v2-shop"])
def purchase_shop_product(
    payload: V2ShopPurchaseRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
    x_idempotency_key: str | None = Header(default=None, alias="X-Idempotency-Key"),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    sku = (payload.sku or "").strip()
    if not sku:
        raise HTTPException(status_code=400, detail="MISSING_SKU")

    resolved_key = (payload.idempotency_key or x_idempotency_key or idempotency_key or "").strip()
    if not resolved_key:
        raise HTTPException(status_code=400, detail="IDEMPOTENCY_KEY_REQUIRED")

    from app.services.idempotency_service import IdempotencyService

    idem_record, existing = IdempotencyService.begin(
        db,
        user_id=user_id,
        scope="v2_shop_purchase",
        idempotency_key=resolved_key,
        request_payload={"sku": sku},
    )
    if existing is not None:
        return existing

    products = list_shop_products(db=db, user_id=user_id)
    product = next((item for item in products if item.get("sku") == sku), None)
    if not product:
        raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")

    cost_amount = int(product.get("cost_amount", 0))
    if cost_amount <= 0:
        raise HTTPException(status_code=400, detail="INVALID_COST_AMOUNT")

    reward_type = str(product.get("reward_type"))
    reward_amount = int(product.get("reward_amount", 0))
    if reward_amount <= 0:
        raise HTTPException(status_code=400, detail="INVALID_REWARD_AMOUNT")

    # Deduct vault balance (SoT) and record order.
    from app.v2.services.shop_service import V2ShopService

    try:
        order = V2ShopService.purchase(
            db,
            user_id=user_id,
            sku=sku,
            name=str(product.get("name")),
            cost_amount=cost_amount,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )

        # Grant reward (single transaction)
        if reward_type in {
            "ROULETTE_TICKET",
            "DICE_TICKET",
            "LOTTERY_TICKET",
            "GOLD_KEY_TICKET",
            "DIAMOND_TICKET",
            "TRIAL_TICKET",
        }:
            token_type = _map_v2_ticket_to_legacy(reward_type)
            _wallet_service.grant_tokens(
                db,
                user_id=user_id,
                token_type=token_type,
                amount=reward_amount,
                reason="V2_SHOP_PURCHASE",
                auto_commit=False,
            )
        elif reward_type == "DIAMOND":
            InventoryService.grant_item(
                db,
                user_id=user_id,
                item_type="DIAMOND",
                amount=reward_amount,
                reason="V2_SHOP_PURCHASE",
                auto_commit=False,
            )
        elif reward_type in {"POINT", "CC_POINT"}:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
            user.vault_locked_balance = int(user.vault_locked_balance or 0) + reward_amount
            db.add(user)
        else:
            raise HTTPException(status_code=400, detail="UNSUPPORTED_REWARD_TYPE")

        response = {"order_id": order.id, "sku": sku, "reward_type": reward_type, "reward_amount": reward_amount}
        IdempotencyService.complete(db, record=idem_record, response_payload=response)
        db.commit()
        return response
    except Exception:
        db.rollback()
        raise


@router.get("/team-battle/seasons/active", tags=["v2-team-battle"])
def team_battle_active_season(db: Session = Depends(get_db)):
    return _team_battle_service.get_active_season(db)


@router.get("/team-battle/teams", tags=["v2-team-battle"])
def team_battle_list_teams(db: Session = Depends(get_db)):
    return _team_battle_service.list_joinable_teams(db)


@router.post("/team-battle/teams/join", tags=["v2-team-battle"])
def team_battle_join(payload: dict, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    team_id = payload.get("team_id")
    if not team_id:
        raise HTTPException(status_code=400, detail="TEAM_ID_REQUIRED")
    member = _team_battle_service.join_team(db, team_id=int(team_id), user_id=user_id)
    return {"team_id": member.team_id, "user_id": member.user_id, "role": member.role}


@router.post("/team-battle/teams/leave", tags=["v2-team-battle"])
def team_battle_leave(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    _team_battle_service.leave_team(db, user_id=user_id)
    return {"left": True}


@router.get("/team-battle/teams/me", tags=["v2-team-battle"])
def team_battle_me(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return _team_battle_service.get_membership(db, user_id=user_id)


@router.get("/team-battle/teams/leaderboard", tags=["v2-team-battle"])
def team_battle_leaderboard(
    season_id: int | None = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return _team_battle_service.leaderboard(db, season_id=season_id, limit=min(limit, 100), offset=max(offset, 0))


@router.get("/ticket-zero/status", response_model=V2TicketZeroStatusResponse, tags=["v2-ticket-zero"])
def ticket_zero_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2TicketZeroStatusResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    point_balance = int(user.vault_locked_balance or 0)

    ticket_token_types = [
        GameTokenType.ROULETTE_COIN,
        GameTokenType.DICE_TOKEN,
        GameTokenType.LOTTERY_TICKET,
        GameTokenType.TRIAL_TOKEN,
    ]
    ticket_balance = 0
    for token in ticket_token_types:
        ticket_balance += _wallet_service.get_balance(db, user_id, token)

    inventory_rows = (
        db.query(UserInventoryItem)
        .filter(UserInventoryItem.user_id == user_id)
        .all()
    )
    inventory_balance = sum(int(row.quantity or 0) for row in inventory_rows)

    has_pending_rewards = False
    try:
        has_pending_rewards = (
            db.query(V2AdminMessageInbox)
            .filter(V2AdminMessageInbox.user_id == user_id, V2AdminMessageInbox.is_read.is_(False))
            .first()
            is not None
        )
    except Exception:
        has_pending_rewards = False

    try:
        if not has_pending_rewards:
            has_pending_rewards = (
                db.query(AdminMessageInbox)
                .filter(AdminMessageInbox.user_id == user_id, AdminMessageInbox.is_read.is_(False))
                .first()
                is not None
            )
    except Exception:
        pass

    if not has_pending_rewards:
        service = MissionService(db)
        missions = service.get_user_missions(user_id)
        has_pending_rewards = any(
            m.progress.is_completed and not m.progress.is_claimed for m in missions
        )

    last_claimed = (
        db.query(V2TicketZeroLog)
        .filter(V2TicketZeroLog.user_id == user_id)
        .order_by(V2TicketZeroLog.granted_at.desc())
        .first()
    )
    eligibility = TicketZeroEligibilityInput(
        point_balance=point_balance,
        ticket_balance=ticket_balance + inventory_balance,
        has_pending_rewards=has_pending_rewards,
        last_claimed_at=last_claimed.granted_at if last_claimed else None,
        now=datetime.utcnow(),
    )
    eligible = V2TicketZeroService.is_eligible(eligibility)
    return V2TicketZeroStatusResponse(bailout_available=eligible)


@router.post("/ticket-zero/bailout", response_model=V2TicketZeroBailoutResponse, tags=["v2-ticket-zero"])
def ticket_zero_bailout(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2TicketZeroBailoutResponse:
    status = ticket_zero_status(db=db, user_id=user_id)
    if not status.bailout_available:
        return V2TicketZeroBailoutResponse(granted=False, ticket_type="ROULETTE_TICKET", ticket_amount=0)

    ticket_amount = 1
    _wallet_service.grant_tokens(
        db,
        user_id=user_id,
        token_type=GameTokenType.ROULETTE_COIN,
        amount=ticket_amount,
        reason="TICKET_ZERO",
        auto_commit=True,
    )

    log = V2TicketZeroLog(
        user_id=user_id,
        ticket_type="ROULETTE_TICKET",
        ticket_amount=ticket_amount,
    )
    db.add(log)
    db.commit()
    return V2TicketZeroBailoutResponse(granted=True, ticket_type="ROULETTE_TICKET", ticket_amount=ticket_amount)


# ============================================================================
# Inbox API (User-facing)
# ============================================================================


@router.get("/inbox", response_model=V2InboxListResponse, tags=["v2-user"])
def get_user_inbox(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2InboxListResponse:
    """Get all inbox messages for the current user."""
    from app.v2.models.v2_admin_message import V2AdminMessageInbox, V2AdminMessage

    inbox_entries = (
        db.query(V2AdminMessageInbox)
        .join(V2AdminMessage, V2AdminMessageInbox.message_id == V2AdminMessage.id)
        .filter(
            V2AdminMessageInbox.user_id == user_id,
            V2AdminMessage.is_deleted == False,
        )
        .order_by(V2AdminMessageInbox.created_at.desc())
        .all()
    )

    messages = []
    unread_count = 0

    for entry in inbox_entries:
        messages.append(
            V2InboxMessageDto(
                id=entry.id,
                message_id=entry.message_id,
                title=entry.message.title,
                content=entry.message.content,
                is_read=entry.is_read,
                read_at=entry.read_at,
                created_at=entry.created_at,
            )
        )
        if not entry.is_read:
            unread_count += 1

    return V2InboxListResponse(messages=messages, unread_count=unread_count)


@router.patch("/inbox/read", response_model=V2MarkInboxReadResponse, tags=["v2-user"])
def mark_inbox_read(
    payload: V2MarkInboxReadRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
) -> V2MarkInboxReadResponse:
    """Mark one or more inbox messages as read."""
    from app.v2.models.v2_admin_message import V2AdminMessage, V2AdminMessageInbox

    now = datetime.utcnow()
    marked_count = 0
    updated_message_ids = set()

    for inbox_id in payload.inbox_ids:
        entry = (
            db.query(V2AdminMessageInbox)
            .filter(
                V2AdminMessageInbox.id == inbox_id,
                V2AdminMessageInbox.user_id == user_id,
                V2AdminMessageInbox.is_read == False,
            )
            .first()
        )
        if entry:
            entry.is_read = True
            entry.read_at = now
            marked_count += 1
            updated_message_ids.add(entry.message_id)

    # Increment read_count for each message
    for message_id in updated_message_ids:
        message = db.query(V2AdminMessage).filter(V2AdminMessage.id == message_id).first()
        if message:
            message.read_count += 1

    db.commit()

    # Count remaining unread messages
    remaining_unread = (
        db.query(V2AdminMessageInbox)
        .filter(
            V2AdminMessageInbox.user_id == user_id,
            V2AdminMessageInbox.is_read == False,
        )
        .count()
    )

    return V2MarkInboxReadResponse(marked_count=marked_count, remaining_unread=remaining_unread)
