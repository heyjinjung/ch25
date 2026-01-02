import React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { fetchEconomyStats } from "../api/adminEconomyApi";

const AdminEconomyStatsPage: React.FC = () => {
  const statsQuery = useQuery({
    queryKey: ["admin", "economy", "stats"],
    queryFn: fetchEconomyStats,
  });

  if (statsQuery.isLoading) return <div className="text-white">Loading economy stats...</div>;
  if (statsQuery.error) return <div className="text-red-500">Error loading economy stats</div>;

  const data = statsQuery.data;

  return (
    <div className="text-white">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#91F402]">📈 경제 지표</h1>
          <p className="text-gray-400 text-sm mt-1">Inventory ledger + idempotency 기반 최소 운영 지표</p>
        </div>
        <button
          type="button"
          onClick={() => statsQuery.refetch()}
          className="flex items-center gap-2 bg-[#2C2C2E] text-white px-4 py-2 rounded-lg font-bold hover:brightness-110"
        >
          <RefreshCw size={18} /> 새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-4">
          <div className="text-sm font-bold text-[#91F402] mb-3">상점 구매(ledger reason)</div>
          <div className="space-y-2">
            {(data?.shop_purchases ?? []).length === 0 ? (
              <div className="text-xs text-gray-500">데이터 없음</div>
            ) : (
              (data?.shop_purchases ?? []).map((r) => (
                <div key={r.reason} className="flex justify-between text-xs text-gray-300">
                  <span className="font-mono truncate" title={r.reason}>{r.reason}</span>
                  <span className="text-gray-400">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-4">
          <div className="text-sm font-bold text-[#91F402] mb-3">바우처 사용</div>
          <div className="space-y-2">
            {(data?.voucher_uses ?? []).length === 0 ? (
              <div className="text-xs text-gray-500">데이터 없음</div>
            ) : (
              (data?.voucher_uses ?? []).map((r) => (
                <div key={r.item_type} className="flex justify-between text-xs text-gray-300">
                  <span className="font-mono truncate" title={r.item_type}>{r.item_type}</span>
                  <span className="text-gray-400">{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#333333] bg-[#111111] p-4">
          <div className="text-sm font-bold text-[#91F402] mb-3">Idempotency 상태</div>
          <div className="space-y-2">
            {(data?.idempotency ?? []).length === 0 ? (
              <div className="text-xs text-gray-500">데이터 없음</div>
            ) : (
              (data?.idempotency ?? []).map((r) => (
                <div key={r.scope} className="flex justify-between text-xs text-gray-300">
                  <span className="font-mono truncate" title={r.scope}>{r.scope}</span>
                  <span className="text-gray-400">{r.completed}/{r.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEconomyStatsPage;
