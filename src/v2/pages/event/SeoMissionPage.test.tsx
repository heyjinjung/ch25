
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SeoMissionPage from "./SeoMissionPage";
import * as useSeoMissionHooks from "../../hooks/useSeoMission";

// Mock hooks
vi.mock("../../hooks/useSeoMission", () => ({
  useSeoMissionStatus: vi.fn(),
  useClaimSeoCode: vi.fn(),
}));

// Mock useNavigate
const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

// Mock useToast
const addToastMock = vi.fn();
vi.mock("../../components/common/ToastProvider", () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

// Mock haptic
vi.mock("../../utils/haptic", () => ({
  triggerHaptic: vi.fn(),
  triggerNotification: vi.fn(),
}));

describe("SeoMissionPage", () => {
    // Default mock setup
    const mockMutateAsync = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default status: not claimed
        (useSeoMissionHooks.useSeoMissionStatus as any).mockReturnValue({
            data: { has_claimed_today: false, reward_amount: null }
        });

        // Default mutation
        (useSeoMissionHooks.useClaimSeoCode as any).mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: false
        });
    });

    it("renders page title and steps correctly", () => {
        render(<SeoMissionPage />);
        
        expect(screen.getByText("구글 검색")).toBeInTheDocument();
        expect(screen.getByText("랜딩 페이지 방문")).toBeInTheDocument();
        expect(screen.getByText("코드 입력")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/코드 입력/i)).toBeInTheDocument();
    });

    it("handles code input and submission success", async () => {
        // Setup success response
        mockMutateAsync.mockResolvedValue({
            success: true,
            reward_amount: 3000,
            message: "3,000P 지급 완료!"
        });

        render(<SeoMissionPage />);
        
        const input = screen.getByPlaceholderText(/코드 입력/i);
        const submitButton = screen.getByText("보상 받기");

        // Enter code
        fireEvent.change(input, { target: { value: "SEO123456" } });
        expect(input).toHaveValue("SEO123456");

        // Submit
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith("SEO123456");
        });

        // Verify toast and feedback
        await waitFor(() => {
            expect(addToastMock).toHaveBeenCalledWith(expect.objectContaining({
                type: "success",
                message: expect.stringContaining("지급 완료")
            }));
            expect(screen.getByText("3,000P 지급 완료!")).toBeInTheDocument();
        });
    });

    it("handles error response correctly (INVALID_CODE)", async () => {
        // Setup error response
        const error = {
            response: {
                data: { detail: "INVALID_CODE" }
            }
        };
        mockMutateAsync.mockRejectedValue(error);

        render(<SeoMissionPage />);
        
        const input = screen.getByPlaceholderText(/코드 입력/i);
        const submitButton = screen.getByText("보상 받기");

        fireEvent.change(input, { target: { value: "WRONG_CODE" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("유효하지 않은 코드입니다")).toBeInTheDocument();
        });
    });

    it("handles error response correctly (ALREADY_CLAIMED)", async () => {
        // Setup error response
        const error = {
            response: {
                data: { detail: "ALREADY_CLAIMED" }
            }
        };
        mockMutateAsync.mockRejectedValue(error);

        render(<SeoMissionPage />);
        
        const input = screen.getByPlaceholderText(/코드 입력/i);
        const submitButton = screen.getByText("보상 받기");

        fireEvent.change(input, { target: { value: "USED_CODE" } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("이미 사용한 코드입니다")).toBeInTheDocument();
        });
    });

    it("renders completed state correctly", () => {
        // Setup completed status
        (useSeoMissionHooks.useSeoMissionStatus as any).mockReturnValue({
            data: { has_claimed_today: true, reward_amount: 5000 }
        });

        render(<SeoMissionPage />);

        expect(screen.getByText("오늘 미션 완료!")).toBeInTheDocument();
        expect(screen.getByText("5,000P 지급됨")).toBeInTheDocument();
        
        const input = screen.getByPlaceholderText(/코드 입력/i);
        expect(input).toBeDisabled();
        
        const button = screen.getByText("완료");
        expect(button).toBeDisabled();
    });
});
