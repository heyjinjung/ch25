import pytest
import re

# Naming Pattern: {BRAND}_GIFTICON_{AMOUNT}
GIFTICON_PATTERN = r"^[A-Z]+_GIFTICON_[0-9]+$"

def test_gifticon_naming_convention():
    standard_brands = ["STARBUCKS", "CHICKEN", "PIZZA", "GOOGLE", "BURGERKING"]
    
    # Valid examples
    valid_names = [
        "STARBUCKS_GIFTICON_5000",
        "CHICKEN_GIFTICON_10000",
        "PIZZA_GIFTICON_20000",
        "GOOGLE_GIFTICON_5000"
    ]
    
    for name in valid_names:
        assert re.match(GIFTICON_PATTERN, name), f"Failed pattern for {name}"
        brand = name.split("_")[0]
        assert brand in standard_brands
        amount = int(name.split("_")[-1])
        assert amount > 0

def test_gifticon_invalid_naming():
    invalid_names = [
        "starbucks_gifticon_5000", # Lowercase
        "STARBUCKS_GIFT_5000",     # Wrong keyword
        "CHICKEN_GIFTICON_5k",     # Non-numeric amount
        "PIZZA GIFTICON 10000",    # Spaces
        "GIFTICON_STARBUCKS_5000"  # Wrong order
    ]
    
    for name in invalid_names:
        assert not re.match(GIFTICON_PATTERN, name), f"Should have failed: {name}"
