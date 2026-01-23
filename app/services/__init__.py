"""Service package exports.

Avoid eager imports to prevent circular dependencies during app startup/tests.
"""
from importlib import import_module

__all__ = [
    "DiceService",
    "FeatureService",
    "GamePlayContext",
    "apply_season_pass_stamp",
    "enforce_daily_limit",
    "log_game_play",
    "LotteryService",
    "RankingService",
    "RewardService",
    "RouletteService",
    "SeasonPassService",
]


def __getattr__(name: str):
    mapping = {
        "DiceService": ("app.services.dice_service", "DiceService"),
        "FeatureService": ("app.services.feature_service", "FeatureService"),
        "GamePlayContext": ("app.services.game_common", "GamePlayContext"),
        "apply_season_pass_stamp": ("app.services.game_common", "apply_season_pass_stamp"),
        "enforce_daily_limit": ("app.services.game_common", "enforce_daily_limit"),
        "log_game_play": ("app.services.game_common", "log_game_play"),
        "LotteryService": ("app.services.lottery_service", "LotteryService"),
        "RankingService": ("app.services.ranking_service", "RankingService"),
        "RewardService": ("app.services.reward_service", "RewardService"),
        "RouletteService": ("app.services.roulette_service", "RouletteService"),
        "SeasonPassService": ("app.services.season_pass_service", "SeasonPassService"),
    }
    if name not in mapping:
        raise AttributeError(f"module 'app.services' has no attribute '{name}'")
    module_name, attr_name = mapping[name]
    module = import_module(module_name)
    return getattr(module, attr_name)
