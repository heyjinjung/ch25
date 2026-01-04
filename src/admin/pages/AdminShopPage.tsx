import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCw } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";
import {
  AdminShopProduct,
  fetchAdminShopOverrides,
  fetchAdminShopProducts,
  ShopProductsOverrides,
  upsertAdminShopOverrides,
} from "../api/adminShopApi";
import { fetchEconomyStats } from "../api/adminEconomyApi";

type RowState = {
  sku: string;
  title: string;
  cost_amount: number;
  is_active: boolean;
};

const AdminShopPage: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["admin", "shop", "products"],
    queryFn: fetchAdminShopProducts,
  });

  const overridesQuery = useQuery({
    queryKey: ["admin", "shop", "overrides"],
    queryFn: fetchAdminShopOverrides,
  });

  const statsQuery = useQuery({
    queryKey: ["admin", "economy", "stats"],
    queryFn: fetchEconomyStats,
  });

  const initialRows = useMemo(() => {
    const products = productsQuery.data ?? [];
    return new Map<string, RowState>(
      products.map((p) => [
        p.sku,
        {
          sku: p.sku,
          title: p.title,
          cost_amount: Number(p.cost?.amount ?? 0),
          is_active: p.is_active !== false,
        },
      ])
    );
  }, [productsQuery.data]);

  const [rows, setRows] = useState<Map<string, RowState>>(new Map());

  React.useEffect(() => {
    setRows(new Map(initialRows));
  }, [initialRows]);

  const saveMutation = useMutation({
    mutationFn: (value: ShopProductsOverrides) => upsertAdminShopOverrides(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shop", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "shop", "overrides"] });
      addToast("상점 설정이 저장되었습니다.", "success");
    },
    onError: (err: any) => {
      addToast(`저장 실패: ${err.response?.data?.detail || err.message}`, "error");
    },
  });

  const effectiveProducts: AdminShopProduct[] = productsQuery.data ?? [];

  const changedCount = useMemo(() => {
    let count = 0;
    for (const p of effectiveProducts) {
      const r = rows.get(p.sku);
      if (!r) continue;
      const baseTitle = p.title;
      const baseCost = Number(p.cost?.amount ?? 0);
      const baseActive = p.is_active !== false;
      if (r.title !== baseTitle || r.cost_amount !== baseCost || r.is_active !== baseActive) count += 1;
    }
    return count;
  }, [effectiveProducts, rows]);

  const buildOverrides = (): ShopProductsOverrides => {
    const products: Record<string, any> = {};
    for (const p of effectiveProducts) {
      const r = rows.get(p.sku);
      if (!r) continue;
      products[p.sku] = {
        title: r.title,
        cost_amount: r.cost_amount,
        is_active: r.is_active,
      };
    }
    return { products };
  };

  const handleSaveAll = () => {
    saveMutation.mutate(buildOverrides());
  };

  const isLoading = productsQuery.isLoading || overridesQuery.isLoading;
  if (isLoading) return <div className="p-8 text-white">Loading shop settings...</div>;
  if (productsQuery.error) return <div className="p-8 text-red-500">Error loading shop products</div>;

  return (
    <div className="text-white">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#91F402]">🛒 상점 레버</h1>
          <p className="text-gray-400 text-sm mt-1">가격/활성화/타이틀을 배포 없이 조절합니다(UI Config 기반).</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin", "shop", "products"] });
              queryClient.invalidateQueries({ queryKey: ["admin", "economy", "stats"] });
            }}
            className="flex items-center gap-2 bg-[#2C2C2E] text-white px-4 py-2 rounded-lg font-bold hover:brightness-110"
          >
            <RefreshCw size={18} /> 새로고침
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 bg-[#91F402] text-black px-4 py-2 rounded-lg font-bold hover:brightness-110 disabled:opacity-60"
          >
            <Save size={18} /> 전체 저장{changedCount ? ` (${changedCount})` : ""}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#333333] bg-[#111111] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1A1A] text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">상품명</th>
                <th className="px-4 py-3 text-left">가격(DIAMOND)</th>
                <th className="px-4 py-3 text-left">지급</th>
                <th className="px-4 py-3 text-left">활성</th>
              </tr>
            </thead>
            <tbody>
              {/* Group 1: Premium Keys & Others */}
              {effectiveProducts.filter(p => !p.sku.startsWith("PROD_TICKET_")).map((p) => {
                const r = rows.get(p.sku);
                if (!r) return null;
                return (
                  <tr key={p.sku} className="border-t border-[#222222]">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-md border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-white"
                        value={r.title}
                        onChange={(e) =>
                          setRows((prev) => {
                            const next = new Map(prev);
                            next.set(p.sku, { ...r, title: e.target.value });
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        className="w-40 rounded-md border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-white"
                        value={r.cost_amount}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setRows((prev) => {
                            const next = new Map(prev);
                            next.set(p.sku, { ...r, cost_amount: Number.isFinite(v) ? v : r.cost_amount });
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <span className="font-mono">{p.grant.item_type}</span> x{p.grant.amount}
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={(e) =>
                            setRows((prev) => {
                              const next = new Map(prev);
                              next.set(p.sku, { ...r, is_active: e.target.checked });
                              return next;
                            })
                          }
                        />
                        <span className={r.is_active ? "text-[#91F402]" : "text-gray-500"}>
                          {r.is_active ? "ON" : "OFF"}
                        </span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 mb-4">
        <h2 className="text-xl font-bold text-[#91F402]">🎟️ 티켓 교환소 (체험 보상)</h2>
        <p className="text-gray-400 text-sm mt-1">다이아로 구매 가능한 일반 게임 티켓 상품입니다.</p>
      </div>

      <div className="rounded-2xl border border-[#333333] bg-[#111111] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1A1A] text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">상품명</th>
                <th className="px-4 py-3 text-left">가격(DIAMOND)</th>
                <th className="px-4 py-3 text-left">지급</th>
                <th className="px-4 py-3 text-left">활성</th>
              </tr>
            </thead>
            <tbody>
              {effectiveProducts.filter(p => p.sku.startsWith("PROD_TICKET_")).map((p) => {
                const r = rows.get(p.sku);
                if (!r) return null;
                return (
                  <tr key={p.sku} className="border-t border-[#222222]">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.sku}</td>
                    <td className="px-4 py-3">
                      <input
                        className="w-full rounded-md border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-white"
                        value={r.title}
                        onChange={(e) =>
                          setRows((prev) => {
                            const next = new Map(prev);
                            next.set(p.sku, { ...r, title: e.target.value });
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        className="w-40 rounded-md border border-[#333333] bg-[#0B0B0B] px-3 py-2 text-sm text-white"
                        value={r.cost_amount}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setRows((prev) => {
                            const next = new Map(prev);
                            next.set(p.sku, { ...r, cost_amount: Number.isFinite(v) ? v : r.cost_amount });
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">
                      <span className="font-mono">{p.grant.item_type}</span> x{p.grant.amount}
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={r.is_active}
                          onChange={(e) =>
                            setRows((prev) => {
                              const next = new Map(prev);
                              next.set(p.sku, { ...r, is_active: e.target.checked });
                              return next;
                            })
                          }
                        />
                        <span className={r.is_active ? "text-[#91F402]" : "text-gray-500"}>
                          {r.is_active ? "ON" : "OFF"}
                        </span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-4">
          <div className="text-sm font-bold text-[#91F402] mb-2">최근 구매(ledger 기반)</div>
          <div className="space-y-2">
            {(statsQuery.data?.shop_purchases ?? []).slice(0, 8).map((r) => (
              <div key={r.reason} className="flex justify-between text-xs text-gray-300">
                <span className="font-mono truncate" title={r.reason}>{r.reason}</span>
                <span className="text-gray-400">{r.count}</span>
              </div>
            ))}
            {!statsQuery.data && <div className="text-xs text-gray-500">Loading…</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-4">
          <div className="text-sm font-bold text-[#91F402] mb-2">바우처 사용</div>
          <div className="space-y-2">
            {(statsQuery.data?.voucher_uses ?? []).slice(0, 8).map((r) => (
              <div key={r.item_type} className="flex justify-between text-xs text-gray-300">
                <span className="font-mono truncate" title={r.item_type}>{r.item_type}</span>
                <span className="text-gray-400">{r.count}</span>
              </div>
            ))}
            {!statsQuery.data && <div className="text-xs text-gray-500">Loading…</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-4">
          <div className="text-sm font-bold text-[#91F402] mb-2">Idempotency(작업 안정성)</div>
          <div className="space-y-2">
            {(statsQuery.data?.idempotency ?? []).slice(0, 8).map((r) => (
              <div key={r.scope} className="flex justify-between text-xs text-gray-300">
                <span className="font-mono truncate" title={r.scope}>{r.scope}</span>
                <span className="text-gray-400">{r.completed}/{r.count}</span>
              </div>
            ))}
            {!statsQuery.data && <div className="text-xs text-gray-500">Loading…</div>}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        저장 데이터는 UI config key <span className="font-mono">shop_products</span>에 저장됩니다.
      </div>
    </div>
  );
};

export default AdminShopPage;
