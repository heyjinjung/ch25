import React, { useState } from "react";
import {
  Coins,
  History,
  Plus,
  Minus,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "../api/httpClient";

interface UserGameTokenModalProps {
  memberId: number | string;
  isOpen: boolean;
  onClose: () => void;
  nickname?: string;
}

const UserGameTokenModal: React.FC<UserGameTokenModalProps> = ({ memberId, isOpen, onClose, nickname }) => {
  const queryClient = useQueryClient();
  const [tokenType, setTokenType] = useState("GOLD_KEY");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [activeTab, setActiveTab] = useState<"grant" | "history">("grant");

  // Fetch Token Ledger (History)
  const ledgerQuery = useQuery({
    queryKey: ["user-token-ledger", memberId],
    queryFn: async () => {
      const { data } = await adminApi.get(`/admin/api/game-tokens/ledger?user_id=${memberId}`);
      return data;
    },
    enabled: isOpen && activeTab === "history",
  });

  // Grant Mutation
  const grantMutation = useMutation({
    mutationFn: async (vars: { type: string; amt: number; rsn: string }) => {
      const { data } = await adminApi.post("/admin/api/game-tokens/grant", {
        user_id: memberId,
        token_type: vars.type,
        amount: vars.amt,
        reason: vars.rsn || "ADMIN_GRANT"
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-token-ledger", memberId] });
      alert("토큰 지급이 완료되었습니다.");
      setAmount(0);
      setReason("");
    },
    onError: (err: any) => {
      alert(`지급 실패: ${err.message}`);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="admin-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-admin-glow border-admin-brand/20">

        {/* Header */}
        <div className="p-6 border-b border-admin-border flex items-center justify-between bg-admin-sidebar/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-admin-brand/20 text-admin-brand">
              <Coins size={24} />
            </div>
            <div>
              <h2 className="text-admin-subtitle text-admin-text-primary">게임 코드/토큰 제어</h2>
              <p className="text-admin-meta text-admin-text-muted">{nickname || memberId} 회원 자산 관리</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            title="닫기"
            className="p-2 text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-hover rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-4 border-b border-admin-border bg-admin-sidebar/30">
          <button
            onClick={() => setActiveTab("grant")}
            className={`px-4 py-2 text-admin-meta font-bold border-b-2 transition-all ${activeTab === "grant" ? "border-admin-brand text-admin-brand" : "border-transparent text-admin-text-muted hover:text-admin-text-secondary"}`}
          >
            지급/회수
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-admin-meta font-bold border-b-2 transition-all ${activeTab === "history" ? "border-admin-brand text-admin-brand" : "border-transparent text-admin-text-muted hover:text-admin-text-secondary"}`}
          >
            변경 이력
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {activeTab === "grant" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor={`user-game-token-type-${memberId}`} className="admin-label">토큰 유형</label>
                  <select
                    id={`user-game-token-type-${memberId}`}
                    value={tokenType}
                    onChange={(e) => setTokenType(e.target.value)}
                    aria-label="토큰 유형"
                    title="토큰 유형"
                    className="w-full h-11 bg-admin-sidebar/50 border border-admin-border rounded-admin-lg px-4 text-admin-text-primary focus:ring-2 focus:ring-admin-brand/40 outline-none appearance-none"
                  >
                    <option value="GOLD_KEY">GOLD_KEY (황금 열쇠)</option>
                    <option value="DIAMOND">DIAMOND (재화)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="admin-label">수량</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="admin-input w-full"
                    placeholder="지급할 수량"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="admin-label">지급 사유</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-24 bg-admin-sidebar/50 border border-admin-border rounded-admin-lg p-4 text-admin-text-primary focus:ring-2 focus:ring-admin-brand/40 outline-none resize-none placeholder:text-admin-text-muted"
                  placeholder="지급 사유를 입력하세요 (예: 이벤트 보상, 버그 보상 등)"
                />
              </div>

              <div className="p-4 rounded-xl bg-admin-brand/5 border border-admin-brand/10 flex items-start gap-3">
                <AlertCircle size={18} className="text-admin-brand mt-0.5" />
                <p className="text-admin-meta text-admin-text-secondary leading-relaxed">
                  토큰을 지급하면 즉시 회원의 지갑/인벤토리에 반영되며, 운영 트랜잭션 전적에 영구히 기록됩니다. 신중하게 작업해 주세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {ledgerQuery.isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-admin-text-muted gap-3">
                  <Loader2 size={32} className="animate-spin text-admin-brand" />
                  <p className="text-admin-meta">이력을 불러오는 중입니다...</p>
                </div>
              ) : ledgerQuery.data?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-admin-text-muted border-2 border-dashed border-admin-border rounded-2xl">
                  <History size={40} className="mb-3 opacity-20" />
                  <p className="text-admin-meta">변경 이력이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ledgerQuery.data?.map((log: any) => (
                    <div key={log.id} className="p-4 rounded-xl bg-admin-sidebar/40 border border-admin-border flex items-center justify-between hover:bg-admin-hover transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${log.delta > 0 ? "bg-admin-accent/10 text-admin-accent" : "bg-admin-danger/10 text-admin-danger"}`}>
                          {log.delta > 0 ? <Plus size={16} /> : <Minus size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-admin-body font-bold text-admin-text-primary">{log.token_type}</span>
                            <span className={`text-admin-body font-black ${log.delta > 0 ? "text-admin-accent" : "text-admin-danger"}`}>
                              {log.delta > 0 ? `+${log.delta}` : log.delta}
                            </span>
                          </div>
                          <p className="text-admin-meta text-admin-text-muted leading-tight mt-0.5">
                            {log.reason || "사유 미입력"} {log.label ? `쨌 ${log.label}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-admin-meta text-admin-text-primary mb-1">잔액: {log.balance_after}</p>
                        <p className="text-[11px] text-admin-text-muted font-mono">
                          {new Date(log.created_at).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-admin-border bg-admin-sidebar/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-admin-secondary text-admin-meta px-4 border-none"
          >
            닫기
          </button>
          {activeTab === "grant" && (
            <button
              onClick={() => {
                if (amount === 0) return alert("수량을 입력하세요.");
                grantMutation.mutate({ type: tokenType, amt: amount, rsn: reason });
              }}
              disabled={grantMutation.isPending}
              className="btn-admin-primary min-w-[120px]"
            >
              {grantMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  지급 확정
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserGameTokenModal;
