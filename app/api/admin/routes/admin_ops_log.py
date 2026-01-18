"""Admin ops log endpoints."""
from datetime import date
import csv
import json
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin_id, get_current_admin_info
from app.schemas.ops_log import (
    OpsDailyLogOut,
    OpsDailyLogUpsert,
    OpsLogCreate,
    OpsLogEntryOut,
    OpsLogCsvImportResponse,
    OpsLogCsvImportError,
)
from app.services.ops_log_service import OpsLogService

router = APIRouter(prefix="/admin/api/ops", tags=["admin-ops-log"])
service = OpsLogService()


@router.get("/daily-log/{log_date}", response_model=OpsDailyLogOut)
def get_daily_log(
    log_date: date,
    db: Session = Depends(get_db),
    admin_id: int = Depends(get_current_admin_id),
):
    _ = admin_id
    daily = service.ensure_daily_log(db, log_date)
    return daily


@router.put("/daily-log/{log_date}", response_model=OpsDailyLogOut)
def upsert_daily_log(
    log_date: date,
    payload: OpsDailyLogUpsert,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, _role = admin_info
    daily = service.ensure_daily_log(db, log_date)

    if payload.theme_title is not None:
        daily.theme_title = payload.theme_title
    if payload.summary_md is not None:
        daily.summary_md = payload.summary_md
    if payload.status is not None:
        daily.status = payload.status

    daily.manager_id = admin_id
    db.add(daily)
    db.commit()
    db.refresh(daily)
    return daily


@router.post("/log-entry", response_model=OpsLogEntryOut, status_code=status.HTTP_201_CREATED)
def create_log_entry(
    payload: OpsLogCreate,
    confirm: bool = False,
    request: Request = None,
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, current_role = admin_info
    required_role = service.required_role(payload.action_code)
    if not service.has_role(current_role.upper(), required_role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN_ROLE_INSUFFICIENT")
    if service.requires_confirm(payload.action_code) and not confirm:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CONFIRM_REQUIRED")
    try:
        entry, created = service.create_log_entry(
            db,
            log_date=payload.date,
            category=payload.category,
            action_code=payload.action_code,
            target_model=payload.target_model,
            target_id=payload.target_id,
            meta_data=payload.meta_data,
            is_automated=payload.is_automated,
            actor_id=admin_id,
            ref_id=payload.ref_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    status_code = status.HTTP_200_OK if not created else status.HTTP_201_CREATED
    event_payload = service.build_event_payload(entry)
    if service.should_enqueue_outbox(entry.action_code):
        service.enqueue_outbox(event_payload)
    if service.should_broadcast_ws(entry.action_code):
        service.broadcast_ws(event_payload)
    body = OpsLogEntryOut.model_validate(entry).model_dump_json()
    return Response(content=body, media_type="application/json", status_code=status_code)


@router.get("/log-entry", response_model=list[OpsLogEntryOut])
def list_log_entries(
    date: date,
    category: str | None = None,
    action_code: str | None = None,
    actor_id: int | None = None,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    entries = service.list_entries(
        db,
        log_date=date,
        category=category,
        action_code=action_code,
        actor_id=actor_id,
    )
    return entries


@router.get("/daily-log/{log_date}/export", response_class=PlainTextResponse)
def export_daily_log(
    log_date: date,
    db: Session = Depends(get_db),
    _: int = Depends(get_current_admin_id),
):
    entries = service.list_entries(db, log_date=log_date)
    export = service.export_daily_log(entries, log_date)
    headers = {"Content-Disposition": f"attachment; filename=\"{export['filename']}\""}
    return PlainTextResponse(export["content_md"], headers=headers)


def _parse_bool(value: str | None) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


@router.post("/import-csv", response_model=OpsLogCsvImportResponse)
def import_ops_log_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin_info: tuple[int, str] = Depends(get_current_admin_info),
):
    admin_id, current_role = admin_info
    content = file.file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV_EMPTY")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV_ENCODING_ERROR")

    reader = csv.DictReader(StringIO(text))
    required = {"date", "category", "action_code", "target_model"}
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV_HEADER_MISSING")
    missing = required - {name.strip() for name in reader.fieldnames}
    if missing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"CSV_MISSING_COLUMNS:{','.join(sorted(missing))}")

    total_rows = 0
    imported = 0
    duplicates = 0
    errors: list[OpsLogCsvImportError] = []

    for idx, row in enumerate(reader, start=2):
        total_rows += 1
        try:
            raw_date = (row.get("date") or "").strip()
            if not raw_date:
                raise ValueError("DATE_REQUIRED")
            log_date = date.fromisoformat(raw_date)
            category = (row.get("category") or "").strip()
            action_code = (row.get("action_code") or "").strip()
            target_model = (row.get("target_model") or "").strip()
            if not category or not action_code or not target_model:
                raise ValueError("REQUIRED_FIELD_MISSING")
            target_id = (row.get("target_id") or "").strip() or None
            ref_id = (row.get("ref_id") or "").strip() or None
            meta_raw = (row.get("meta_data") or "").strip()
            meta_data = json.loads(meta_raw) if meta_raw else {}
            is_automated = _parse_bool(row.get("is_automated"))

            required_role = service.required_role(action_code)
            if not service.has_role(current_role.upper(), required_role):
                raise ValueError("ADMIN_ROLE_INSUFFICIENT")

            entry, created = service.create_log_entry(
                db,
                log_date=log_date,
                category=category,
                action_code=action_code,
                target_model=target_model,
                target_id=target_id,
                meta_data=meta_data,
                is_automated=is_automated,
                actor_id=admin_id,
                ref_id=ref_id,
            )
            if created:
                imported += 1
            else:
                duplicates += 1
        except Exception as exc:  # noqa: BLE001
            errors.append(OpsLogCsvImportError(row_number=idx, reason=str(exc)))

    return OpsLogCsvImportResponse(
        total_rows=total_rows,
        imported=imported,
        duplicates=duplicates,
        failed=len(errors),
        errors=errors,
    )
