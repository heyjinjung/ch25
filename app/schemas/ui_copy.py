"""Schemas for admin-configurable UI copy wrappers.

This intentionally reuses the existing app_ui_config storage.
"""

from pydantic import Field

from app.schemas.base import KstBaseModel as BaseModel


class Ticket0ResolutionCopy(BaseModel):
    title: str = Field(..., description="Modal title")
    body: str = Field(..., description="Modal body")
    primary_cta_label: str = Field(..., description="Primary CTA button label")
    secondary_cta_label: str = Field(..., description="Secondary CTA button label")


class Ticket0ResolutionCopyUpsertRequest(BaseModel):
    title: str
    body: str
    primary_cta_label: str
    secondary_cta_label: str
