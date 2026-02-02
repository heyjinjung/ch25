import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import V2AttendanceStreakModal from "./V2AttendanceStreakModal";
import type { V2StreakRule } from "../../api/missionApi";

const baseRules: V2StreakRule[] = [
  {
    day: 1,
    enabled: true,
    grants: [{ kind: "WALLET", token_type: "ROULETTE_TICKET", amount: 1 }],
  },
  {
    day: 2,
    enabled: true,
    grants: [{ kind: "WALLET", token_type: "DICE_TICKET", amount: 1 }],
  },
  {
    day: 3,
    enabled: true,
    grants: [{ kind: "INVENTORY", item_type: "DIAMOND", amount: 1 }],
  },
];

describe("V2AttendanceStreakModal", () => {
  it("renders claim CTA when claimable", async () => {
    const onClose = vi.fn();
    const onClaim = vi.fn().mockResolvedValue(true);

    render(
      <V2AttendanceStreakModal
        onClose={onClose}
        onClaim={onClaim}
        currentStreak={3}
        claimableDay={3}
        rules={baseRules}
      />,
    );

    const claimButton = screen.getByRole("button", {
      name: "🎁 오늘의 보상받기",
    });
    fireEvent.click(claimButton);

    await waitFor(() => expect(onClaim).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("renders return message when not claimable", () => {
    const onClose = vi.fn();

    render(
      <V2AttendanceStreakModal
        onClose={onClose}
        currentStreak={2}
        claimableDay={null}
        rules={baseRules}
      />,
    );

    expect(
      screen.getByRole("button", { name: "내일 다시 만나요!" }),
    ).toBeInTheDocument();
  });

  it("renders play CTA when streak is zero", () => {
    const onClose = vi.fn();

    render(
      <V2AttendanceStreakModal
        onClose={onClose}
        currentStreak={0}
        claimableDay={null}
        rules={baseRules}
      />,
    );

    expect(
      screen.getByRole("button", { name: "게임하고 보상받기 🎮" }),
    ).toBeInTheDocument();
  });
});
