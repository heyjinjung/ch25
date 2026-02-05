"""Spending Logger Service - 지출 통합 원장 기록 서비스

작성일: 2026-02-05
설계서: docs/v2_specs/07_golden/2026_02_04_v2_integrated_spending_logic_ko.md
"""
import logging
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.v2.models.v2_spending_ledger import V2SpendingLedger

logger = logging.getLogger(__name__)


class SpendingLoggerService:
    """지출 통합 원장 기록 서비스"""

    # 지출 소스 상수
    SOURCE_HQ_WITHDRAWAL = "HQ_W"
    SOURCE_VAULT_WITHDRAWAL = "VAULT_W"
    SOURCE_SHOP_PURCHASE = "SHOP_U"

    # 통화 유형 상수
    CURRENCY_KRW = "KRW"
    CURRENCY_POINT = "POINT"
    CURRENCY_GW = "G_W"

    # POINT -> KRW 환율 (1:1)
    POINT_TO_KRW_RATE = 1

    @staticmethod
    def get_operational_date_kst(now: Optional[datetime] = None) -> date:
        """운영일 계산 (KST 09:00 리셋 기준)"""
        KST = ZoneInfo("Asia/Seoul")
        RESET_HOUR = 9

        if now is None:
            now = datetime.now(KST)
        elif now.tzinfo is None:
            from datetime import timezone
            now = now.replace(tzinfo=timezone.utc).astimezone(KST)
        else:
            now = now.astimezone(KST)

        if now.hour < RESET_HOUR:
            return (now - timedelta(days=1)).date()
        return now.date()

    @staticmethod
    def convert_to_krw(amount: int, currency_type: str) -> int:
        """통화를 KRW로 환산"""
        if currency_type == SpendingLoggerService.CURRENCY_KRW:
            return amount
        if currency_type == SpendingLoggerService.CURRENCY_POINT:
            return amount * SpendingLoggerService.POINT_TO_KRW_RATE
        if currency_type == SpendingLoggerService.CURRENCY_GW:
            return amount

        logger.warning("Unknown currency type: %s, using 1:1 rate", currency_type)
        return amount

    @staticmethod
    def log_spending(
        db: Session,
        user_id: int,
        amount: int,
        currency_type: str,
        source: str,
        ref_id: str,
        metadata: Optional[Dict[str, Any]] = None,
        now: Optional[datetime] = None,
    ) -> int:
        """지출 기록 (원자적)"""
        if amount <= 0:
            logger.warning("Invalid amount: %s, skipping", amount)
            return 0

        if source not in [
            SpendingLoggerService.SOURCE_HQ_WITHDRAWAL,
            SpendingLoggerService.SOURCE_VAULT_WITHDRAWAL,
            SpendingLoggerService.SOURCE_SHOP_PURCHASE,
        ]:
            raise ValueError(f"Invalid spending source: {source}")

        if currency_type not in [
            SpendingLoggerService.CURRENCY_KRW,
            SpendingLoggerService.CURRENCY_POINT,
            SpendingLoggerService.CURRENCY_GW,
        ]:
            raise ValueError(f"Invalid currency type: {currency_type}")

        kst_date = SpendingLoggerService.get_operational_date_kst(now)
        converted_krw = SpendingLoggerService.convert_to_krw(amount, currency_type)
        transaction_id = f"{source}_{ref_id}"

        try:
            ledger = V2SpendingLedger(
                transaction_id=transaction_id,
                user_id=user_id,
                amount=amount,
                currency_type=currency_type,
                converted_krw_amount=converted_krw,
                spending_source=source,
                kst_date=kst_date,
                metadata_json=metadata,
            )
            db.add(ledger)
            db.flush()

            logger.info(
                "[SpendingLogger] Recorded: tx=%s, user=%s, amount=%s, krw=%s",
                transaction_id,
                user_id,
                amount,
                converted_krw,
            )
            return int(ledger.id)

        except IntegrityError as exc:
            db.rollback()
            message = str(getattr(exc, "orig", exc))
            is_duplicate = (
                "uq_spending_transaction" in message
                or "UNIQUE constraint failed" in message
                or "transaction_id" in message
            )
            if is_duplicate:
                logger.info("[SpendingLogger] Duplicate skipped: tx=%s", transaction_id)
                return 0
            logger.exception("[SpendingLogger] IntegrityError: tx=%s", transaction_id)
            raise

    @staticmethod
    def log_hq_withdrawal(
        db: Session,
        user_id: int,
        amount: int,
        dedup_key: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """HQ 환전 지출 기록"""
        return SpendingLoggerService.log_spending(
            db=db,
            user_id=user_id,
            amount=amount,
            currency_type=SpendingLoggerService.CURRENCY_KRW,
            source=SpendingLoggerService.SOURCE_HQ_WITHDRAWAL,
            ref_id=dedup_key[:16],
            metadata=metadata,
        )

    @staticmethod
    def log_vault_withdrawal(
        db: Session,
        user_id: int,
        amount: int,
        request_id: int,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """금고 출금 승인 시 지출 기록"""
        return SpendingLoggerService.log_spending(
            db=db,
            user_id=user_id,
            amount=amount,
            currency_type=SpendingLoggerService.CURRENCY_KRW,
            source=SpendingLoggerService.SOURCE_VAULT_WITHDRAWAL,
            ref_id=str(request_id),
            metadata=metadata,
        )

    @staticmethod
    def log_shop_purchase(
        db: Session,
        user_id: int,
        amount: int,
        order_id: int,
        currency_type: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> int:
        """상점 구매 시 지출 기록"""
        return SpendingLoggerService.log_spending(
            db=db,
            user_id=user_id,
            amount=amount,
            currency_type=currency_type,
            source=SpendingLoggerService.SOURCE_SHOP_PURCHASE,
            ref_id=str(order_id),
            metadata=metadata,
        )
