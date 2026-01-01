"""Idempotency helpers for write operations."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.idempotency import UserIdempotencyKey


class IdempotencyService:
    """Provide idempotency guarantees for a given (user_id, scope, key)."""

    @staticmethod
    def _canonical_json(payload: dict[str, Any]) -> str:
        return json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))

    @staticmethod
    def _hash(canonical_json: str) -> str:
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    @staticmethod
    def begin(
        db: Session,
        *,
        user_id: int,
        scope: str,
        idempotency_key: str,
        request_payload: dict[str, Any],
    ) -> tuple[UserIdempotencyKey, dict[str, Any] | None]:
        """Create/find an idempotency record.

        Returns (record, response_if_already_completed).
        """

        key = (idempotency_key or "").strip()
        if not key:
            raise ValueError("idempotency_key required")

        canonical = IdempotencyService._canonical_json(request_payload)
        request_hash = IdempotencyService._hash(canonical)

        dialect = getattr(getattr(db, "bind", None), "dialect", None)
        dialect_name = getattr(dialect, "name", "")

        if dialect_name == "mysql":
            # Use MySQL upsert to avoid IntegrityError-based control flow.
            from sqlalchemy.dialects.mysql import insert as mysql_insert  # type: ignore

            stmt = mysql_insert(UserIdempotencyKey.__table__).values(
                user_id=user_id,
                scope=scope,
                idempotency_key=key,
                request_hash=request_hash,
                request_json=canonical,
                status="IN_PROGRESS",
            )
            # If duplicate: keep original row (no-op update).
            stmt = stmt.on_duplicate_key_update(id=UserIdempotencyKey.__table__.c.id)
            db.execute(stmt)
            db.flush()
        else:
            # Generic fallback (sqlite/tests): check then insert.
            existing = db.scalar(
                select(UserIdempotencyKey).where(
                    and_(
                        UserIdempotencyKey.user_id == user_id,
                        UserIdempotencyKey.scope == scope,
                        UserIdempotencyKey.idempotency_key == key,
                    )
                )
            )
            if existing is None:
                existing = UserIdempotencyKey(
                    user_id=user_id,
                    scope=scope,
                    idempotency_key=key,
                    request_hash=request_hash,
                    request_json=canonical,
                    status="IN_PROGRESS",
                )
                db.add(existing)
                db.flush()

        record = db.scalar(
            select(UserIdempotencyKey).where(
                and_(
                    UserIdempotencyKey.user_id == user_id,
                    UserIdempotencyKey.scope == scope,
                    UserIdempotencyKey.idempotency_key == key,
                )
            )
        )
        if record is None:
            raise HTTPException(status_code=500, detail="IDEMPOTENCY_INTERNAL_ERROR")

        if record.request_hash != request_hash:
            raise HTTPException(status_code=409, detail="IDEMPOTENCY_KEY_REUSE_MISMATCH")

        if record.status == "COMPLETED":
            if not record.response_json:
                raise HTTPException(status_code=500, detail="IDEMPOTENCY_RESPONSE_MISSING")
            try:
                return record, json.loads(record.response_json)
            except Exception as exc:
                raise HTTPException(status_code=500, detail="IDEMPOTENCY_RESPONSE_INVALID") from exc

        if record.status == "IN_PROGRESS":
            return record, None

        # FAILED or unknown status: force client to use a new key.
        raise HTTPException(status_code=409, detail="IDEMPOTENCY_INVALID_STATE")

    @staticmethod
    def complete(db: Session, *, record: UserIdempotencyKey, response_payload: dict[str, Any]) -> None:
        record.status = "COMPLETED"
        record.response_json = IdempotencyService._canonical_json(response_payload)
        db.add(record)
        db.flush()
