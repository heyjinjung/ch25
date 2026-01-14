import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchRewardTypes } from "../api/adminRewardTypesApi";
import {
  adjustAdminUserInventory,
  adjustAdminUserInventoryByIdentifier,
  fetchAdminUserInventory,
  fetchAdminUserInventoryByIdentifier
} from "../api/adminInventoryApi";

interface UserInventoryModalProps {
  memberId: number | string;
  isOpen: boolean;
  onClose: () => void;
  nickname?: string;
}

type ItemOption = { value: string; label: string };

const UserInventoryModal: React.FC<UserInventoryModalProps> = ({ memberId, isOpen, onClose, nickname }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"items" | "adjust">("items");
  const [itemTypeMode, setItemTypeMode] = useState<"select" | "custom">("select");
  const [itemType, setItemType] = useState("");
  const [delta, setDelta] = useState<number>(0);
  const [note, setNote] = useState("");

  const numericId = typeof memberId === "number" ? memberId : Number(memberId);
  const isNumericId = Number.isFinite(numericId);
  const identifier = String(memberId ?? "").trim();

  const invQuery = useQuery({
    queryKey: ["user-inventory", memberId],
    queryFn: async () => {
      if (isNumericId) return fetchAdminUserInventory(numericId, 50);
      return fetchAdminUserInventoryByIdentifier(identifier, 50);
    },
    enabled: isOpen,
  });

  const rewardTypesQuery = useQuery({
    queryKey: ["admin", "reward-types"],
    queryFn: fetchRewardTypes,
    enabled: isOpen,
  });

  const rewardTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    (rewardTypesQuery.data ?? []).forEach((rt) => {
      map[rt.key] = rt.display_name;
    });
    return map;
  }, [rewardTypesQuery.data]);

  const ownedItemOptions = useMemo<ItemOption[]>(() => {
    const items = invQuery.data?.items ?? [];
    return items
      .map((item) => ({
        value: item.item_type,
        label: rewardTypeMap[item.item_type] ?? item.item_type,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [invQuery.data?.items, rewardTypeMap]);

  const ownedItemKeys = useMemo(() => new Set(ownedItemOptions.map((o) => o.value)), [ownedItemOptions]);

  const rewardItemOptions = useMemo<ItemOption[]>(() => {
    return (rewardTypesQuery.data ?? [])
      .filter((rt) => !ownedItemKeys.has(rt.key))
      .map((rt) => ({
        value: rt.key,
        label: rt.display_name || rt.key,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [ownedItemKeys, rewardTypesQuery.data]);

  useEffect(() => {
    if (itemType || itemTypeMode === "custom") return;
    const first = ownedItemOptions[0] ?? rewardItemOptions[0];
    if (first) setItemType(first.value);
  }, [itemType, itemTypeMode, ownedItemOptions, rewardItemOptions]);

  const adjustMutation = useMutation({
    mutationFn: async (vars: { type: string; delta: number; note: string }) => {
      const payload = { item_type: vars.type, delta: vars.delta, note: vars.note };
      if (isNumericId) return adjustAdminUserInventory(numericId, payload);
      return adjustAdminUserInventoryByIdentifier(identifier, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-inventory", memberId] });
      alert("인벤토리 조정이 완료되었습니다.");
      setDelta(0);
      setNote("");
      setActiveTab("items");
    },
    onError: (err: any) => {
      alert(`조정 실패: ${err.message}`);
    }
  });

  if (!isOpen) return null;

  const formatItemType = (type: string) => rewardTypeMap[type] ?? type;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="admin-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-admin-glow border-admin-brand/20">

        {/* Header */}
        <div className="p-6 border-b border-admin-border flex items-center justify-between bg-admin-sidebar/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-admin-brand/20 text-admin-brand">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-admin-subtitle text-admin-text-primary">회원 인벤토리 관리</h2>
              <p className="text-admin-meta text-admin-text-muted">{nickname || memberId} 회원의 보유 아이템 제어</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-hover rounded-lg transition-colors"
            aria-label="닫기"
            title="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-4 border-b border-admin-border bg-admin-sidebar/30">
          <button
            onClick={() => setActiveTab("items")}
            className={`px-4 py-2 text-admin-meta font-bold border-b-2 transition-all ${activeTab === "items" ? "border-admin-brand text-admin-brand" : "border-transparent text-admin-text-muted hover:text-admin-text-secondary"}`}
          >
            보유 현황 및 이력
          </button>
          <button
            onClick={() => setActiveTab("adjust")}
            className={`px-4 py-2 text-admin-meta font-bold border-b-2 transition-all ${activeTab === "adjust" ? "border-admin-brand text-admin-brand" : "border-transparent text-admin-text-muted hover:text-admin-text-secondary"}`}
          >
            수량 조정 (Grant/Consume)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-admin-bg/30">
          {invQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-admin-text-muted gap-3">
              <Loader2 size={32} className="animate-spin text-admin-brand" />
              <p className="text-admin-meta">인벤토리 데이터를 불러오는 중입니다...</p>
            </div>
          ) : invQuery.isError ? (
            <div className="py-20 text-center text-admin-danger">
              인벤토리 조회에 실패했습니다.
            </div>
          ) : activeTab === "items" ? (
            <div className="space-y-8">
              {/* Items List */}
              <div className="space-y-3">
                <h3 className="text-admin-meta font-bold text-admin-text-secondary uppercase tracking-wider px-1">현재 보유 아이템</h3>
                <div className="grid grid-cols-2 gap-3">
                  {invQuery.data?.items?.length ? (
                    invQuery.data?.items?.map((item: any) => (
                      <div key={item.item_type} className="p-4 rounded-xl bg-admin-sidebar/40 border border-admin-border flex items-center justify-between group hover:border-admin-brand/30 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-admin-bg border border-admin-border flex items-center justify-center text-admin-brand group-hover:scale-110 transition-transform">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="text-admin-meta font-bold text-admin-text-primary">{formatItemType(item.item_type)}</p>
                            {rewardTypeMap[item.item_type] && (
                              <p className="text-[10px] text-admin-text-muted font-mono">{item.item_type}</p>
                            )}
                            <p className="text-[10px] text-admin-text-muted">
                              최근 업데이트: {new Date(item.updated_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                            </p>
                          </div>
                        </div>
                        <p className="text-admin-subtitle font-black text-admin-brand">{item.quantity}</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 py-8 text-center border-2 border-dashed border-admin-border rounded-xl opacity-40">
                      <p className="text-admin-meta">보유 중인 아이템이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ledger History */}
              <div className="space-y-3">
                <h3 className="text-admin-meta font-bold text-admin-text-secondary uppercase tracking-wider px-1">최근 변동 이력</h3>
                <div className="space-y-2">
                  {invQuery.data?.ledger?.length ? (
                    invQuery.data.ledger.map((log: any) => (
                      <div key={log.id} className="p-3 rounded-lg bg-admin-sidebar/30 border border-admin-border/50 flex items-center justify-between text-admin-meta">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${log.change_amount > 0 ? "bg-admin-accent glow-admin" : "bg-admin-danger"}`} />
                          <span className="font-bold text-admin-text-primary w-20">{formatItemType(log.item_type)}</span>
                          <span className={`font-mono font-bold ${log.change_amount > 0 ? "text-admin-accent" : "text-admin-danger"}`}>
                            {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                          </span>
                          <span className="text-admin-text-muted truncate max-w-[200px] border-l border-admin-border pl-3 ml-1">
                            {log.reason || "-"}
                          </span>
                        </div>
                        <span className="text-[10px] text-admin-text-muted font-mono">
                          {new Date(log.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed border-admin-border rounded-xl opacity-40">
                      <p className="text-admin-meta">변동 이력이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Adjust Tab */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="admin-label">아이템 코드</label>
                  <select
                    value={itemTypeMode === "custom" ? "__CUSTOM__" : itemType}
                    onChange={(e) => {
                      if (e.target.value === "__CUSTOM__") {
                        setItemTypeMode("custom");
                        setItemType("");
                        return;
                      }
                      setItemTypeMode("select");
                      setItemType(e.target.value);
                    }}
                    className="admin-input w-full"
                    aria-label="아이템 코드 선택"
                  >
                    <option value="" disabled>
                      아이템 선택
                    </option>
                    {ownedItemOptions.length > 0 && (
                      <optgroup label="보유 아이템">
                        {ownedItemOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {rewardItemOptions.length > 0 && (
                      <optgroup label="전체 아이템">
                        {rewardItemOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__CUSTOM__">직접 입력</option>
                  </select>
                  {itemTypeMode === "custom" && (
                    <input
                      type="text"
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value.toUpperCase())}
                      className="admin-input w-full font-mono"
                      placeholder="e.g. DIAMOND, TICKET_S1"
                    />
                  )}
                  {rewardTypesQuery.isError && (
                    <p className="text-[11px] text-admin-danger">아이템 목록을 불러오지 못했습니다. 직접 입력을 사용해 주세요.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="admin-label">변동 수량 (Delta)</label>
                  <input
                    type="number"
                    value={delta}
                    onChange={(e) => setDelta(Number(e.target.value))}
                    className="admin-input w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="admin-label">조정 메모 (운영 기록용)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full h-24 bg-admin-sidebar/50 border border-admin-border rounded-admin-lg p-4 text-admin-text-primary focus:ring-2 focus:ring-admin-brand/40 outline-none resize-none placeholder:text-admin-text-muted"
                  placeholder="CS 대응 사유 등을 입력하세요."
                />
              </div>

              <div className="p-4 rounded-xl bg-admin-warning/5 border border-admin-warning/20 flex items-start gap-3">
                <AlertTriangle size={18} className="text-admin-warning mt-0.5" />
                <div className="text-admin-meta text-admin-text-secondary leading-relaxed">
                  <p className="font-bold text-admin-warning mb-1">인벤토리 직접 조정 주의사항</p>
                  DIAMOND와 같은 핵심 재화나 시즌 한정 아이템 조정 시, 반드시 사전에 승인된 워크플로우를 따라주세요. 모든 조정 내역은 운영 트랜잭션 전적에 기록됩니다.
                </div>
              </div>
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
          {activeTab === "adjust" && (
            <button
              onClick={() => {
                if (!itemType.trim()) return alert("아이템 코드를 입력해주세요.");
                if (delta === 0) return alert("변동 수량을 입력해주세요.");
                adjustMutation.mutate({ type: itemType.trim(), delta, note: note.trim() });
              }}
              disabled={adjustMutation.isPending}
              className="btn-admin-primary min-w-[120px]"
            >
              {adjustMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  인벤토리 업데이트
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserInventoryModal;
