import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis import asyncio as aioredis

from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


async def _forward_redis_to_ws(websocket: WebSocket, pubsub) -> None:
    """Read from Redis PubSub and forward to WebSocket."""
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except Exception as e:
        logger.debug(f"Stop forwarding Redis to WS: {e}")
        raise


async def _receive_ws_messages(websocket: WebSocket) -> None:
    """Keep the connection alive and handle client messages (e.g. Ping)."""
    try:
        while True:
            data = await websocket.receive_text()
            if data == "PING":
                await websocket.send_text("PONG")
    except WebSocketDisconnect:
        raise
    except Exception as e:
        logger.error(f"Error receiving from WS: {e}")
        raise


@router.websocket("/api/ws/events")
async def websocket_events(websocket: WebSocket):
    await websocket.accept()
    settings = get_settings()

    if not settings.redis_url:
        logger.error("Redis URL not configured")
        await websocket.close(code=1011, reason="Server Config Error")
        return

    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("ch25_events")

    try:
        consumer_task = asyncio.create_task(_forward_redis_to_ws(websocket, pubsub))
        producer_task = asyncio.create_task(_receive_ws_messages(websocket))

        done, pending = await asyncio.wait(
            [consumer_task, producer_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()

    except Exception:
        # Normal disconnect or connection error, just cleanup
        pass
    finally:
        try:
            await pubsub.unsubscribe("ch25_events")
            await pubsub.close()
            await redis_client.close()
        except Exception:
            pass
