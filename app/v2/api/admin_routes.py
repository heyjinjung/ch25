"""V2 Admin UI Routes."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_admin_info, get_db
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.inventory import UserInventoryItem
from app.models.user import User
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.user_retention_state import UserRetentionState
from app.models.roulette import RouletteConfig, RouletteSegment
from app.models.dice import DiceConfig
from app.models.lottery import LotteryConfig, LotteryPrize
from app.v2.services.vault_service import V2VaultService
from app.services.admin_audit_service import AdminAuditService
from app.v2.schemas.v2_admin_economy import AdminWithdrawalDto
from app.v2.schemas.v2_admin_ops import (
    OpsDashboardResponse,
    OpsGoldenRadarDto,
    OpsMetricsDto,
    OpsSystemStatusDto,
    OpsRiskUserDto,
)
from app.v2.schemas.v2_admin_economy import (
    AdminProductDto,
    AdminDepositDto,
    VaultStatsDto,
    UserVaultDto,
    VaultDailyTrendDto,
    VaultForceEditRequest,
)
from app.v2.schemas.v2_admin_user import (
    AdminUserDetailDto,
    InterventionPlaybookDto,
    InterventionActionDto,
    AdminWalletAdjustmentRequest,
    InterventionExecutionResponse,
    AdminUserListDto,
    UserSearchParams,
    UserListResponse,
)
from app.v2.schemas.v2_admin_dashboard import (
    DashboardMetricsResponse,
    MetricValue,
    DailyOverviewResponse,
    EventsStatusResponse,
    ComprehensiveOverviewResponse,
)
from app.v2.schemas.v2_admin_streak import StreakMetricsResponse, StreakDailyMetric
from app.v2.schemas.v2_admin_feature_schedule import (
    AdminFeatureScheduleResponse, 
    AdminFeatureScheduleCreate,
    AdminFeatureScheduleUpdate
)
from app.v2.schemas.v2_admin_game_config import (
    AdminDiceConfigV2,
    DiceEventParams
)
from app.v2.schemas.v2_admin_game import (
    RouletteConfigDto,
    RouletteSegmentDto,
    RouletteConfigUpdateRequest,
    RouletteConfigFullUpdateRequest,
    RouletteSegmentUpdateRequest,
    DiceConfigDto,
    DiceConfigUpdateRequest,
    LotteryConfigDto,
    LotteryPrizeDto,
    LotteryConfigUpdateRequest,
    LotteryPrizeUpdateRequest,
)
from app.v2.schemas.v2_notification_feed import (
    FeedConfigResponse, 
    FeedJackpotConfig
)

from app.v2.models.v2_admin_message import V2AdminMessage
from app.v2.schemas.v2_admin_message import V2MessageCreate, V2MessageResponse
from app.v2.services.admin_message_service import V2AdminMessageService

from app.models.survey import (
    Survey,
    SurveyOption,
    SurveyQuestion,
    SurveyQuestionType,
    SurveyResponse,
    SurveyResponseAnswer,
    SurveyResponseStatus,
    SurveyStatus,
)
from app.v2.schemas.v2_admin_marketing import (
    V2AdminSurveyDto,
    V2AdminSurveyQuestionDto,
    V2AdminSurveyResultDto,
    V2AdminSurveyResultOptionDto,
    V2AdminSurveyToggleRequest,
)

from app.schemas.survey import SurveyDetailResponse, SurveyUpsertRequest

router = APIRouter(prefix="/admin", tags=["v2-admin-ui"])


# ============================================================================
# Marketing (Message Sender / Survey Manager)
# ============================================================================


@router.get("/marketing/messages", response_model=list[V2MessageResponse])
def list_admin_marketing_messages(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> list[V2MessageResponse]:
    _admin_id, _admin_role = admin_info

    items = (
        db.query(V2AdminMessage)
        .filter(V2AdminMessage.is_deleted.is_(False))
        .order_by(V2AdminMessage.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return items


@router.post("/marketing/messages", response_model=V2MessageResponse, status_code=201)
def create_admin_marketing_message(
    payload: V2MessageCreate,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> V2MessageResponse:
    admin_id, _admin_role = admin_info

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


def _map_survey_question_type(question_type: SurveyQuestionType) -> str:
    raw = question_type.value if hasattr(question_type, "value") else str(question_type)
    if raw == SurveyQuestionType.SINGLE_CHOICE.value:
        return "SINGLE"
    if raw == SurveyQuestionType.MULTI_CHOICE.value:
        return "MULTIPLE"
    return "TEXT"


def _serialize_survey_detail(survey: Survey) -> SurveyDetailResponse:
    # Reuse legacy admin response contract (KST datetime serialization).
    from app.schemas.survey import SurveyOptionSchema, SurveyQuestionSchema

    return SurveyDetailResponse(
        id=survey.id,
        title=survey.title,
        description=survey.description,
        channel=survey.channel,
        status=survey.status,
        reward_json=survey.reward_json,
        questions=[
            SurveyQuestionSchema(
                id=q.id,
                order_index=q.order_index,
                randomize_group=q.randomize_group,
                question_type=q.question_type,
                title=q.title,
                helper_text=q.helper_text,
                is_required=q.is_required,
                config_json=q.config_json,
                options=[
                    SurveyOptionSchema(
                        id=opt.id,
                        value=opt.value,
                        label=opt.label,
                        order_index=opt.order_index,
                        weight=opt.weight,
                    )
                    for opt in sorted(q.options, key=lambda o: o.order_index)
                ],
            )
            for q in sorted(survey.questions, key=lambda q: q.order_index)
        ],
    )


def _replace_survey_questions(db: Session, survey: Survey, payload: SurveyUpsertRequest) -> None:
    # Same behavior as legacy admin route: full replace + option normalization.
    survey.questions.clear()
    db.flush()

    for q in payload.questions:
        question = SurveyQuestion(
            survey_id=survey.id,
            order_index=q.order_index,
            randomize_group=q.randomize_group,
            question_type=q.question_type,
            title=q.title,
            helper_text=q.helper_text,
            is_required=q.is_required,
            config_json=q.config_json,
        )
        db.add(question)
        db.flush()

        for idx, opt in enumerate(q.options):
            db.add(
                SurveyOption(
                    question_id=question.id,
                    value=str(opt.get("value") or opt.get("id") or idx),
                    label=opt.get("label") or str(opt.get("value") or ""),
                    order_index=opt.get("order_index") or idx,
                    weight=opt.get("weight") or 1,
                )
            )

    db.commit()
    db.refresh(survey)


@router.get("/marketing/surveys", response_model=list[V2AdminSurveyDto])
def list_admin_marketing_surveys(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> list[V2AdminSurveyDto]:
    _admin_id, _admin_role = admin_info

    surveys = (
        db.query(Survey)
        .options(selectinload(Survey.questions).selectinload(SurveyQuestion.options))
        .order_by(Survey.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Aggregate completed response counts per survey
    counts = dict(
        db.query(SurveyResponse.survey_id, func.count(SurveyResponse.id))
        .filter(SurveyResponse.status == SurveyResponseStatus.COMPLETED)
        .group_by(SurveyResponse.survey_id)
        .all()
    )

    result: list[V2AdminSurveyDto] = []
    for s in surveys:
        questions = [
            V2AdminSurveyQuestionDto(
                id=q.id,
                type=_map_survey_question_type(q.question_type),
                question=q.title,
                options=[opt.label for opt in sorted(q.options, key=lambda o: o.order_index)]
                if q.options
                else None,
            )
            for q in sorted(s.questions, key=lambda q: q.order_index)
        ]
        result.append(
            V2AdminSurveyDto(
                id=s.id,
                title=s.title,
                description=s.description,
                questions=questions,
                is_active=(s.status == SurveyStatus.ACTIVE),
                response_count=int(counts.get(s.id, 0) or 0),
                created_at=s.created_at,
            )
        )
    return result


@router.post("/marketing/surveys", response_model=SurveyDetailResponse, status_code=201)
def create_admin_marketing_survey(
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> SurveyDetailResponse:
    admin_id, _admin_role = admin_info

    survey = Survey(
        title=payload.title,
        description=payload.description,
        channel=payload.channel,
        status=payload.status or SurveyStatus.DRAFT,
        reward_json=payload.reward_json,
        target_segment_json=payload.target_segment_json,
        auto_launch=payload.auto_launch,
        start_at=payload.start_at,
        end_at=payload.end_at,
        created_by=admin_id,
    )
    db.add(survey)
    db.commit()
    db.refresh(survey)
    _replace_survey_questions(db, survey, payload)
    return _serialize_survey_detail(survey)


@router.get("/marketing/surveys/{survey_id}", response_model=SurveyDetailResponse)
def get_admin_marketing_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> SurveyDetailResponse:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")
    return _serialize_survey_detail(survey)


@router.put("/marketing/surveys/{survey_id}", response_model=SurveyDetailResponse)
def update_admin_marketing_survey(
    survey_id: int,
    payload: SurveyUpsertRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> SurveyDetailResponse:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    survey.title = payload.title
    survey.description = payload.description
    survey.channel = payload.channel
    survey.status = payload.status or survey.status
    survey.reward_json = payload.reward_json
    survey.target_segment_json = payload.target_segment_json
    survey.auto_launch = payload.auto_launch
    survey.start_at = payload.start_at
    survey.end_at = payload.end_at
    db.add(survey)
    db.commit()
    db.refresh(survey)
    _replace_survey_questions(db, survey, payload)
    return _serialize_survey_detail(survey)


@router.delete("/marketing/surveys/{survey_id}")
def delete_admin_marketing_survey(
    survey_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> dict:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    # Soft-delete by archiving (keeps historical responses intact).
    survey.status = SurveyStatus.ARCHIVED
    survey.updated_at = datetime.utcnow()
    db.add(survey)
    db.commit()
    return {"ok": True}


@router.put("/marketing/surveys/{survey_id}/toggle")
def toggle_admin_marketing_survey(
    survey_id: int,
    payload: V2AdminSurveyToggleRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> dict:
    _admin_id, _admin_role = admin_info
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    survey.status = SurveyStatus.ACTIVE if payload.is_active else SurveyStatus.PAUSED
    survey.updated_at = datetime.utcnow()
    db.add(survey)
    db.commit()
    return {"ok": True}


@router.get("/marketing/surveys/{survey_id}/results", response_model=list[V2AdminSurveyResultDto])
def get_admin_marketing_survey_results(
    survey_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
) -> list[V2AdminSurveyResultDto]:
    _admin_id, _admin_role = admin_info
    survey = (
        db.query(Survey)
        .options(selectinload(Survey.questions).selectinload(SurveyQuestion.options))
        .filter(Survey.id == survey_id)
        .first()
    )
    if not survey:
        raise HTTPException(status_code=404, detail="SURVEY_NOT_FOUND")

    results: list[V2AdminSurveyResultDto] = []
    for q in sorted(survey.questions, key=lambda q: q.order_index):
        # Choice questions
        if q.options:
            rows = (
                db.query(SurveyResponseAnswer.option_id, func.count(SurveyResponseAnswer.id))
                .join(SurveyResponse, SurveyResponseAnswer.response_id == SurveyResponse.id)
                .filter(
                    SurveyResponse.survey_id == survey_id,
                    SurveyResponse.status == SurveyResponseStatus.COMPLETED,
                    SurveyResponseAnswer.question_id == q.id,
                )
                .group_by(SurveyResponseAnswer.option_id)
                .all()
            )
            count_by_option_id = {int(opt_id): int(cnt) for opt_id, cnt in rows if opt_id is not None}
            total = sum(count_by_option_id.values())

            option_items: list[V2AdminSurveyResultOptionDto] = []
            for opt in sorted(q.options, key=lambda o: o.order_index):
                cnt = int(count_by_option_id.get(opt.id, 0))
                pct = int(round((cnt * 100) / total)) if total > 0 else 0
                option_items.append(
                    V2AdminSurveyResultOptionDto(option=opt.label, count=cnt, percentage=pct)
                )

            results.append(
                V2AdminSurveyResultDto(
                    survey_id=survey_id,
                    question_id=q.id,
                    question=q.title,
                    responses=option_items,
                )
            )
            continue

        # Text/number/etc.
        text_count = (
            db.query(func.count(SurveyResponseAnswer.id))
            .join(SurveyResponse, SurveyResponseAnswer.response_id == SurveyResponse.id)
            .filter(
                SurveyResponse.survey_id == survey_id,
                SurveyResponse.status == SurveyResponseStatus.COMPLETED,
                SurveyResponseAnswer.question_id == q.id,
            )
            .scalar()
        )
        total = int(text_count or 0)
        results.append(
            V2AdminSurveyResultDto(
                survey_id=survey_id,
                question_id=q.id,
                question=q.title,
                responses=[
                    V2AdminSurveyResultOptionDto(option="응답", count=total, percentage=100 if total > 0 else 0)
                ],
            )
        )

    return results


@router.get("/users", response_model=UserListResponse)
def get_admin_users_list(
    search: str = None,
    status: str = None,
    minLevel: int = None,
    maxLevel: int = None,
    sortBy: str = "last_active",
    sortOrder: str = "desc",
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get paginated user list with search and filters."""
    admin_id, admin_role = admin_info

    # Build query
    query = db.query(User)

    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.nickname.ilike(search_pattern)) |
            (User.telegram_username.ilike(search_pattern)) |
            (User.external_id.ilike(search_pattern))
        )

    # Status filter
    if status:
        query = query.filter(User.status == status)

    # Level filter
    if minLevel is not None:
        query = query.filter(User.level >= minLevel)
    if maxLevel is not None:
        query = query.filter(User.level <= maxLevel)

    # Sorting
    if sortBy == "level":
        order_col = User.level
    elif sortBy == "vault_balance":
        order_col = func.coalesce(User.vault_available_balance, 0) + func.coalesce(User.vault_locked_balance, 0)
    elif sortBy == "created_at":
        order_col = User.created_at
    else:  # last_active (default)
        order_col = User.updated_at

    if sortOrder == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())

    # Count total
    total = query.count()

    # Pagination
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()

    # Format response
    user_list = []
    for user in users:
        vault_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

        # Determine tier
        tier = "COMMON"
        if user.total_charge_amount:
            if user.total_charge_amount >= 10000000:
                tier = "VVIP"
            elif user.total_charge_amount >= 5000000:
                tier = "VIP"

        # Determine status
        status_str = "Active" if user.status == "ACTIVE" else "Inactive" if user.status == "INACTIVE" else "Suspended"

        # Last active (use updated_at as proxy)
        last_active = user.updated_at.strftime("%Y-%m-%d %H:%M") if user.updated_at else "-"

        user_list.append(AdminUserListDto(
            id=user.id,
            cc_id=user.id,
            nickname=user.nickname or "(미설정)",
            telegram_id=user.telegram_id,
            telegram_username=user.telegram_username,
            tier=tier,
            level=user.level or 1,
            vaultBalance=vault_balance,
            last_active=last_active,
            status=status_str
        ))

    total_pages = (total + limit - 1) // limit

    return UserListResponse(
        users=user_list,
        total=total,
        page=page,
        limit=limit,
        totalPages=total_pages
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailDto)
def get_admin_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get 360-view of a user."""
    admin_id, admin_role = admin_info
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 1. Ticket Balance
    ticket_balance = 0
    wallets = db.query(UserGameWallet).filter(UserGameWallet.user_id == user_id).all()
    for w in wallets:
        if "TICKET" in w.token_type.name or "COIN" in w.token_type.name:
             ticket_balance += int(w.balance or 0)

    # 2. Vault/Assets
    vault_balance = int(user.vault_locked_balance or 0) + int(user.vault_available_balance or 0)
    current_assets = vault_balance  
    
    # 3. Retention/Risk State
    retention = db.query(UserRetentionState).filter(UserRetentionState.user_id == user_id).first()
    risk_level = "LOW"
    risk_reason = None
    
    if retention:
        if retention.churn_probability_score > 0.8:
            risk_level = "HIGH"
            risk_reason = "High Churn Probability"
        elif retention.churn_probability_score > 0.5:
            risk_level = "MEDIUM"
            
    if user.total_charge_amount > 10000000:
        risk_level = "HIGH"
        risk_reason = "High Value Account"

    # 4. Intervention Playbook (Logic from Golden System)
    suggested_actions = []
    if risk_level == "HIGH":
        suggested_actions = [
            InterventionActionDto(
                action_id="BAILOUT_GIFT",
                label="긴급 구호 자금 지급",
                type="REWARD",
                description="파산 위험 유저에게 소액의 티켓 지급 (Retention)"
            ),
            InterventionActionDto(
                action_id="SEND_CRM_PULSE",
                label="CRM 펄스 전송",
                type="MESSAGE",
                description="이탈 방지용 개인화 메시지 전송"
            )
        ]
    elif risk_level == "MEDIUM":
         suggested_actions = [
            InterventionActionDto(
                action_id="MONITOR_CLOSELY",
                label="밀착 모니터링 지정",
                type="SYSTEM",
                description="해당 유저의 다음 게임 결과 실시간 알림 활성화"
            )
        ]

    playbook = InterventionPlaybookDto(
        risk_level=risk_level,
        suggested_actions=suggested_actions
    )

    return AdminUserDetailDto(
        id=user.id,
        nickname=user.nickname,
        telegram_id=user.telegram_id,
        created_at=user.created_at,
        total_deposit=int(user.total_charge_amount or 0),
        current_assets=current_assets,
        vault_balance=vault_balance,
        ticket_balance=ticket_balance,
        level=user.level,
        vip_level="VIP" if user.total_charge_amount > 5000000 else "COMMON",
        is_active=(user.status == "ACTIVE"),
        risk_level=risk_level,
        risk_reason=risk_reason,
        playbook=playbook if suggested_actions else None
    )


@router.post("/users/{user_id}/intervention/{action_id}", response_model=InterventionExecutionResponse)
def execute_intervention_action(
    user_id: int,
    action_id: str,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Execute a suggested intervention action."""
    admin_id, admin_role = admin_info
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # Implementation logic based on action_id
    if action_id == "BAILOUT_GIFT":
        # Example: Grant 5 Roulette Tickets (Standard bailout pattern)
        # In a real system, this would interact with the Inventory/Key system
        # For now, let's assume we use Vault deposit as a placeholder or specific service
        V2VaultService.deposit(db, user_id, 1000) # Give 1000 points as bailout
        db.commit()

        AdminAuditService.log(
            db, admin_id, "EXECUTE_INTERVENTION", "USER", str(user_id),
            before={"risk_level": user.retention_state.risk_level if user.retention_state else "UNKNOWN"},
            after={"action": action_id, "result": "1000 points granted"}
        )

        return InterventionExecutionResponse(
            success=True, action_id=action_id, message="Bailout points (1000) granted successfully."
        )
    
    elif action_id == "SEND_CRM_PULSE":
        # Placeholder for CRM messaging
        return InterventionExecutionResponse(
            success=True, action_id=action_id, message="CRM Pulse scheduled for delivery."
        )

    raise HTTPException(status_code=400, detail="INVALID_ACTION_ID")


