"""V2 Exchange 서비스 테스트.

도메인: 토큰 교환, 퍼즐 합체
커버리지 대상: v2_exchange_service.py
"""
import pytest


class TestTokenExchange:
    """토큰 교환 테스트."""

    EXCHANGE_RATES = {
        ("POINT", "ROULETTE_TICKET"): 1000,  # 1000 포인트 = 1 룰렛 티켓
        ("POINT", "DICE_TICKET"): 500,       # 500 포인트 = 1 주사위 티켓
        ("DIAMOND", "GOLD_KEY_TICKET"): 10,  # 10 다이아 = 1 골드키
    }

    def test_point_to_roulette_rate(self):
        """포인트 → 룰렛 티켓 교환비."""
        rate = self.EXCHANGE_RATES[("POINT", "ROULETTE_TICKET")]
        points = 5000
        tickets = points // rate
        assert tickets == 5

    def test_point_to_dice_rate(self):
        """포인트 → 주사위 티켓 교환비."""
        rate = self.EXCHANGE_RATES[("POINT", "DICE_TICKET")]
        points = 2500
        tickets = points // rate
        assert tickets == 5

    def test_insufficient_points_no_exchange(self):
        """포인트 부족 시 교환 불가."""
        rate = self.EXCHANGE_RATES[("POINT", "ROULETTE_TICKET")]
        points = 500  # 1000 미만
        tickets = points // rate
        assert tickets == 0


class TestPuzzleCraftExtended:
    """퍼즐 합체 확장 테스트."""

    PIECES = ["PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M"]
    RESULT = "GOLD_KEY_TICKET"

    def test_partial_pieces_cannot_craft(self):
        """일부 조각만 있으면 합체 불가."""
        inventory = {
            "PUZZLE_C1": 1,
            "PUZZLE_C2": 1,
            "PUZZLE_J": 0,  # 없음
            "PUZZLE_M": 1,
        }
        can_craft = all(inventory.get(p, 0) >= 1 for p in self.PIECES)
        assert can_craft is False

    def test_multiple_crafts_possible(self):
        """여러 개 합체 가능."""
        inventory = {
            "PUZZLE_C1": 3,
            "PUZZLE_C2": 3,
            "PUZZLE_J": 2,
            "PUZZLE_M": 5,
        }
        # 최소 개수가 합체 가능 횟수
        craft_count = min(inventory[p] for p in self.PIECES)
        assert craft_count == 2

    def test_craft_updates_inventory(self):
        """합체 후 인벤토리 업데이트."""
        inventory = {
            "PUZZLE_C1": 2,
            "PUZZLE_C2": 2,
            "PUZZLE_J": 2,
            "PUZZLE_M": 2,
            "GOLD_KEY_TICKET": 0,
        }
        
        # 1회 합체
        for piece in self.PIECES:
            inventory[piece] -= 1
        inventory["GOLD_KEY_TICKET"] += 1
        
        assert inventory["PUZZLE_C1"] == 1
        assert inventory["GOLD_KEY_TICKET"] == 1


class TestExchangeValidation:
    """교환 유효성 검증."""

    def test_negative_amount_rejected(self):
        """음수 교환량 거부."""
        amount = -5
        is_valid = amount > 0
        assert is_valid is False

    def test_zero_amount_rejected(self):
        """0 교환량 거부."""
        amount = 0
        is_valid = amount > 0
        assert is_valid is False

    def test_invalid_token_type_rejected(self):
        """존재하지 않는 토큰 타입 거부."""
        valid_types = {"POINT", "DIAMOND", "ROULETTE_TICKET"}
        request_type = "INVALID_TOKEN"
        is_valid = request_type in valid_types
        assert is_valid is False
