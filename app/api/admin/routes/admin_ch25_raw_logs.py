"""Admin endpoints for ch25 raw log ingestion."""
from __future__ import annotations

import json
import logging
import time
from typing import Iterable

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_current_admin_id
from app.services.ch25_event_service import Ch25EventService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/api/ch25", tags=["admin-ch25"])


def _chunk_lines(lines: list[str], chunk_size: int = 200) -> Iterable[list[str]]:
    for idx in range(0, len(lines), chunk_size):
        yield lines[idx : idx + chunk_size]


@router.post("/raw-logs/import", status_code=status.HTTP_201_CREATED)
def import_raw_logs(
    file: UploadFile = File(...),
    _: int = Depends(get_current_admin_id),
):
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RAW_LOG_EMPTY")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RAW_LOG_ENCODING_ERROR")

    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RAW_LOG_NO_LINES")

    client = Ch25EventService.get_redis_client()
    if not client:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="REDIS_UNAVAILABLE")

    total_lines = len(lines)
    pushed_chunks = 0
    now_ts = int(time.time())

    for chunk in _chunk_lines(lines):
        payload = {
            "source": "admin_upload",
            "raw_lines": json.dumps(chunk, ensure_ascii=False),
            "timestamp": now_ts,
        }
        if file.filename:
            payload["file_name"] = file.filename
        try:
            client.xadd("stream:raw_logs", payload)
            pushed_chunks += 1
        except Exception as exc:  # noqa: BLE001
            logger.error("raw_log_ingest_failed", exc_info=exc, extra={"file": file.filename})
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="RAW_LOG_INGEST_FAILED")

    return {
        "total_lines": total_lines,
        "chunks": pushed_chunks,
        "source": "admin_upload",
        "file_name": file.filename,
    }