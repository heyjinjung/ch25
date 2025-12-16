import React from "react";
import { describe, expect, it, vi, beforeEach, Mock } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock FeatureGate to pass children through without today-feature dependency.
vi.mock("../components/feature/FeatureGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Roulete hooks mocks
vi.mock("../hooks/useRoulette", () => ({
  useRouletteStatus: vi.fn(),
  usePlayRoulette: vi.fn(),
}));

vi.mock("../hooks/useDice", () => ({
  useDiceStatus: vi.fn(),
  usePlayDice: vi.fn(),
}));

vi.mock("../hooks/useLottery", () => ({
  useLotteryStatus: vi.fn(),
  usePlayLottery: vi.fn(),
}));

import RoulettePage from "../pages/RoulettePage";
import DicePage from "../pages/DicePage";
import LotteryPage from "../pages/LotteryPage";
import { useRouletteStatus, usePlayRoulette } from "../hooks/useRoulette";
import { useDiceStatus, usePlayDice } from "../hooks/useDice";
import { useLotteryStatus, usePlayLottery } from "../hooks/useLottery";

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe("Game pages error/unlimited handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Roulette shows unlimited when remaining_spins=0 and stays enabled", async () => {
    (useRouletteStatus as unknown as Mock).mockReturnValue({
      data: { remaining_spins: 0, segments: [], feature_type: "ROULETTE" },
      isLoading: false,
      isError: false,
      error: null,
    });
    (usePlayRoulette as unknown as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
    });

    renderWithRouter(<RoulettePage />);

    expect(screen.getByText(/남은 횟수: 무제한/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /룰렛 돌리기/ })).not.toBeDisabled();
  });

  it("Roulette maps NO_FEATURE_TODAY error to friendly message", () => {
    (useRouletteStatus as unknown as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { response: { data: { error: { code: "NO_FEATURE_TODAY" } } } },
    });
    (usePlayRoulette as unknown as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      data: undefined,
    });

    renderWithRouter(<RoulettePage />);
    expect(screen.getByText(/오늘 활성화된 이벤트가 없습니다/)).toBeInTheDocument();
  });

  it("Dice shows unlimited when remaining_plays=0 and maps INVALID_FEATURE_SCHEDULE", () => {
    (useDiceStatus as unknown as Mock).mockReturnValue({
      data: { remaining_plays: 0, feature_type: "DICE" },
      isLoading: false,
      isError: false,
      error: null,
    });
    (usePlayDice as unknown as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: { response: { data: { error: { code: "INVALID_FEATURE_SCHEDULE" } } } },
      data: undefined,
    });

    renderWithRouter(<DicePage />);
    expect(screen.getByText(/남은 횟수: 무제한/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /주사위 던지기/ })).not.toBeDisabled();
    expect(screen.getByText(/이벤트 스케줄이 잘못되었습니다/)).toBeInTheDocument();
  });

  it("Lottery shows unlimited when remaining_plays=0 and maps FEATURE_DISABLED", () => {
    (useLotteryStatus as unknown as Mock).mockReturnValue({
      data: { remaining_plays: 0, prizes: [], feature_type: "LOTTERY" },
      isLoading: false,
      isError: false,
      error: null,
    });
    (usePlayLottery as unknown as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
      error: { response: { data: { error: { code: "FEATURE_DISABLED" } } } },
      data: undefined,
    });

    renderWithRouter(<LotteryPage />);
    expect(screen.getByText(/남은 횟수: 무제한/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /복권 뽑기/ })).not.toBeDisabled();
    expect(screen.getByText(/이벤트가 비활성화되었습니다/)).toBeInTheDocument();
  });
});
