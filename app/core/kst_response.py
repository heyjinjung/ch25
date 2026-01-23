"""KST-aware JSON response utilities."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.schemas.base import to_kst_iso


class KstJSONResponse(JSONResponse):
    """JSONResponse that serializes all datetimes to KST (+09:00)."""

    def render(self, content: Any) -> bytes:
        encoded = jsonable_encoder(content, custom_encoder={datetime: to_kst_iso})
        return super().render(encoded)
