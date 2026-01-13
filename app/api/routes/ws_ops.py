"""WebSocket feed for admin ops events."""
from __future__ import annotations

import asyncio
import inspect
import json
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi import status

from app.core.config import get_settings
from app.core.security import decode_access_token

router = APIRouter()
logger = logging.getLogger(__name__)
ROLE_LEVEL = {"OPERATOR": 1, "MANAGER": 2, "ADMIN": 3}


async def _redis_subscribe(channel: str):
    try:
        import redis.asyncio as aioredis
    except ImportError:  # pragma: no cover - optional dep
        logger.warning("redis async not installed; ws feed disabled")
        return None
    settings = get_settings()
    if not settings.redis_url:
        logger.warning("redis_url not configured; ws feed disabled")
        return None
    client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(channel)
    return pubsub


def _extract_role(payload: dict[str, object]) -> str:
    role = payload.get("role")
    roles = payload.get("roles")
    if isinstance(roles, list) and roles:
        role = roles[0]
    if isinstance(role, list) and role:
        role = role[0]
    return str(role).upper() if role else "ADMIN"


def _has_role(current: str, required: str = "OPERATOR") -> bool:
    return ROLE_LEVEL.get(current, 0) >= ROLE_LEVEL.get(required, 0)


def _extract_token(websocket: WebSocket, token_query: Optional[str]) -> str:
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    if token_query:
        return token_query.strip()
    raise WebSocketDisconnect(code=4401)


def _authenticate(websocket: WebSocket, token_query: Optional[str]) -> tuple[int, str]:
    token = _extract_token(websocket, token_query)
    try:
        payload = decode_access_token(token)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ws_auth_decode_failed", exc_info=exc)
        raise WebSocketDisconnect(code=4401) from exc

    sub = payload.get("sub")
    try:
        admin_id = int(sub)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ws_auth_sub_invalid", exc_info=exc)
        raise WebSocketDisconnect(code=4401) from exc

    role = _extract_role(payload)
    if not _has_role(role, "OPERATOR"):
        raise WebSocketDisconnect(code=status.WS_1008_POLICY_VIOLATION)
    return admin_id, role


@router.websocket("/ws/admin/ops/events")
async def ops_events_ws(websocket: WebSocket, token: Optional[str] = Query(default=None)):
    _authenticate(websocket, token)
    await websocket.accept()
    maybe_pubsub = _redis_subscribe("ops:ws")
    pubsub = await maybe_pubsub if inspect.isawaitable(maybe_pubsub) else maybe_pubsub
    if not pubsub:
        await websocket.send_json({"type": "error", "message": "ws feed unavailable"})
        await websocket.close(code=1013)
        return
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            data = message.get("data")
            try:
                payload = json.loads(data)
            except Exception:  # noqa: BLE001
                payload = {"raw": data}
            await websocket.send_json(payload)
    except WebSocketDisconnect:
        logger.info("ops_ws_client_disconnected")
    except Exception as exc:  # noqa: BLE001
        logger.warning("ops_ws_handler_error", exc_info=exc)
    finally:
        try:
            await pubsub.unsubscribe("ops:ws")
        except Exception:
            pass
        try:
            await pubsub.close()
        except Exception:
            pass
        await websocket.close()
