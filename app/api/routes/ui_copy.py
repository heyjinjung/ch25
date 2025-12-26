"""Public UI copy endpoints.

Thin wrappers around app_ui_config for stable, purpose-named APIs.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.ui_copy import Ticket0ResolutionCopy
from app.services.ui_config_service import UiConfigService

router = APIRouter(prefix="/api", tags=["ui-copy"])

_TICKET0_KEYS = [
    # New canonical key used by admin endpoint
    "ticket0_resolution_copy",
    # Legacy key (kept for backward compatibility)
    "ticket_zero",
]

_DEFAULT = Ticket0ResolutionCopy(
    title="티켓이 0이에요",
    body="체험 티켓을 받거나, 외부 충전 확인 후 금고 잠금이 해금됩니다.",
    primary_cta_label="씨씨카지노 바로가기",
    secondary_cta_label="실장 텔레 문의",
)


def _coerce_ticket0(value: object | None) -> Ticket0ResolutionCopy:
    if not isinstance(value, dict):
        return _DEFAULT

    title = value.get("title") if isinstance(value.get("title"), str) else _DEFAULT.title
    body = value.get("body") if isinstance(value.get("body"), str) else _DEFAULT.body
    primary = (
        value.get("primary_cta_label")
        if isinstance(value.get("primary_cta_label"), str)
        else _DEFAULT.primary_cta_label
    )
    secondary = (
        value.get("secondary_cta_label")
        if isinstance(value.get("secondary_cta_label"), str)
        else _DEFAULT.secondary_cta_label
    )

    return Ticket0ResolutionCopy(
        title=title,
        body=body,
        primary_cta_label=primary,
        secondary_cta_label=secondary,
    )


@router.get("/ui-copy/ticket0", response_model=Ticket0ResolutionCopy)
def get_ticket0_copy(db: Session = Depends(get_db)) -> Ticket0ResolutionCopy:
    for key in _TICKET0_KEYS:
        row = UiConfigService.get(db, key)
        if row is not None:
            return _coerce_ticket0(row.value_json)
    return _DEFAULT
