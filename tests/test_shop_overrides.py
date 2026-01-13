"""
Test module for admin shop overrides Pydantic validation (MEDIUM-006 fix).

Tests:
- SYS-002: Shop override sets correctly
- SYS-003: Invalid override format returns 400
"""
import pytest
from pydantic import ValidationError

from app.schemas.shop_overrides import ShopProductPatch, ShopOverridesPayload


class TestShopProductPatch:
    """Tests for ShopProductPatch schema."""

    def test_valid_patch_title_only(self):
        """Should accept a valid title patch."""
        patch = ShopProductPatch(title="New Title")
        assert patch.title == "New Title"
        assert patch.cost_amount is None
        assert patch.is_active is None

    def test_valid_patch_full(self):
        """Should accept a full valid patch."""
        patch = ShopProductPatch(title="Premium Key", cost_amount=50, is_active=True)
        assert patch.title == "Premium Key"
        assert patch.cost_amount == 50
        assert patch.is_active is True

    def test_invalid_cost_amount_zero(self):
        """Should reject cost_amount of 0."""
        with pytest.raises(ValidationError) as exc_info:
            ShopProductPatch(cost_amount=0)
        assert "cost_amount" in str(exc_info.value)

    def test_invalid_cost_amount_negative(self):
        """Should reject negative cost_amount."""
        with pytest.raises(ValidationError) as exc_info:
            ShopProductPatch(cost_amount=-5)
        assert "cost_amount" in str(exc_info.value)

    def test_title_whitespace_stripped(self):
        """Should strip whitespace from title."""
        patch = ShopProductPatch(title="  Padded Title  ")
        assert patch.title == "Padded Title"

    def test_empty_title_rejected(self):
        """Should reject empty title."""
        with pytest.raises(ValidationError):
            ShopProductPatch(title="")


class TestShopOverridesPayload:
    """Tests for ShopOverridesPayload schema."""

    def test_valid_payload(self):
        """Should parse a valid payload."""
        payload = ShopOverridesPayload(products={
            "PROD_GOLD_KEY_1": ShopProductPatch(title="Premium Gold", cost_amount=100)
        })
        assert "PROD_GOLD_KEY_1" in payload.products
        assert payload.products["PROD_GOLD_KEY_1"].cost_amount == 100

    def test_empty_payload(self):
        """Should accept an empty payload (reset scenario)."""
        payload = ShopOverridesPayload(products=None)
        assert payload.products is None

    def test_nested_validation(self):
        """Should reject invalid nested patches."""
        with pytest.raises(ValidationError):
            ShopOverridesPayload(products={
                "PROD_GOLD_KEY_1": ShopProductPatch(cost_amount=-1)
            })

    def test_model_dump_exclude_none(self):
        """Should exclude None fields when dumped."""
        patch = ShopProductPatch(title="Only Title")
        dumped = patch.model_dump(exclude_none=True)
        assert dumped == {"title": "Only Title"}
        assert "cost_amount" not in dumped
        assert "is_active" not in dumped
