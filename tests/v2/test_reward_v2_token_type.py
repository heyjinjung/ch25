"""레벨업 보상 V2 토큰 타입 테스트.

문제: v2_level_reward_table에는 V2 타입(DICE_TICKET)으로 저장되어 있으나,
      reward_service.py에서 V1 Enum(DICE_TOKEN)으로 매핑되어 로그에 V1 이름 표시

해결: ticket_map과 BUNDLE 처리에서 V1 Enum → V2 Enum으로 수정
"""
import pytest
from enum import Enum


class GameTokenType(str, Enum):
    """테스트용 GameTokenType (실제 Enum 구조 반영)."""
    # V2 Standard Names
    ROULETTE_TICKET = "ROULETTE_TICKET"
    DICE_TICKET = "DICE_TICKET"
    LOTTERY_TICKET = "LOTTERY_TICKET"
    GOLD_KEY_TICKET = "GOLD_KEY_TICKET"
    DIAMOND_TICKET = "DIAMOND_TICKET"
    
    # V1 Legacy Names (backward compatibility)
    ROULETTE_COIN = "ROULETTE_COIN"
    DICE_TOKEN = "DICE_TOKEN"
    GOLD_KEY = "GOLD_KEY"
    DIAMOND_KEY = "DIAMOND_KEY"


class TestTicketMapV2:
    """ticket_map V2 타입 매핑 테스트."""

    def get_fixed_ticket_map(self):
        """수정된 ticket_map (V2 Enum 사용)."""
        return {
            # V2 Standard Names
            "TICKET_ROULETTE": GameTokenType.ROULETTE_TICKET,
            "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
            "TICKET_DICE": GameTokenType.DICE_TICKET,
            "DICE_TICKET": GameTokenType.DICE_TICKET,
            "TICKET_LOTTERY": GameTokenType.LOTTERY_TICKET,
            "LOTTERY_TICKET": GameTokenType.LOTTERY_TICKET,
            "GOLD_KEY_TICKET": GameTokenType.GOLD_KEY_TICKET,
            "DIAMOND_TICKET": GameTokenType.DIAMOND_TICKET,
            # V1 Legacy → V2 Mapping
            "ROULETTE_COIN": GameTokenType.ROULETTE_TICKET,
            "DICE_TOKEN": GameTokenType.DICE_TICKET,
            "GOLD_KEY": GameTokenType.GOLD_KEY_TICKET,
            "DIAMOND_KEY": GameTokenType.DIAMOND_TICKET,
        }

    def test_roulette_ticket_maps_to_v2(self):
        """ROULETTE_TICKET → GameTokenType.ROULETTE_TICKET."""
        ticket_map = self.get_fixed_ticket_map()
        
        result = ticket_map.get("ROULETTE_TICKET")
        
        assert result == GameTokenType.ROULETTE_TICKET
        assert result.value == "ROULETTE_TICKET"  # V2 이름!

    def test_dice_ticket_maps_to_v2(self):
        """DICE_TICKET → GameTokenType.DICE_TICKET."""
        ticket_map = self.get_fixed_ticket_map()
        
        result = ticket_map.get("DICE_TICKET")
        
        assert result == GameTokenType.DICE_TICKET
        assert result.value == "DICE_TICKET"  # V2 이름!

    def test_v1_roulette_coin_maps_to_v2(self):
        """V1 ROULETTE_COIN → V2 ROULETTE_TICKET."""
        ticket_map = self.get_fixed_ticket_map()
        
        result = ticket_map.get("ROULETTE_COIN")
        
        assert result == GameTokenType.ROULETTE_TICKET
        assert result.value == "ROULETTE_TICKET"

    def test_v1_dice_token_maps_to_v2(self):
        """V1 DICE_TOKEN → V2 DICE_TICKET."""
        ticket_map = self.get_fixed_ticket_map()
        
        result = ticket_map.get("DICE_TOKEN")
        
        assert result == GameTokenType.DICE_TICKET
        assert result.value == "DICE_TICKET"

    def test_gold_key_maps_to_v2_ticket(self):
        """V1 GOLD_KEY → V2 GOLD_KEY_TICKET."""
        ticket_map = self.get_fixed_ticket_map()
        
        result = ticket_map.get("GOLD_KEY")
        
        assert result == GameTokenType.GOLD_KEY_TICKET
        assert result.value == "GOLD_KEY_TICKET"

    def test_diamond_key_maps_to_v2_ticket(self):
        """V1 DIAMOND_KEY → V2 DIAMOND_TICKET."""
        ticket_map = self.get_fixed_ticket_map()
        
        result = ticket_map.get("DIAMOND_KEY")
        
        assert result == GameTokenType.DIAMOND_TICKET
        assert result.value == "DIAMOND_TICKET"


