import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[3]


def _read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def _extract_import_lines(content: str) -> str:
    return "\n".join(
        line for line in content.splitlines()
        if line.strip().startswith("from ") or line.strip().startswith("import ")
    )


def test_mission_attendance_v2_only_imports() -> None:
    """Mission/Attendance should not import V1 MissionService/RewardService."""
    mission_service = ROOT / "app" / "v2" / "services" / "mission_service.py"
    content = _read(mission_service)
    imports = _extract_import_lines(content)
    assert "app.services.mission_service" not in imports
    assert "app.services.reward_service" not in imports


def test_lottery_game_v2_only_imports() -> None:
    """Lottery V2 service should not import V1 MissionService/RewardService."""
    lottery_service = ROOT / "app" / "v2" / "services" / "v2_lottery_game_service.py"
    content = _read(lottery_service)
    imports = _extract_import_lines(content)
    assert "app.services.mission_service" not in imports
    assert "app.services.reward_service" not in imports
    assert "app.services.game_wallet_service" not in imports


def test_dice_game_v2_only_imports() -> None:
    """Dice V2 service should not import V1 MissionService/RewardService."""
    dice_service = ROOT / "app" / "v2" / "services" / "v2_dice_game_service.py"
    content = _read(dice_service)
    imports = _extract_import_lines(content)
    assert "app.services.mission_service" not in imports
    assert "app.services.reward_service" not in imports
    assert "app.services.game_wallet_service" not in imports


def test_roulette_game_v2_only_imports() -> None:
    """Roulette V2 service should not import V1 MissionService/RewardService."""
    roulette_service = ROOT / "app" / "v2" / "services" / "v2_roulette_game_service.py"
    content = _read(roulette_service)
    imports = _extract_import_lines(content)
    assert "app.services.mission_service" not in imports
    assert "app.services.reward_service" not in imports
    assert "app.services.game_wallet_service" not in imports


def test_ticket_zero_uses_v2_mission_service() -> None:
    """Ticket Zero pending reward check must use V2MissionService only."""
    routes_file = ROOT / "app" / "v2" / "api" / "routes.py"
    content = _read(routes_file)
    imports = _extract_import_lines(content)
    assert "app.services.mission_service" not in imports
    assert "app.v2.services.mission_service" in imports


def test_team_battle_v1_imports_absent() -> None:
    """Team Battle routes should not import V1 TeamBattleService."""
    routes_file = ROOT / "app" / "v2" / "api" / "routes.py"
    content = _read(routes_file)
    imports = _extract_import_lines(content)
    assert "app.services.team_battle_service" not in imports
    assert "V2TeamBattleService" in content