@router.post("/users/{user_id}/wallet/adjust", response_model=InterventionExecutionResponse)
def adjust_user_wallet(
    user_id: int,
    payload: AdminWalletAdjustmentRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Adjust user wallet/vault balance manually."""
    admin_id, admin_role = admin_info
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED_FOR_WALLET_ADJUST")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    if payload.token_type == "VAULT":
        if payload.amount > 0:
            V2VaultService.deposit(db, user_id, payload.amount)
        else:
            V2VaultService.withdraw(db, user_id, abs(payload.amount))
    else:
        # Handle tickets/coins via UserGameWallet
        wallet = db.query(UserGameWallet).filter(
            UserGameWallet.user_id == user_id,
            UserGameWallet.token_type == payload.token_type
        ).first()
        if not wallet:
            wallet = UserGameWallet(user_id=user_id, token_type=payload.token_type, balance=0)
            db.add(wallet)
        
        wallet.balance = int(wallet.balance or 0) + payload.amount
        if wallet.balance < 0:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_TOKEN_BALANCE")

    db.commit()

    AdminAuditService.log(
        db, admin_id, "WALLET_ADJUST", "USER", str(user_id),
        before={"token_type": payload.token_type, "amount_change": payload.amount},
        after={"reason": payload.reason}
    )

    return InterventionExecutionResponse(
        success=True, action_id="WALLET_ADJUST", message=f"Wallet adjusted: {payload.amount} ({payload.token_type})"
    )


@router.get("/withdrawals", response_model=List[AdminWithdrawalDto])
def list_admin_withdrawals(
    status: str = "PENDING",
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """List withdrawal requests."""
    admin_id, admin_role = admin_info
    query = db.query(VaultWithdrawalRequest)
    if status:
        query = query.filter(VaultWithdrawalRequest.status == status)
    
    rows = query.order_by(VaultWithdrawalRequest.created_at.desc()).limit(100).all()
    
    result = []
    for r in rows:
        # Determine risk level (Mock logic or based on amount)
        risk = "LOW"
        if r.amount >= 1000000:
            risk = "HIGH"
        elif r.amount >= 300000:
            risk = "MEDIUM"
            
        result.append(AdminWithdrawalDto(
            id=r.id,
            user_id=r.user_id,
            nickname=r.user.nickname if r.user else "Unknown",
            amount=r.amount,
            request_time=r.created_at,
            risk_level=risk,
            status=r.status
        ))
    return result


@router.get("/economy/deposits/pending", response_model=List[AdminDepositDto])
def list_pending_deposits(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """List pending deposits for approval."""
    admin_id, admin_role = admin_info
    # V2: In this specific project, deposits are often handled via CC ranking (ExternalRanking)
    # or a specific ledger. For compatibility with the requested UI endpoint:
    from app.services.admin_external_ranking_service import AdminExternalRankingService
    rows = AdminExternalRankingService.list_all(db) # Assuming this lists entries that need review
    
    # Pre-fetch user nicknames map
    user_ids = [r.user_id for r in rows]
    user_map = {}
    deposit_count_map = {}

    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        user_map = {u.id: u.nickname for u in users}

        # Calculate deposit counts (days active in deposit ranking)
        raw_counts = (
            db.query(
                ExternalRankingDailyDepositDelta.user_id, 
                func.count(ExternalRankingDailyDepositDelta.id)
            )
            .filter(ExternalRankingDailyDepositDelta.user_id.in_(user_ids))
            .filter(ExternalRankingDailyDepositDelta.deposit_delta > 0)
            .group_by(ExternalRankingDailyDepositDelta.user_id)
            .all()
        )
        deposit_count_map = {uid: cnt for uid, cnt in raw_counts}
    
    result = []
    for r in rows:
        result.append(AdminDepositDto(
            id=r.id,
            user_id=r.user_id,
            nickname=user_map.get(r.user_id),
            amount=int(r.deposit_amount or 0),
            deposit_count=int(deposit_count_map.get(r.user_id, 0)),
            bank_owner="Manual Entry", # Placeholder as fallback
            status="PENDING",
            requested_at=r.created_at,
            is_new=True
        ))
    return result


@router.get("/shop/products", response_model=List[AdminProductDto])
def list_admin_shop_products(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """List shop products for admin management."""
    admin_id, admin_role = admin_info
    from app.services.ui_config_service import UiConfigService
    
    row = UiConfigService.get(db, "v2_shop_products")
    value = row.value_json if row and isinstance(row.value_json, dict) else {}
    products = value.get("products", []) if isinstance(value, dict) else []
    
    result = []
    for p in products:
        result.append(AdminProductDto(
            id=hash(p.get("sku", "")), # Fallback ID
            sku=p.get("sku"),
            name=p.get("name"),
            price=int(p.get("cost_amount", 0)),
            is_visible=True,
            category="TICKET" if "TICKET" in p.get("sku", "") else "OTHER"
        ))
    return result


@router.get("/ops/status", response_model=OpsDashboardResponse)
def get_ops_dashboard_status(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get Ops Dashboard Status (System & Radar)."""
    admin_id, admin_role = admin_info
    
    # Enforce RBAC for certain metrics if needed, but dashboard is generally for all admins/operators
    
    # 1. System Status (Mock Check)
    system_status = OpsSystemStatusDto(db="OK", redis="OK", worker="OK")
    
    # 2. Golden Radar
    high_rollers_count = db.query(User).filter(User.total_charge_amount >= 1000000).count()
    
    # Get high risk users for Crisis Radar
    risk_users_query = db.query(User, UserRetentionState).join(
        UserRetentionState, User.id == UserRetentionState.user_id
    ).filter(UserRetentionState.churn_probability_score >= 0.7).limit(10).all()
    
    risk_users = []
    for u, ret in risk_users_query:
        risk_users.append(OpsRiskUserDto(
            user_id=u.id,
            nickname=u.nickname,
            risk_level="HIGH" if ret.churn_probability_score > 0.85 else "MEDIUM",
            risk_reason="High Churn Score",
            churn_score=float(ret.churn_probability_score)
        ))
    
    online_now = 42 # Mock
    
    golden_radar = OpsGoldenRadarDto(
        high_rollers=high_rollers_count,
        churn_risks=len(risk_users_query),
        online_now=online_now,
        risk_users=risk_users
    )
    
    # 3. Metrics
    # Sum of deposits today? 
    # Use vault_spent_today as a proxy for activity
    revenue = db.query(func.sum(User.vault_spent_today)).scalar() or 0
    
    metrics = OpsMetricsDto(
        today_revenue=int(revenue),
        active_users_24h=120  # Mock
    )
    
    return OpsDashboardResponse(
        system=system_status,
        golden_radar=golden_radar,
        metrics=metrics
    )

@router.get("/ops/dashboard", response_model=OpsDashboardResponse)
def get_ops_dashboard_alias(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    return get_ops_dashboard_status(db, admin_info)

@router.get("/ops/plans")
def list_ops_plans_stub(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    # Stub for SoT verification
    return []

@router.post("/ops/plans")
def create_ops_plan_stub(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    # Stub for SoT verification
    return {"status": "created"}


@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    range_hours: int = 24,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Get high-level dashboard metrics (V2).
    Migrated from V1 admin_dashboard.py
    """
    admin_id, admin_role = admin_info
    now = datetime.utcnow()
    
    # Mock V2 Implementation for Migration Phase 1
    # Real implementation needs to query UserActivityEvent, etc.
    
    return DashboardMetricsResponse(
        range_hours=range_hours,
        generated_at=now,
        active_users=MetricValue(value=150, diff_percent=5.2),
        game_participation=MetricValue(value=1200, diff_percent=12.5),
        unique_players=MetricValue(value=85, diff_percent=-2.1),
        ticket_usage=MetricValue(value=5000, diff_percent=0.0),
        avg_session_time_seconds=MetricValue(value=420, diff_percent=1.5),
    )


@router.get("/dashboard/streak", response_model=StreakMetricsResponse)
def get_streak_metrics(
    days: int = 7,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """
    Get streak observability metrics.
    Migrated from V1 admin_dashboard.py
    """
    admin_id, admin_role = admin_info
    
    # Mock V2 Implementation
    items = []
    for i in range(days):
        items.append(StreakDailyMetric(
            day=datetime.utcnow().date(),
            promote=10,
            reset=2,
            vault_base_plays=100
        ))
        
    return StreakMetricsResponse(
        days=days,
        generated_at=datetime.utcnow(),
        items=items
    )


@router.get("/feature-schedule", response_model=List[AdminFeatureScheduleResponse])
def list_feature_schedules(
    start_date: datetime,
    end_date: datetime,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """List feature Schedules."""
    admin_id, admin_role = admin_info
    return []

@router.put("/feature-schedule", response_model=AdminFeatureScheduleResponse)
def upsert_feature_schedule(
    payload: AdminFeatureScheduleCreate,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Upsert feature schedule."""
    admin_id, admin_role = admin_info
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    return AdminFeatureScheduleResponse(
        id=1,
        date=payload.date,
        feature_type=payload.feature_type,
        is_active=payload.is_active,
        created_at=str(datetime.utcnow())
    )

@router.get("/game-config/dice", response_model=AdminDiceConfigV2)
def get_dice_config(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get Dice Config."""
    admin_id, admin_role = admin_info
    return AdminDiceConfigV2(
        name="Standard Dice",
        max_daily_plays=10,
        win_reward_type="POINT",
        win_reward_amount=100,
        draw_reward_type="NONE",
        draw_reward_amount=0,
        lose_reward_type="NONE",
        lose_reward_amount=0
    )


@router.get("/feed/config", response_model=FeedConfigResponse)
def get_feed_config(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Get Feed Config."""
    admin_id, admin_role = admin_info
    return FeedConfigResponse(
        threshold=10000,
        mega_threshold=30000
    )

@router.put("/feed/config", response_model=FeedConfigResponse)
def update_feed_config(
    payload: FeedJackpotConfig,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """Update Feed Config."""
    admin_id, admin_role = admin_info
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")
    return FeedConfigResponse(**payload.dict())


# ============================================================================
# Vault Control API
# ============================================================================

@router.get("/vault/stats", response_model=VaultStatsDto)
def get_vault_stats(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """금고 통계 정보 조회"""
    admin_id, admin_role = admin_info

    # 오늘 날짜 기준
    from datetime import date
    today = date.today()

    # 당일 금고 누적 총액 (전체 유저의 금고 잔액 합계)
    today_total = db.query(
        func.sum(User.vault_available_balance) + func.sum(User.vault_locked_balance)
    ).scalar() or 0

    # 당일 출금 통계
    today_withdrawals = db.query(VaultWithdrawalRequest).filter(
        func.date(VaultWithdrawalRequest.created_at) == today
    ).all()

    today_pending = sum(w.amount for w in today_withdrawals if w.status == "PENDING")
    today_approved = sum(w.amount for w in today_withdrawals if w.status == "APPROVED")
    today_rejected = sum(w.amount for w in today_withdrawals if w.status == "REJECTED")

    # 전체 대기 중인 출금 건수
    total_pending_count = db.query(VaultWithdrawalRequest).filter(
        VaultWithdrawalRequest.status == "PENDING"
    ).count()

    return VaultStatsDto(
        today_total_vault=int(today_total),
        today_withdrawal_pending=today_pending,
        today_withdrawal_approved=today_approved,
        today_withdrawal_rejected=today_rejected,
        total_pending_count=total_pending_count
    )


@router.get("/vault/users", response_model=list[UserVaultDto])
def get_vault_users(
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "vault_balance",  # vault_balance, total_deposit, last_activity
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """회원별 금고 정보 조회"""
    admin_id, admin_role = admin_info

    query = db.query(User)

    # 정렬
    if sort_by == "vault_balance":
        order_col = func.coalesce(User.vault_available_balance, 0) + func.coalesce(User.vault_locked_balance, 0)
        query = query.order_by(order_col.desc())
    elif sort_by == "total_deposit":
        query = query.order_by(User.total_charge_amount.desc())
    elif sort_by == "last_activity":
        query = query.order_by(User.updated_at.desc())

    users = query.offset(offset).limit(limit).all()

    result = []
    for user in users:
        vault_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

        # Tier 결정
        tier = "COMMON"
        if user.total_charge_amount:
            if user.total_charge_amount >= 10000000:
                tier = "VVIP"
            elif user.total_charge_amount >= 5000000:
                tier = "VIP"

        # 총 출금액 계산
        total_withdrawal = db.query(func.sum(VaultWithdrawalRequest.amount)).filter(
            VaultWithdrawalRequest.user_id == user.id,
            VaultWithdrawalRequest.status == "APPROVED"
        ).scalar() or 0

        result.append(UserVaultDto(
            user_id=user.id,
            nickname=user.nickname or "(미설정)",
            telegram_username=user.telegram_username,
            vault_balance=vault_balance,
            total_deposit=int(user.total_charge_amount or 0),
            total_withdrawal=int(total_withdrawal),
            last_activity=user.updated_at,
            tier=tier
        ))

    return result


@router.get("/vault/trend", response_model=list[VaultDailyTrendDto])
def get_vault_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """일자별 금고 추이"""
    admin_id, admin_role = admin_info

    from datetime import timedelta, date
    today = date.today()

    result = []
    for i in range(days):
        target_date = today - timedelta(days=days - i - 1)

        # 해당일의 출금 통계
        day_withdrawals = db.query(VaultWithdrawalRequest).filter(
            func.date(VaultWithdrawalRequest.created_at) == target_date
        ).all()

        withdrawal_count = len([w for w in day_withdrawals if w.status == "APPROVED"])
        withdrawal_amount = sum(w.amount for w in day_withdrawals if w.status == "APPROVED")

        # 입금 통계는 total_charge_amount 증가분으로 추정 (간소화)
        deposit_count = 0
        deposit_amount = 0

        # 해당일 총 금고액 (snapshot 방식 - 실제로는 daily_snapshot 테이블 필요)
        # 여기서는 현재 총액으로 대체
        total_vault = db.query(
            func.sum(User.vault_available_balance) + func.sum(User.vault_locked_balance)
        ).scalar() or 0

        result.append(VaultDailyTrendDto(
            date=target_date.strftime("%Y-%m-%d"),
            total_vault=int(total_vault),
            deposit_count=deposit_count,
            withdrawal_count=withdrawal_count,
            deposit_amount=deposit_amount,
            withdrawal_amount=withdrawal_amount
        ))

    return result


@router.post("/vault/force-edit")
def force_edit_vault(
    payload: VaultForceEditRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """금고 잔액 강제 수정"""
    admin_id, admin_role = admin_info

    # 권한 체크 - SuperAdmin 또는 Operator만 가능
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    # 기존 잔액 저장
    before_balance = int(user.vault_available_balance or 0) + int(user.vault_locked_balance or 0)

    # 잔액 조정 (available_balance에만 적용)
    new_balance = (user.vault_available_balance or 0) + payload.amount
    if new_balance < 0:
        raise HTTPException(status_code=400, detail="INSUFFICIENT_BALANCE")

    user.vault_available_balance = new_balance

    # Audit Log 기록
    AdminAuditService.log(
        db, admin_id, "VAULT_FORCE_EDIT", "USER", str(payload.user_id),
        before={"vault_balance": before_balance},
        after={"vault_balance": int(new_balance), "amount_change": payload.amount, "reason": payload.reason}
    )

    db.commit()

    return {
        "success": True,
        "user_id": payload.user_id,
        "before_balance": before_balance,
        "after_balance": int(new_balance),
        "amount_change": payload.amount
    }


# ============================================================================
# Game Configuration - Roulette
# ============================================================================

@router.get("/game/roulette/configs", response_model=list[RouletteConfigDto])
def get_roulette_configs(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """모든 룰렛 설정 조회 (등급별로 4개)"""
    configs = db.query(RouletteConfig).options(
        selectinload(RouletteConfig.segments)
    ).order_by(RouletteConfig.grade).all()

    result = []
    for config in configs:
        segments_dto = [
            RouletteSegmentDto(
                id=seg.id,
                slot_index=seg.slot_index,
                label=seg.label,
                weight=seg.weight,
                reward_type=seg.reward_type,
                reward_amount=seg.reward_amount,
                is_jackpot=seg.is_jackpot
            )
            for seg in sorted(config.segments, key=lambda x: x.slot_index)
        ]

        result.append(RouletteConfigDto(
            id=config.id,
            name=config.name,
            grade=config.grade,
            ticket_type=config.ticket_type,
            max_daily_spins=config.max_daily_spins,
            is_active=config.is_active,
            segments=segments_dto,
            created_at=config.created_at,
            updated_at=config.updated_at
        ))

    return result


@router.get("/game/roulette/config/{config_id}", response_model=RouletteConfigDto)
def get_roulette_config(
    config_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """특정 룰렛 설정 조회"""
    config = db.query(RouletteConfig).options(
        selectinload(RouletteConfig.segments)
    ).filter(RouletteConfig.id == config_id).first()

    if not config:
        raise HTTPException(status_code=404, detail="ROULETTE_CONFIG_NOT_FOUND")

    segments_dto = [
        RouletteSegmentDto(
            id=seg.id,
            slot_index=seg.slot_index,
            label=seg.label,
            weight=seg.weight,
            reward_type=seg.reward_type,
            reward_amount=seg.reward_amount,
            is_jackpot=seg.is_jackpot
        )
        for seg in sorted(config.segments, key=lambda x: x.slot_index)
    ]

    return RouletteConfigDto(
        id=config.id,
        name=config.name,
        grade=config.grade,
        ticket_type=config.ticket_type,
        max_daily_spins=config.max_daily_spins,
        is_active=config.is_active,
        segments=segments_dto,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/game/roulette/config/{config_id}", response_model=RouletteConfigDto)
def update_roulette_config(
    config_id: int,
    payload: RouletteConfigFullUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """룰렛 설정 업데이트 (Config + Segments)"""
    admin_id, admin_role = admin_info

    # 권한 체크 - SuperAdmin 또는 Operator만 가능
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = db.query(RouletteConfig).options(
        selectinload(RouletteConfig.segments)
    ).filter(RouletteConfig.id == config_id).first()

    if not config:
        raise HTTPException(status_code=404, detail="ROULETTE_CONFIG_NOT_FOUND")

    # Config 기본 정보 업데이트
    before_data = {
        "name": config.name,
        "ticket_type": config.ticket_type,
        "max_daily_spins": config.max_daily_spins,
        "is_active": config.is_active
    }

    if payload.name is not None:
        config.name = payload.name
    if payload.ticket_type is not None:
        config.ticket_type = payload.ticket_type
    if payload.max_daily_spins is not None:
        config.max_daily_spins = payload.max_daily_spins
    if payload.is_active is not None:
        config.is_active = payload.is_active

    # Segments 업데이트
    if payload.segments is not None:
        # 기존 세그먼트를 slot_index로 매핑
        segment_map = {seg.slot_index: seg for seg in config.segments}

        for seg_update in payload.segments:
            if seg_update.slot_index in segment_map:
                # 기존 세그먼트 업데이트
                seg = segment_map[seg_update.slot_index]
                seg.label = seg_update.label
                seg.weight = seg_update.weight
                seg.reward_type = seg_update.reward_type
                seg.reward_amount = seg_update.reward_amount
                seg.is_jackpot = seg_update.is_jackpot
                seg.updated_at = datetime.utcnow()
            else:
                # 새 세그먼트 생성
                new_seg = RouletteSegment(
                    config_id=config.id,
                    slot_index=seg_update.slot_index,
                    label=seg_update.label,
                    weight=seg_update.weight,
                    reward_type=seg_update.reward_type,
                    reward_amount=seg_update.reward_amount,
                    is_jackpot=seg_update.is_jackpot
                )
                db.add(new_seg)

    config.updated_at = datetime.utcnow()

    # Audit Log 기록
    after_data = {
        "name": config.name,
        "ticket_type": config.ticket_type,
        "max_daily_spins": config.max_daily_spins,
        "is_active": config.is_active
    }
    AdminAuditService.log(
        db, admin_id, "ROULETTE_CONFIG_UPDATE", "GAME_CONFIG", str(config_id),
        before=before_data,
        after=after_data
    )

    db.commit()
    db.refresh(config)

    # 업데이트된 설정 반환
    segments_dto = [
        RouletteSegmentDto(
            id=seg.id,
            slot_index=seg.slot_index,
            label=seg.label,
            weight=seg.weight,
            reward_type=seg.reward_type,
            reward_amount=seg.reward_amount,
            is_jackpot=seg.is_jackpot
        )
        for seg in sorted(config.segments, key=lambda x: x.slot_index)
    ]

    return RouletteConfigDto(
        id=config.id,
        name=config.name,
        grade=config.grade,
        ticket_type=config.ticket_type,
        max_daily_spins=config.max_daily_spins,
        is_active=config.is_active,
        segments=segments_dto,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


# ============================================================================
# Game Configuration - Dice
# ============================================================================

@router.get("/game/dice/config", response_model=DiceConfigDto)
def get_dice_config(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """주사위 게임 설정 조회"""
    # 기본 설정 1개만 존재 (ID=1)
    config = db.query(DiceConfig).first()

    if not config:
        raise HTTPException(status_code=404, detail="DICE_CONFIG_NOT_FOUND")

    return DiceConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_plays,
        win_reward_type=config.win_reward_type,
        win_reward_amount=config.win_reward_amount,
        draw_reward_type=config.draw_reward_type,
        draw_reward_amount=config.draw_reward_amount,
        lose_reward_type=config.lose_reward_type,
        lose_reward_amount=config.lose_reward_amount,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/game/dice/config/{config_id}", response_model=DiceConfigDto)
def update_dice_config(
    config_id: int,
    payload: DiceConfigUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """주사위 게임 설정 업데이트"""
    admin_id, admin_role = admin_info

    # 권한 체크
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = db.query(DiceConfig).filter(DiceConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="DICE_CONFIG_NOT_FOUND")

    # 업데이트 전 상태 저장
    before_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_plays": config.max_daily_plays,
        "win_reward": f"{config.win_reward_type}:{config.win_reward_amount}",
        "draw_reward": f"{config.draw_reward_type}:{config.draw_reward_amount}",
        "lose_reward": f"{config.lose_reward_type}:{config.lose_reward_amount}",
    }

    # 부분 업데이트
    if payload.name is not None:
        config.name = payload.name
    if payload.is_active is not None:
        config.is_active = payload.is_active
    if payload.max_daily_plays is not None:
        config.max_daily_plays = payload.max_daily_plays
    if payload.win_reward_type is not None:
        config.win_reward_type = payload.win_reward_type
    if payload.win_reward_amount is not None:
        config.win_reward_amount = payload.win_reward_amount
    if payload.draw_reward_type is not None:
        config.draw_reward_type = payload.draw_reward_type
    if payload.draw_reward_amount is not None:
        config.draw_reward_amount = payload.draw_reward_amount
    if payload.lose_reward_type is not None:
        config.lose_reward_type = payload.lose_reward_type
    if payload.lose_reward_amount is not None:
        config.lose_reward_amount = payload.lose_reward_amount

    config.updated_at = datetime.utcnow()

    # Audit Log
    after_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_plays": config.max_daily_plays,
        "win_reward": f"{config.win_reward_type}:{config.win_reward_amount}",
        "draw_reward": f"{config.draw_reward_type}:{config.draw_reward_amount}",
        "lose_reward": f"{config.lose_reward_type}:{config.lose_reward_amount}",
    }
    AdminAuditService.log(
        db, admin_id, "DICE_CONFIG_UPDATE", "GAME_CONFIG", str(config_id),
        before=before_data,
        after=after_data
    )

    db.commit()
    db.refresh(config)

    return DiceConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_plays,
        win_reward_type=config.win_reward_type,
        win_reward_amount=config.win_reward_amount,
        draw_reward_type=config.draw_reward_type,
        draw_reward_amount=config.draw_reward_amount,
        lose_reward_type=config.lose_reward_type,
        lose_reward_amount=config.lose_reward_amount,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


# ============================================================================
# Game Configuration - Lottery
# ============================================================================

@router.get("/game/lottery/configs", response_model=list[LotteryConfigDto])
def get_lottery_configs(
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """복권 게임 설정 조회 (일반적으로 1개)"""
    configs = db.query(LotteryConfig).options(
        selectinload(LotteryConfig.prizes)
    ).all()

    result = []
    for config in configs:
        prizes_dto = [
            LotteryPrizeDto(
                id=prize.id,
                label=prize.label,
                weight=prize.weight,
                stock=prize.stock,
                reward_type=prize.reward_type,
                reward_amount=prize.reward_amount,
                is_active=prize.is_active
            )
            for prize in config.prizes
        ]

        result.append(LotteryConfigDto(
            id=config.id,
            name=config.name,
            is_active=config.is_active,
            max_daily_plays=config.max_daily_tickets,  # DB는 max_daily_tickets
            puzzle_piece_probability=0.0,  # TODO: 실제 필드 추가 필요
            prizes=prizes_dto,
            created_at=config.created_at,
            updated_at=config.updated_at
        ))

    return result


@router.get("/game/lottery/config/{config_id}", response_model=LotteryConfigDto)
def get_lottery_config(
    config_id: int,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """특정 복권 설정 조회"""
    config = db.query(LotteryConfig).options(
        selectinload(LotteryConfig.prizes)
    ).filter(LotteryConfig.id == config_id).first()

    if not config:
        raise HTTPException(status_code=404, detail="LOTTERY_CONFIG_NOT_FOUND")

    prizes_dto = [
        LotteryPrizeDto(
            id=prize.id,
            label=prize.label,
            weight=prize.weight,
            stock=prize.stock,
            reward_type=prize.reward_type,
            reward_amount=prize.reward_amount,
            is_active=prize.is_active
        )
        for prize in config.prizes
    ]

    return LotteryConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_tickets,
        puzzle_piece_probability=0.0,  # TODO: 실제 필드 추가 필요
        prizes=prizes_dto,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/game/lottery/config/{config_id}", response_model=LotteryConfigDto)
def update_lottery_config(
    config_id: int,
    payload: LotteryConfigUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """복권 설정 업데이트"""
    admin_id, admin_role = admin_info

    # 권한 체크
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    config = db.query(LotteryConfig).options(
        selectinload(LotteryConfig.prizes)
    ).filter(LotteryConfig.id == config_id).first()

    if not config:
        raise HTTPException(status_code=404, detail="LOTTERY_CONFIG_NOT_FOUND")

    # 업데이트 전 상태
    before_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_tickets": config.max_daily_tickets
    }

    # 부분 업데이트
    if payload.name is not None:
        config.name = payload.name
    if payload.is_active is not None:
        config.is_active = payload.is_active
    if payload.max_daily_plays is not None:
        config.max_daily_tickets = payload.max_daily_plays
    if payload.puzzle_piece_probability is not None:
        pass  # TODO: DB 필드 추가 필요

    config.updated_at = datetime.utcnow()

    # Audit Log
    after_data = {
        "name": config.name,
        "is_active": config.is_active,
        "max_daily_tickets": config.max_daily_tickets
    }
    AdminAuditService.log(
        db, admin_id, "LOTTERY_CONFIG_UPDATE", "GAME_CONFIG", str(config_id),
        before=before_data,
        after=after_data
    )

    db.commit()
    db.refresh(config)

    prizes_dto = [
        LotteryPrizeDto(
            id=prize.id,
            label=prize.label,
            weight=prize.weight,
            stock=prize.stock,
            reward_type=prize.reward_type,
            reward_amount=prize.reward_amount,
            is_active=prize.is_active
        )
        for prize in config.prizes
    ]

    return LotteryConfigDto(
        id=config.id,
        name=config.name,
        is_active=config.is_active,
        max_daily_plays=config.max_daily_tickets,
        puzzle_piece_probability=0.0,
        prizes=prizes_dto,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/game/lottery/config/{config_id}/prize/{prize_id}", response_model=LotteryPrizeDto)
def update_lottery_prize(
    config_id: int,
    prize_id: int,
    payload: LotteryPrizeUpdateRequest,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    """복권 당첨 항목 업데이트"""
    admin_id, admin_role = admin_info

    # 권한 체크
    if admin_role not in ["SUPER_ADMIN", "OPERATOR"]:
        raise HTTPException(status_code=403, detail="NOT_AUTHORIZED")

    prize = db.query(LotteryPrize).filter(
        LotteryPrize.id == prize_id,
        LotteryPrize.config_id == config_id
    ).first()

    if not prize:
        raise HTTPException(status_code=404, detail="LOTTERY_PRIZE_NOT_FOUND")

    # 업데이트
    prize.label = payload.label
    prize.weight = payload.weight
    prize.stock = payload.stock
    prize.reward_type = payload.reward_type
    prize.reward_amount = payload.reward_amount
    prize.is_active = payload.is_active
    prize.updated_at = datetime.utcnow()

    # Audit Log
    AdminAuditService.log(
        db, admin_id, "LOTTERY_PRIZE_UPDATE", "GAME_CONFIG", f"{config_id}/{prize_id}",
        before={},
        after={"label": prize.label, "weight": prize.weight, "reward": f"{prize.reward_type}:{prize.reward_amount}"}
    )

    db.commit()
    db.refresh(prize)

    return LotteryPrizeDto(
        id=prize.id,
        label=prize.label,
        weight=prize.weight,
        stock=prize.stock,
        reward_type=prize.reward_type,
        reward_amount=prize.reward_amount,
        is_active=prize.is_active
    )