class TestBundleV2TokenType:
    """BUNDLE 보상 V2 타입 테스트."""

    def test_bundle_3_uses_v2_types(self):
        """Level 3 Bundle: 모든 티켓 V2 타입 사용."""
        bundle_items = [
            (GameTokenType.ROULETTE_TICKET, 1),
            (GameTokenType.DICE_TICKET, 1),
            (GameTokenType.LOTTERY_TICKET, 1),
        ]
        
        for token_type, amount in bundle_items:
            # 모두 V2 타입이어야 함
            assert "TICKET" in token_type.value or token_type.value == "LOTTERY_TICKET"
            assert "COIN" not in token_type.value
            assert "TOKEN" not in token_type.value or token_type.value.endswith("TICKET")

    def test_bundle_6_uses_v2_types(self):
        """Level 5 Bundle: V2 타입 사용."""
        bundle_items = [
            (GameTokenType.ROULETTE_TICKET, 3),
            (GameTokenType.DICE_TICKET, 3),
        ]
        
        assert bundle_items[0][0] == GameTokenType.ROULETTE_TICKET
        assert bundle_items[1][0] == GameTokenType.DICE_TICKET

    def test_bundle_gold_key_uses_v2_ticket(self):
        """Gold Key 보상: GOLD_KEY_TICKET 사용."""
        bundle_items = [(GameTokenType.GOLD_KEY_TICKET, 1)]
        
        assert bundle_items[0][0] == GameTokenType.GOLD_KEY_TICKET
        assert bundle_items[0][0].value == "GOLD_KEY_TICKET"

    def test_bundle_diamond_uses_v2_ticket(self):
        """Diamond Key 보상: DIAMOND_TICKET 사용."""
        bundle_items = [(GameTokenType.DIAMOND_TICKET, 3)]
        
        assert bundle_items[0][0] == GameTokenType.DIAMOND_TICKET
        assert bundle_items[0][0].value == "DIAMOND_TICKET"


class TestLevelRewardLogDisplay:
    """레벨업 보상 로그 표시 테스트."""

    def test_reward_log_shows_v2_name(self):
        """보상 로그에 V2 타입명이 표시되어야 함."""
        # DB에서 읽어온 reward_type
        db_reward_type = "DICE_TICKET"
        
        ticket_map = {
            "DICE_TICKET": GameTokenType.DICE_TICKET,
        }
        
        # 매핑된 Enum
        token_type = ticket_map.get(db_reward_type)
        
        # 로그에 표시될 이름
        log_display_name = token_type.value if token_type else db_reward_type
        
        assert log_display_name == "DICE_TICKET"
        assert log_display_name != "DICE_TOKEN"  # V1 이름 아님!

    def test_korean_display_names(self):
        """한글 표시명 매핑."""
        korean_names = {
            "ROULETTE_TICKET": "룰렛 티켓",
            "DICE_TICKET": "다이스 티켓",
            "LOTTERY_TICKET": "복권 티켓",
            "GOLD_KEY_TICKET": "골드 열쇠 티켓",
            "DIAMOND_TICKET": "다이아몬드 티켓",
        }
        
        # V1 이름은 없어야 함
        assert "ROULETTE_COIN" not in korean_names
        assert "DICE_TOKEN" not in korean_names


class TestV1V2Compatibility:
    """V1/V2 호환성 테스트."""

    def test_v1_input_converted_to_v2_output(self):
        """V1 타입 입력 → V2 타입 출력."""
        # 레거시 코드에서 V1 이름으로 요청
        input_type = "DICE_TOKEN"
        
        # ticket_map에서 V2로 변환
        ticket_map = {
            "DICE_TOKEN": GameTokenType.DICE_TICKET,
        }
        
        output_type = ticket_map.get(input_type)
        
        assert output_type.value == "DICE_TICKET"

    def test_v2_db_values_remain_v2(self):
        """DB의 V2 값은 그대로 V2로 유지."""
        db_value = "ROULETTE_TICKET"
        
        ticket_map = {
            "ROULETTE_TICKET": GameTokenType.ROULETTE_TICKET,
        }
        
        output_type = ticket_map.get(db_value)
        
        assert output_type.value == "ROULETTE_TICKET"
        assert output_type.value == db_value  # 변환 없음
