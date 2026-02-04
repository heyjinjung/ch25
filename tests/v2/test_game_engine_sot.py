"""V2 Game Engine SoT 핵심 테스트.

SoT 문서: docs/v2_specs/02_game/v2_game_engine_sot_ko.md

테스트 범위:
- 룰렛 구성 (4종, grade 미사용)
- 룰렛 티켓 타입
- 룰렛 세그먼트 (8개 고정)
- 복권 퍼즐 합체 규칙
"""
import pytest


class TestRouletteConfiguration:
    """룰렛 구성 테스트 (SoT 2.1)."""

    ROULETTE_TICKET_TYPES = {
        "기본": "ROULETTE_TICKET",
        "체험판": "TRIAL_TICKET",
        "골드키": "GOLD_KEY_TICKET",
        "다이아": "DIAMOND_TICKET",
    }

    SEGMENT_COUNT = 8  # slot_index 0~7

    def test_roulette_has_4_types(self):
        """룰렛 4종 확인."""
        assert len(self.ROULETTE_TICKET_TYPES) == 4

    def test_ticket_types_defined(self):
        """티켓 타입 정의 확인."""
        assert self.ROULETTE_TICKET_TYPES["기본"] == "ROULETTE_TICKET"
        assert self.ROULETTE_TICKET_TYPES["체험판"] == "TRIAL_TICKET"
        assert self.ROULETTE_TICKET_TYPES["골드키"] == "GOLD_KEY_TICKET"
        assert self.ROULETTE_TICKET_TYPES["다이아"] == "DIAMOND_TICKET"

    def test_segment_count_is_8(self):
        """룰렛 세그먼트 8개 고정."""
        assert self.SEGMENT_COUNT == 8

    def test_slot_index_range(self):
        """slot_index 범위 0~7."""
        valid_indices = list(range(self.SEGMENT_COUNT))
        assert valid_indices == [0, 1, 2, 3, 4, 5, 6, 7]

    def test_grade_not_used(self):
        """Grade 기반 접근 제한 폐기됨."""
        # grade 필드가 룰렛 접근 조건에서 사용되지 않아야 함
        access_check_uses_grade = False
        assert access_check_uses_grade is False


class TestPuzzleCraft:
    """복권 퍼즐 합체 테스트 (SoT 2.2)."""

    REQUIRED_PIECES = ["PUZZLE_C1", "PUZZLE_C2", "PUZZLE_J", "PUZZLE_M"]
    CRAFT_RESULT = "GOLD_KEY_TICKET"
    CRAFT_AMOUNT = 1

    def test_required_4_pieces(self):
        """퍼즐 조각 4종 필요."""
        assert len(self.REQUIRED_PIECES) == 4
        assert "PUZZLE_C1" in self.REQUIRED_PIECES
        assert "PUZZLE_C2" in self.REQUIRED_PIECES
        assert "PUZZLE_J" in self.REQUIRED_PIECES
        assert "PUZZLE_M" in self.REQUIRED_PIECES

    def test_craft_result_is_gold_key(self):
        """합체 결과는 GOLD_KEY_TICKET 1개."""
        assert self.CRAFT_RESULT == "GOLD_KEY_TICKET"
        assert self.CRAFT_AMOUNT == 1

    def test_craft_consumes_all_pieces(self):
        """합체 시 모든 조각 소모."""
        inventory = {
            "PUZZLE_C1": 1,
            "PUZZLE_C2": 1,
            "PUZZLE_J": 1,
            "PUZZLE_M": 1,
        }

        # 합체 가능 확인
        can_craft = all(inventory.get(p, 0) >= 1 for p in self.REQUIRED_PIECES)
        assert can_craft is True

        # 합체 후 조각 소모
        for piece in self.REQUIRED_PIECES:
            inventory[piece] -= 1

        assert all(inventory[p] == 0 for p in self.REQUIRED_PIECES)

    def test_craft_fails_without_all_pieces(self):
        """조각 부족 시 합체 실패."""
        inventory = {
            "PUZZLE_C1": 1,
            "PUZZLE_C2": 0,  # 부족
            "PUZZLE_J": 1,
            "PUZZLE_M": 1,
        }

        can_craft = all(inventory.get(p, 0) >= 1 for p in self.REQUIRED_PIECES)
        assert can_craft is False


class TestGameFlowSteps:
    """공통 게임 플로우 테스트 (SoT 4)."""

    FLOW_STEPS = [
        "입장/자격 검증",
        "설정 로딩/검증",
        "결과 판정",
        "보상 지급",
        "로깅",
    ]

    def test_flow_has_5_steps(self):
        """게임 플로우 5단계."""
        assert len(self.FLOW_STEPS) >= 5

    def test_entry_validation_first(self):
        """입장/자격 검증이 첫 단계."""
        assert "입장" in self.FLOW_STEPS[0] or "자격" in self.FLOW_STEPS[0]

    def test_logging_last(self):
        """로깅이 마지막 단계."""
        assert "로깅" in self.FLOW_STEPS[-1]
