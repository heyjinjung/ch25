import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import V2AppHeader from "./V2AppHeader";
import * as authStore from "../../../auth/authStore";

// Mock hooks
vi.mock("../../../auth/authStore");
vi.mock("../../hooks/useV2Mission", () => ({
  useV2Missions: vi.fn(() => ({
    data: { missions: [], completedCount: 0 },
    isLoading: false,
    refetch: vi.fn(),
  })),
}));
vi.mock("../../hooks/useModalVisibility", () => ({
  useModalVisibility: vi.fn(() => ({
    attendance_streak_enabled: true,
  })),
}));

let queryClient: QueryClient;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("V2AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("Segment Emoji Display", () => {
    it("should display whale emoji for WHALE segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 1,
          cc_id: "test",
          nickname: "TestWhale",
          segment: "WHALE",
          level: 10,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/🐋/)).toBeDefined();
      expect(screen.getByText("TestWhale")).toBeDefined();
      expect(screen.getByText(/LEVEL.*10/)).toBeDefined();
    });

    it("should display crown emoji for VIP segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 2,
          cc_id: "test2",
          nickname: "TestVIP",
          segment: "VIP",
          level: 5,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/👑/)).toBeDefined();
      expect(screen.getByText("TestVIP")).toBeDefined();
      expect(screen.getByText(/LEVEL.*5/)).toBeDefined();
    });

    it("should display seedling emoji for NEW segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 3,
          cc_id: "test3",
          nickname: "NewUser",
          segment: "NEW",
          level: 1,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/🌱/)).toBeDefined();
      expect(screen.getByText("NewUser")).toBeDefined();
      expect(screen.getByText(/LEVEL.*1/)).toBeDefined();
    });

    it("should display warning emoji for AT_RISK segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 4,
          cc_id: "test4",
          nickname: "RiskUser",
          segment: "AT_RISK",
          level: 3,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/⚠️/)).toBeDefined();
      expect(screen.getByText("RiskUser")).toBeDefined();
    });

    it("should display star emoji for COMMON segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 5,
          cc_id: "test5",
          nickname: "CommonUser",
          segment: "COMMON",
          level: 2,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/⭐/)).toBeDefined();
      expect(screen.getByText("CommonUser")).toBeDefined();
    });

    it("should default to star emoji for unknown segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 6,
          cc_id: "test6",
          nickname: "UnknownUser",
          segment: "UNKNOWN",
          level: 1,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/⭐/)).toBeDefined();
    });
  });

  describe("Profile Glow Effect", () => {
    it("should apply purple glow for WHALE segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 1,
          cc_id: "test",
          nickname: "TestWhale",
          segment: "WHALE",
          level: 10,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      const { container } = render(<V2AppHeader />, { wrapper: Wrapper });

      const profileDiv = container.querySelector('[class*="border-purple"]');
      expect(profileDiv).not.toBeNull();
    });

    it("should apply amber glow for VIP segment", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 2,
          cc_id: "test2",
          nickname: "TestVIP",
          segment: "VIP",
          level: 5,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      const { container } = render(<V2AppHeader />, { wrapper: Wrapper });

      const profileDiv = container.querySelector('[class*="border-amber"]');
      expect(profileDiv).not.toBeNull();
    });

    it("should apply lime glow for other segments", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 3,
          cc_id: "test3",
          nickname: "NewUser",
          segment: "NEW",
          level: 1,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      const { container } = render(<V2AppHeader />, { wrapper: Wrapper });

      const profileDiv = container.querySelector('[class*="border-cc-lime"]');
      expect(profileDiv).not.toBeNull();
    });
  });

  describe("Level Display", () => {
    it("should display actual user level", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 1,
          cc_id: "test",
          nickname: "TestUser",
          segment: "COMMON",
          level: 15,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/LEVEL.*15/)).toBeDefined();
    });

    it("should default to LEVEL 1 when level is undefined", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: {
          id: 1,
          cc_id: "test",
          nickname: "TestUser",
          segment: "COMMON",
          level: undefined,
          avatarUrl: undefined,
        },
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText(/LEVEL.*1/)).toBeDefined();
    });
  });

  describe("Guest User", () => {
    it("should display Guest when no user", () => {
      vi.mocked(authStore.useAuth).mockReturnValue({
        user: null,
        token: null,
        login: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
      });

      render(<V2AppHeader />, { wrapper: Wrapper });

      expect(screen.getByText("Guest")).toBeDefined();
      expect(screen.getByText(/LEVEL.*1/)).toBeDefined();
      expect(screen.getByText(/⭐/)).toBeDefined();
    });
  });
});
