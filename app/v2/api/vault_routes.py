"""V2 Vault routes.
V2: remove v1 route dependency and use VaultService directly.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from app.api.deps import get_db
from app.core.config import get_settings
from app.models.external_ranking import ExternalRankingData
from app.models.external_ranking_daily_deposit_delta import ExternalRankingDailyDepositDelta
from app.models.feature import UserEventLog
from app.models.game_wallet import GameTokenType, UserGameWallet
from app.models.user_activity import UserActivity
from app.models.user_segment import UserSegment
from app.models.vault_earn_event import VaultEarnEvent
from app.models.vault_withdrawal_request import VaultWithdrawalRequest
from app.services.user_segment_service import UserSegmentService
from app.services.vault_service import VaultService
from app.v2.api.deps import get_current_user_id
from app.v2.services.user_service import V2UserService
from app.v2.services.vault2_service import Vault2Service

router = APIRouter(prefix="/vault", tags=["Vault"])
service = VaultService()
v2_service = Vault2Service()

class VaultWithdrawRequest(BaseModel):
    amount: int
    protocol_key: str | None = None

@router.get("/status")
def get_v2_vault_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)
        now = datetime.utcnow()
        eligible, user, _ = service.get_status(db=db, user_id=legacy_user_id, now=now)

        locked_balance = int(getattr(user, "vault_locked_balance", 0) or 0)
        reserved_amount = service.get_withdrawal_reserved_amount(db=db, user_id=legacy_user_id)
        available_amount = max(locked_balance - reserved_amount, 0)

        all_wallet_rows = (
            db.query(UserGameWallet)
            .filter(UserGameWallet.user_id == legacy_user_id)
            .all()
        )
        all_balances = {row.token_type.value: int(row.balance or 0) for row in all_wallet_rows}
        ticket_token_types = (
            GameTokenType.DICE_TOKEN,
            GameTokenType.ROULETTE_COIN,
            GameTokenType.LOTTERY_TICKET,
            GameTokenType.TRIAL_TOKEN,
        )
        total_tickets = sum(all_balances.get(tk.value, 0) for tk in ticket_token_types)

        segment = db.query(UserSegment.segment).filter(UserSegment.user_id == legacy_user_id).scalar()

        settings = get_settings()
        tz = ZoneInfo(getattr(settings, "timezone", "Asia/Seoul"))
        now_kst_date = now.astimezone(tz).date()

        has_deposit_today = False
        op_date_kst = service._operational_date_kst(now)
        delta_today = (
            db.query(ExternalRankingDailyDepositDelta.deposit_delta)
            .filter(
                ExternalRankingDailyDepositDelta.user_id == legacy_user_id,
                ExternalRankingDailyDepositDelta.kst_date == op_date_kst,
            )
            .scalar()
            or 0
        )
        if int(delta_today) > 0:
            has_deposit_today = True

        if not has_deposit_today:
            rank_data = db.query(ExternalRankingData).filter(ExternalRankingData.user_id == legacy_user_id).first()
            if rank_data and rank_data.deposit_amount > 0:
                sync_dt_utc = rank_data.updated_at
                if sync_dt_utc and sync_dt_utc.tzinfo is None:
                    sync_dt_utc = sync_dt_utc.replace(tzinfo=timezone.utc)
                if sync_dt_utc:
                    sync_date_kst = sync_dt_utc.astimezone(tz).date()
                    if sync_date_kst == now_kst_date and rank_data.deposit_amount > (rank_data.daily_base_deposit or 0):
                        has_deposit_today = True

        if not has_deposit_today:
            activity = db.query(UserActivity).filter(UserActivity.user_id == legacy_user_id).first()
            if activity and activity.last_charge_at:
                last_charge_utc = activity.last_charge_at
                if last_charge_utc.tzinfo is None:
                    last_charge_utc = last_charge_utc.replace(tzinfo=timezone.utc)
                last_charge_kst_date = last_charge_utc.astimezone(tz).date()
                if last_charge_kst_date == now_kst_date:
                    has_deposit_today = True

        three_days_ago_ts = now - timedelta(days=3)
        recent_play_count = db.query(func.count(VaultEarnEvent.id)).filter(
            VaultEarnEvent.user_id == legacy_user_id,
            VaultEarnEvent.earn_type == "GAME_PLAY",
            VaultEarnEvent.created_at >= three_days_ago_ts,
        ).scalar() or 0

        seven_days_ago_date = (now - timedelta(days=6)).date()
        deposit_7d = db.query(func.coalesce(func.sum(ExternalRankingDailyDepositDelta.deposit_delta), 0)).filter(
            ExternalRankingDailyDepositDelta.user_id == legacy_user_id,
            ExternalRankingDailyDepositDelta.kst_date >= seven_days_ago_date,
        ).scalar() or 0

        segments = UserSegmentService.get_computed_segments(db, legacy_user_id)
        play_target = 30
        spend_target = 10000
        if "AT_RISK" in segments:
            play_target = 100
            spend_target = 30000
        elif deposit_7d >= 3000000:
            play_target = 0
            spend_target = 0
        elif deposit_7d >= 500000:
            play_target = 15
            spend_target = 20000

        withdrawal_count = db.query(func.count(VaultWithdrawalRequest.id)).filter(
            VaultWithdrawalRequest.user_id == legacy_user_id,
            VaultWithdrawalRequest.status.in_(["PENDING", "APPROVED"]),
        ).scalar() or 0

        is_golden_hour_active = False
        golden_hour_multiplier = 1.0
        golden_hour_remaining_seconds = 0
        show_modal_override = None
        gh_cfg = v2_service.get_config_value(db, "golden_hour_config", {})
        if gh_cfg and gh_cfg.get("enabled"):
            override = gh_cfg.get("manual_override", "AUTO")
            if override == "FORCE_ON":
                is_golden_hour_active = True
            elif override == "FORCE_OFF":
                is_golden_hour_active = False
            else:
                now_kst = now.astimezone(tz)
                current_time_str = now_kst.strftime("%H:%M:%S")
                start_str = gh_cfg.get("start_time_kst", "21:30:00")
                end_str = gh_cfg.get("end_time_kst", "22:30:00")
                if start_str <= current_time_str <= end_str:
                    is_golden_hour_active = True
                    try:
                        end_h, end_m, end_s = map(int, end_str.split(":"))
                        end_dt = now_kst.replace(hour=end_h, minute=end_m, second=end_s, microsecond=0)
                        if end_dt < now_kst:
                            end_dt += timedelta(days=1)
                        golden_hour_remaining_seconds = max(0, int((end_dt - now_kst).total_seconds()))
                    except Exception:
                        pass
            if is_golden_hour_active:
                golden_hour_multiplier = float(gh_cfg.get("multiplier", 2.0))
        show_modal_override = v2_service.get_config_value(db, "show_modal_override")

        return {
            "eligible": bool(eligible),
            "vaultBalance": int(getattr(user, "vault_balance", 0) or 0),
            "lockedBalance": int(locked_balance),
            "availableBalance": int(available_amount),
            "ticketCount": int(total_tickets),
            "is_golden_hour_active": bool(is_golden_hour_active),
            "golden_hour_multiplier": float(golden_hour_multiplier),
            "golden_hour_remaining_seconds": int(golden_hour_remaining_seconds),
            "showModalOverride": show_modal_override,
            "segment": segment,
            "daily_play_count": int(recent_play_count),
            "daily_play_target": int(play_target),
            "daily_vault_spent": int(getattr(user, "vault_spent_today", 0) or 0),
            "daily_vault_spent_target": int(spend_target),
            "daily_deposit_confirmed": bool(has_deposit_today),
            "withdrawal_count": int(withdrawal_count),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/withdraw")
def v2_withdraw(
    payload: VaultWithdrawRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id)
):
    try:
        legacy_user_id = V2UserService.ensure_legacy_user_id(db, user_id)
        result = service.request_withdrawal(db=db, user_id=legacy_user_id, amount=int(payload.amount))
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
