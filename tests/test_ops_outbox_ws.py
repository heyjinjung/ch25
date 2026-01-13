import asyncio
import json
import jwt
import pytest

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.workers import ops_outbox_worker
from app.api.routes import ws_ops
from fastapi.testclient import TestClient
from app.main import app


class _FakeRedis:
    def __init__(self, queue, publish_fail=False, dlq_key="ops:outbox:dlq", stop_event=None):
        self.queue = queue
        self.publish_fail = publish_fail
        self.published = []
        self.dlq = []
        self.dlq_key = dlq_key
        self.stop_event = stop_event

    async def brpop(self, key, timeout=1):
        if self.queue:
            return key, self.queue.pop()
        await asyncio.sleep(0)
        return None

    async def publish(self, channel, payload):
        if self.publish_fail:
            raise RuntimeError("publish_fail")
        self.published.append((channel, payload))
        if self.stop_event:
            self.stop_event.set()

    async def lpush(self, key, payload):
        if key == self.dlq_key:
            self.dlq.append(payload)
            if self.stop_event:
                self.stop_event.set()
        else:
            self.queue.insert(0, payload)

    async def close(self):
        return


class _FakePubSub:
    def __init__(self, message):
        self.message = message

    async def subscribe(self, channel):
        return

    async def listen(self):
        yield {"type": "message", "data": json.dumps(self.message)}

    async def unsubscribe(self, channel):
        return

    async def close(self):
        return


@pytest.mark.anyio
async def test_ops_outbox_worker_success(monkeypatch):
    payload = {"action_code": "OPS_ROUTINE_CHECKED", "ref_id": "r1"}
    queue = [json.dumps(payload)]
    stop_event = asyncio.Event()
    fake_client = _FakeRedis(queue=queue, publish_fail=False, stop_event=stop_event)

    async def fake_get_client():
        return fake_client

    monkeypatch.setattr(ops_outbox_worker, "_get_redis_client", fake_get_client)
    monkeypatch.setattr(ops_outbox_worker.asyncio, "sleep", lambda *_, **__: asyncio.sleep(0))

    task = asyncio.create_task(ops_outbox_worker.run_ops_outbox_worker(stop_event=stop_event))
    await asyncio.wait_for(stop_event.wait(), timeout=1)
    task.cancel()
    with pytest.raises(Exception):
        await task

    assert fake_client.published


@pytest.mark.anyio
async def test_ops_outbox_worker_dlq(monkeypatch):
    payload = {"action_code": "OPS_ROUTINE_CHECKED", "ref_id": "r2"}
    queue = [json.dumps(payload)]
    stop_event = asyncio.Event()
    fake_client = _FakeRedis(queue=queue, publish_fail=True, stop_event=stop_event)

    async def fake_get_client():
        return fake_client

    monkeypatch.setattr(ops_outbox_worker, "_get_redis_client", fake_get_client)
    monkeypatch.setattr(ops_outbox_worker.asyncio, "sleep", lambda *_, **__: asyncio.sleep(0))
    settings = get_settings()
    settings.ops_outbox_max_retries = 1

    task = asyncio.create_task(ops_outbox_worker.run_ops_outbox_worker(stop_event=stop_event))
    await asyncio.wait_for(stop_event.wait(), timeout=1)
    task.cancel()
    with pytest.raises(Exception):
        await task

    assert fake_client.dlq  # moved to DLQ after retry failure


def _make_token(role: str | None):
    settings = get_settings()
    payload = {"sub": "1", "typ": "access"}
    if role is not None:
        payload["role"] = role
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def test_ws_auth_success(monkeypatch):
    def fake_subscribe(channel):
        return _FakePubSub({"ok": True})

    monkeypatch.setattr(ws_ops, "_redis_subscribe", fake_subscribe)

    token = _make_token("ADMIN")
    with TestClient(app) as client:
        with client.websocket_connect(
            "/ws/admin/ops/events", headers={"Authorization": f"Bearer {token}"}
        ) as ws:
            message = ws.receive_json()
            assert message == {"ok": True}


def test_ws_auth_forbidden(monkeypatch):
    def fake_subscribe(channel):
        return _FakePubSub({"ok": True})

    monkeypatch.setattr(ws_ops, "_redis_subscribe", fake_subscribe)

    token = _make_token("NONE")
    with TestClient(app) as client:
        with pytest.raises(Exception):
            with client.websocket_connect(
                "/ws/admin/ops/events", headers={"Authorization": f"Bearer {token}"}
            ):
                pass


def test_ws_auth_unauthorized(monkeypatch):
    def fake_subscribe(channel):
        return _FakePubSub({"ok": True})

    monkeypatch.setattr(ws_ops, "_redis_subscribe", fake_subscribe)

    with TestClient(app) as client:
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/admin/ops/events"):
                pass
