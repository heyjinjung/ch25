"""Legacy VaultService bridge for v2 surface area."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session


def record_game_play_earn_event(
    db: Session,
    *,
    user_id: int,
    game_type: str,
    game_log_id: int,
    token_type: str | None = None,
    outcome: str | None = None,
    payout_raw: dict | None = None,
    now: datetime | None = None,
) -> int:
    from app.services.vault_service import VaultService as _V1VaultService

    v1 = _V1VaultService()
    new_balance = v1.record_game_play_earn_event(
        db,
        user_id=user_id,
        game_type=game_type,
        game_log_id=game_log_id,
        token_type=token_type,
        outcome=outcome,
        payout_raw=payout_raw,
        now=now,
    )

    # V2 Native Sync: Sync absolute balance from legacy User to V2User
    from app.v2.models.user import V2User
    from app.v2.models import User
    v2_user = db.get(V2User, user_id)
    if v2_user:
        user = db.get(User, user_id)
        if user:
            v2_user.vault_locked_balance = int(user.vault_locked_balance or 0)
            db.add(v2_user)
            db.flush()
    
    return int(new_balance)


def handle_deposit_increase_signal(
    db: Session,
    *,
    user_id: int,
    deposit_delta: int,
    prev_amount: int,
    new_amount: int,
    now: datetime | None = None,
    commit: bool = True,
) -> int:
    from app.services.vault_service import VaultService as _V1VaultService

    v1 = _V1VaultService()
    new_balance = v1.handle_deposit_increase_signal(
        db,
        user_id=user_id,
        deposit_delta=deposit_delta,
        prev_amount=prev_amount,
        new_amount=new_amount,
        now=now,
        commit=commit,
    )

    # V2 Native Sync: Sync absolute balance from legacy User to V2User
    from app.v2.models.user import V2User
    from app.v2.models import User
    v2_user = db.get(V2User, user_id)
    if v2_user:
        user = db.get(User, user_id)
        if user:
            v2_user.vault_locked_balance = int(user.vault_locked_balance or 0)
            db.add(v2_user)
            if commit:
                db.commit()
            else:
                db.flush()
            
    return int(new_balance)
