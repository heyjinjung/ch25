"""Reward scheduling utilities for variable rewards."""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class RewardSchedule:
    reward_amount: int
    decay_factor: float
    frequency_probability: float
    frequency_multiplier: float


class RewardScheduler:
    """Applies variable reward frequency and value decay."""

    def __init__(self, *, r0: float = 0.25, alpha: float = 0.015, beta: float = 0.10) -> None:
        self.r0 = max(0.0, float(r0))
        self.alpha = float(alpha)
        self.beta = max(0.0, float(beta))

    def compute_frequency_probability(self, last_intervention_at: datetime | None, now: datetime) -> float:
        if self.r0 <= 0:
            return 0.0
        if not last_intervention_at:
            return min(1.0, self.r0)

        delta_hours = max(0.0, (now - last_intervention_at).total_seconds() / 3600.0)
        probability = self.r0 * math.exp(self.alpha * delta_hours)
        return min(1.0, max(0.0, probability))

    def compute_decay_factor(self, repeat_count: int) -> float:
        count = max(0, int(repeat_count))
        return 1 / (1 + self.beta * count)

    def schedule(self, *, base_reward: int, repeat_count: int, last_intervention_at: datetime | None, now: datetime) -> RewardSchedule:
        base = max(0, int(base_reward))
        decay = self.compute_decay_factor(repeat_count)
        frequency_probability = self.compute_frequency_probability(last_intervention_at, now)

        frequency_multiplier = 1.0
        if self.r0 > 0:
            frequency_multiplier = min(1.5, max(0.5, frequency_probability / self.r0))

        adjusted = int(round(base * decay * frequency_multiplier))
        return RewardSchedule(
            reward_amount=max(0, adjusted),
            decay_factor=decay,
            frequency_probability=frequency_probability,
            frequency_multiplier=frequency_multiplier,
        )