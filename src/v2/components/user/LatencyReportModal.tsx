/**
 * LatencyReportModal - 지연 입금 신고 모달
 *
 * SoT Policy:
 * - Trust First: 유저를 먼저 믿고 즉시 선지급
 * - Provisional Reward: 룰렛 티켓 5장
 * - Rate Limit: 시간당 최대 3회
 * - Clawback: 반려 시 원금 + 당첨금 전액 회수
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  Gift,
  Loader2,
  CheckCircle,
  X,
  Calendar,
  DollarSign,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { v2Client } from "../../api/client";

// ==================== Types ====================

interface SubmitEvidenceResponse {
  success: boolean;
  message: string;
  evidence_id: number;
  reward_granted: Record<string, number>;
}

interface LatencyPolicy {
  provisional_reward: {
    type: string;
    amount: number;
  };
  rate_limit: {
    max_per_hour: number;
  };
  warnings: string[];
}

interface LatencyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==================== API Functions ====================

const submitEvidence = async (data: {
  amount: number;
  deposit_date: string;
  deposit_time: string;
}): Promise<SubmitEvidenceResponse> => {
  const response = await v2Client.post<SubmitEvidenceResponse>(
    "/api/v2/user/economy/latency/evidence",
    data,
  );
  return response.data;
};

// fetchPolicy is available for future use when displaying policy info
const _fetchPolicy = async (): Promise<LatencyPolicy> => {
  const response = await v2Client.get<LatencyPolicy>(
    "/api/v2/user/economy/latency/policy",
  );
  return response.data;
};
void _fetchPolicy; // Suppress unused warning

// ==================== Component ====================

export default function LatencyReportModal({
  isOpen,
  onClose,
}: LatencyReportModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [amount, setAmount] = useState("");
  const [depositDate, setDepositDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [depositTime, setDepositTime] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Result state
  const [result, setResult] = useState<SubmitEvidenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutation
  const submitMutation = useMutation({
    mutationFn: submitEvidence,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["user-wallet"] });
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      setError(detail || "신고 접수 중 오류가 발생했습니다.");
    },
  });

  const handleSubmit = () => {
    if (!amount || !depositDate || !depositTime || !agreed) return;

    setError(null);
    submitMutation.mutate({
      amount: parseInt(amount, 10),
      deposit_date: depositDate,
      deposit_time: depositTime,
    });
  };

  const handleClose = () => {
    setAmount("");
    setDepositTime("");
    setAgreed(false);
    setResult(null);
    setError(null);
    onClose();
  };

  const isValid =
    amount &&
    parseInt(amount, 10) >= 1000 &&
    depositDate &&
    depositTime &&
    agreed;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl italic font-black">
            <Clock className="w-5 h-5 text-amber-400" />
            입금반영이 늦나요?
          </DialogTitle>
          <DialogDescription className="text-zinc-400 leading-relaxed">
            기다리게 해서 죄송합니다!<br/>
            <span className="text-lime-400 font-black">룰렛 티켓 3장</span>을
            미리 선물해 드릴게요!
          </DialogDescription>
        </DialogHeader>

        {/* Success View */}
        {result ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-white italic">
                소중한 의견 감사합니다!
              </h3>
              <p className="text-sm text-zinc-400">정상적으로 접수되었어요. {result.message}</p>
            </div>

            {/* Reward Display */}
            <div className="bg-lime-500/10 border border-lime-500/30 rounded-lg p-4 flex items-center gap-3">
              <Gift className="w-6 h-6 text-lime-400" />
              <div>
                <p className="text-sm font-black text-lime-300">선물 지급 완료!</p>
                <p className="text-xs text-zinc-400">
                  룰렛 티켓 {result.reward_granted?.ROULETTE_TICKET || 5}장
                </p>
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-zinc-700 hover:bg-zinc-600"
            >
              확인했습니다!
            </Button>
          </div>
        ) : (
          /* Form View */
          <div className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <X className="w-4 h-4 text-red-400 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                입금 금액 (원)
              </label>
              <Input
                type="number"
                placeholder="예: 50000"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAmount(e.target.value)
                }
                className="bg-zinc-800 border-zinc-700"
                min={1000}
              />
              {amount && parseInt(amount, 10) < 1000 && (
                <p className="text-xs text-red-400">
                  최소 1,000원 이상 입력해주세요.
                </p>
              )}
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                입금일
              </label>
              <Input
                type="date"
                value={depositDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDepositDate(e.target.value)
                }
                className="bg-zinc-800 border-zinc-700"
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Time Input */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                입금 시간 (대략)
              </label>
              <Input
                type="time"
                value={depositTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDepositTime(e.target.value)
                }
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Warning Box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-200 space-y-1">
                  <p className="font-black text-amber-200 italic">꼭 읽어주세요!</p>
                  <ul className="list-disc list-inside text-amber-300/80 space-y-0.5">
                    <li>선지급된 티켓이 우선 사용된 것으로 간주됩니다.</li>
                    <li>허위 신고 시 선지급 재화 + 당첨금 전액 회수</li>
                    <li>잔액 부족 시 마이너스 잔액(부채) 처리</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Agreement Checkbox */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAgreed(e.target.checked)
                }
                className="mt-1 rounded border-zinc-600 bg-zinc-800 text-lime-500 focus:ring-lime-500"
              />
              <span className="text-xs text-zinc-400">
                위 내용을 모두 확인했으며, 허위 신고가 아님을 약속합니다.
              </span>
            </label>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-zinc-700"
              >
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || submitMutation.isPending}
                className="bg-lime-600 hover:bg-lime-700 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    처리 중...
                  </>
                ) : (
                  "신고 접수"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
