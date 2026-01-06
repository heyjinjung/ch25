import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Minus, RotateCcw } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import UserIdentifierResolveConfirm from "./UserIdentifierResolveConfirm";
import {
  adjustAdminUserInventory,
  adjustAdminUserInventoryByIdentifier,
  fetchAdminUserInventory,
  fetchAdminUserInventoryByIdentifier,
} from "../api/adminInventoryApi";

type AdminUser = {
  id: number;
  external_id?: string | null;
  telegram_id?: number | null;
  telegram_username?: string | null;
  nickname?: string | null;
};

type Props = {
  user: AdminUser;
  onClose: () => void;
};

const UserInventoryModal: React.FC<Props> = ({ user, onClose }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const deriveDefaultIdentifier = () => {
    if (user.telegram_username) {
      const u = String(user.telegram_username).trim();
      if (!u) return "";
      return u.startsWith("@") ? u : `@${u}`;
    }
    if (user.external_id) return String(user.external_id);
    return String(user.id);
  };

  const [identifierInput, setIdentifierInput] = useState<string>(deriveDefaultIdentifier());
  const [identifierApplied, setIdentifierApplied] = useState<string>(deriveDefaultIdentifier());

  const [itemType, setItemType] = useState("DIAMOND");
  const [delta, setDelta] = useState(1);
  const [note, setNote] = useState("");

  const invQuery = useQuery({
    queryKey: ["admin", "inventory", identifierApplied || user.id],
    queryFn: () => (identifierApplied ? fetchAdminUserInventoryByIdentifier(identifierApplied, 80) : fetchAdminUserInventory(user.id, 80)),
    enabled: !!user.id || !!identifierApplied,
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: { item_type: string; delta: number; note?: string }) =>
      identifierApplied ? adjustAdminUserInventoryByIdentifier(identifierApplied, payload) : adjustAdminUserInventory(user.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory", identifierApplied || user.id] });
      addToast("인벤토리가 반영되었습니다.", "success");
    },
    onError: (err: any) => {
      addToast(`실패: ${err.response?.data?.detail || err.message}`, "error");
    },
  });

  const items = invQuery.data?.items ?? [];
  const ledger = invQuery.data?.ledger ?? [];

  const knownItemTypes = useMemo(() => {
    const set = new Set<string>([
      // Basic currency
      "DIAMOND",
      // Keys (direct use)
      "GOLD_KEY",
      "DIAMOND_KEY",
      // Tickets (direct use)
      "TICKET_ROULETTE",
      "TICKET_DICE",
      "TICKET_LOTTERY",
      // Vouchers (exchange items)
      "VOUCHER_GOLD_KEY_1",
      "VOUCHER_DIAMOND_KEY_1",
      "VOUCHER_ROULETTE_COIN_1",
      // Gifticons
      "CC_COIN_GIFTICON",
      "GIFTICON_BAEMIN",
    ]);
    for (const it of items) set.add(it.item_type);
    return Array.from(set.values()).sort();
  }, [items]);

  const headerUser = invQuery.data?.user ?? {
    id: user.id,
    external_id: user.external_id ?? null,
    telegram_id: user.telegram_id ?? null,
    telegram_username: user.telegram_username ?? null,
    nickname: user.nickname ?? null,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#333333] bg-[#111111] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-[#333333] p-4 sm:p-6 bg-[#1A1A1A]">
          <div>
            <h3 className="text-xl font-bold text-[#91F402]">User Inventory: {headerUser.nickname || headerUser.external_id || String(headerUser.id)}</h3>
            <p className="text-xs text-gray-400 mt-1">ID: {headerUser.id}{headerUser.telegram_username ? ` · TG: @${String(headerUser.telegram_username).replace(/^@/, "")}` : headerUser.telegram_id ? ` · TG ID: ${headerUser.telegram_id}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-[#333333] hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[#222222] bg-[#0B0B0B] p-4 sm:p-6">
          <UserIdentifierResolveConfirm
            label="Identifier로 바로 조회"
            value={identifierInput}
            onChange={setIdentifierInput}
            placeholder="예: @username / tg_833... / 닉네임 / external_id / 숫자"
            confirmLabel="조회"
            disabled={invQuery.isFetching}
            onCleared={() => setIdentifierApplied("")}
            onConfirmed={({ identifier }) => setIdentifierApplied(identifier)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[#333333] bg-[#0B0B0B] p-4">
            <div className="text-sm font-bold text-[#91F402] mb-3">현재 보유 아이템</div>
            {invQuery.isLoading ? (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            ) : (
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="text-xs text-gray-500">아이템이 없습니다.</div>
                ) : (
                  items
                    .slice()
                    .sort((a, b) => a.item_type.localeCompare(b.item_type))
                    .map((i) => (
                      <div key={i.item_type} className="flex items-center justify-between rounded-lg border border-[#222222] bg-[#111111] px-3 py-2">
                        <span className="font-mono text-xs text-gray-300">{i.item_type}</span>
                        <span className="text-sm font-bold text-white">{i.quantity}</span>
                      </div>
                    ))
                )}
              </div>
            )}

            <div className="mt-5 border-t border-[#222222] pt-4">
              <div className="text-sm font-bold text-[#91F402] mb-3">CS 조정(지급/차감)</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-400">
                  item_type
                  <select
                    className="mt-1 w-full rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-sm text-white"
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                  >
                    {knownItemTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs text-gray-400">
                  수량
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-sm text-white"
                    value={delta}
                    onChange={(e) => setDelta(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>

                <label className="text-xs text-gray-400 sm:col-span-2">
                  note (선택)
                  <input
                    className="mt-1 w-full rounded-md border border-[#333333] bg-[#111111] px-3 py-2 text-sm text-white"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="예: CS 보정 / 이벤트 지급"
                  />
                </label>

                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="button"
                    disabled={adjustMutation.isPending}
                    onClick={() => adjustMutation.mutate({ item_type: itemType, delta: Math.abs(delta), note })}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#2D6B3B] text-white px-4 py-2 rounded-lg font-bold hover:brightness-110 disabled:opacity-60"
                  >
                    <Plus size={16} /> 지급
                  </button>
                  <button
                    type="button"
                    disabled={adjustMutation.isPending}
                    onClick={() => adjustMutation.mutate({ item_type: itemType, delta: -Math.abs(delta), note })}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#7A2E2E] text-white px-4 py-2 rounded-lg font-bold hover:brightness-110 disabled:opacity-60"
                  >
                    <Minus size={16} /> 차감
                  </button>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">사유는 ledger에 ADMIN_ADJUST로 기록됩니다.</div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#333333] bg-[#0B0B0B] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-[#91F402]">최근 ledger</div>
              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "inventory", user.id] })}
                className="text-xs text-gray-400 hover:text-white"
              >
                새로고침
              </button>
            </div>

            {invQuery.isLoading ? (
              <div className="py-10 text-center text-gray-500">Loading…</div>
            ) : ledger.length === 0 ? (
              <div className="text-xs text-gray-500">ledger 기록이 없습니다.</div>
            ) : (
              <div className="space-y-2">
                {ledger.slice(0, 60).map((l) => (
                  <div key={l.id} className="rounded-lg border border-[#222222] bg-[#111111] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-400 font-mono">#{l.id} · {l.item_type}</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {l.change_amount > 0 ? "+" : ""}
                          {l.change_amount} → {l.balance_after}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">{l.reason}{l.related_id ? ` · ${l.related_id}` : ""}</div>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-[#333333] bg-[#1A1A1A] px-2 py-1 text-xs text-gray-200 hover:bg-[#2C2C2E]"
                        onClick={() =>
                          adjustMutation.mutate({
                            item_type: l.item_type,
                            delta: -l.change_amount,
                            note: `revert ledger#${l.id}`,
                          })
                        }
                        disabled={adjustMutation.isPending}
                        title="이 기록의 반대 방향으로 1회 조정"
                      >
                        <span className="inline-flex items-center gap-1">
                          <RotateCcw size={14} /> 되돌리기
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInventoryModal;
