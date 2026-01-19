"""V2 inventory service (exchange log only)."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.v2.models.v2_exchange_log import V2ExchangeLog


class V2InventoryService:
    @staticmethod
    def log_exchange(
        db: Session,
        *,
        user_id: int,
        input_type: str,
        input_amount: int,
        output_type: str,
        output_amount: int,
    ) -> V2ExchangeLog:
        if input_amount <= 0:
            raise ValueError("input_amount must be > 0")
        if output_amount <= 0:
            raise ValueError("output_amount must be > 0")

        record = V2ExchangeLog(
            user_id=user_id,
            input_type=input_type,
            input_amount=input_amount,
            output_type=output_type,
            output_amount=output_amount,
        )
        db.add(record)
        db.flush()
        return record
