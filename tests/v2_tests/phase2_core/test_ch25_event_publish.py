import json

import pytest

from app.services.ch25_event_service import Ch25EventService


class DummyClient:
    def __init__(self):
        self.xadd_calls = []

    def xadd(self, stream, payload):
        # emulate redis behavior: accept string values only
        if not isinstance(payload.get("data"), str):
            raise TypeError("data must be a string")
        self.xadd_calls.append((stream, payload))
        return "123-0"


def test_publish_internal_game_result_serializes(monkeypatch):
    service = Ch25EventService()

    dummy = DummyClient()

    monkeypatch.setattr(Ch25EventService, "get_redis_client", classmethod(lambda cls: dummy))

    payload = {"user_id": 42, "timestamp": 1700000000, "game_type": "DICE", "bet_amount": 1000}

    ok = service.publish_internal_game_result(payload)

    assert ok is True
    assert len(dummy.xadd_calls) == 1

    stream, stored = dummy.xadd_calls[0]
    assert stream == "stream:raw_logs"
    assert stored.get("event_type") == "INTERNAL_GAME_RESULT"

    # data should be JSON string and parse back to original structure
    data_str = stored.get("data")
    assert isinstance(data_str, str)
    loaded = json.loads(data_str)
    assert loaded["user_id"] == 42


def test_normalize_stream_payload_various_types():
    from app.services.ch25_event_service import normalize_stream_payload

    payload = {
        "a": {"nested": 1},
        "b": [1, 2, 3],
        "c": 42,
        "d": 3.14,
        "e": None,
        "f": "already string",
        "g": b"bytes val",
    }

    normalized = normalize_stream_payload(payload)

    assert isinstance(normalized["a"], str)
    assert isinstance(normalized["b"], str)
    assert normalized["c"] == "42"
    assert normalized["d"] == "3.14"
    assert normalized["e"] == ""
    assert normalized["f"] == "already string"
    assert isinstance(normalized["g"], str)


def test_admin_import_normalizes(monkeypatch):
    from starlette.datastructures import UploadFile
    from io import BytesIO
    from app.api.admin.routes.admin_ch25_raw_logs import import_raw_logs

    class DummyClient:
        def __init__(self):
            self.xadd_calls = []

        def xadd(self, stream, payload):
            # ensure all values are strings
            for v in payload.values():
                assert isinstance(v, str)
            self.xadd_calls.append((stream, payload))
            return "ok"

    dummy = DummyClient()
    monkeypatch.setattr("app.services.ch25_event_service.Ch25EventService.get_redis_client", classmethod(lambda cls: dummy))

    content = "line1\nline2\n"
    upload = UploadFile(file=BytesIO(content.encode()), filename="test.txt")

    res = import_raw_logs(file=upload, _=1)
    assert res["chunks"] == 1
    assert len(dummy.xadd_calls) == 1
