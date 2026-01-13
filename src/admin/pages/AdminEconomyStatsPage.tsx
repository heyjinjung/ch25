import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  Ticket,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  ArrowUpRight,
  Database
} from "lucide-react";
import { fetchEconomyStats } from "../api/adminEconomyApi";

const AdminEconomyStatsPage: React.FC = () => {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "economy", "stats"],
    queryFn: fetchEconomyStats,
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
      <span className="text-admin-meta text-admin-text-secondary">경제 지표 분석 중...</span>
    </div>
  );

  if (error) return (
    <div className="admin-card-premium p-8 flex flex-col items-center gap-4 text-center">
      <AlertCircle className="h-12 w-12 text-admin-danger" />
      <div>
        <h3 className="text-admin-subtitle font-bold text-admin-text-primary">지표 로드 실패</h3>
        <p className="text-admin-meta text-admin-text-secondary">서버로부터 경제 데이터를 가져오는 데 실패했습니다.</p>
      </div>
      <button onClick={() => refetch()} className="btn-admin-primary px-6">다시 시도</button>
    </div>
  );

  return (
    <section className="admin-page-container space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-admin-accent">
            <TrendingUp className="h-5 w-5" />
            <span className="text-admin-meta font-black uppercase tracking-[0.2em]">Economy Watchtower</span>
          </div>
          <h1 className="text-admin-title text-admin-text-primary">경제 원장 지표</h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">Inventory ledger 기반 통합 정산 및 멱등성 보장 수준을 모니터링합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="btn-admin-secondary flex items-center gap-2 px-6 py-3 h-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          <span className="font-bold">데이터 동기화</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shop Purchases Card */}
        <div className="admin-card-premium overflow-hidden flex flex-col">
          <div className="p-5 border-b border-admin-border bg-admin-sidebar/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-admin-brand/10 text-admin-brand">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <h3 className="text-admin-body font-black text-admin-text-primary">상점 구매 (Ledger Reason)</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-admin-text-muted" />
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="bg-admin-sidebar/60">
                  <th className="admin-th">원인 (Reason)</th>
                  <th className="admin-th text-right">거래량</th>
                  <th className="admin-th text-right">누적 변동</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(data?.shop_purchases ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-admin-meta text-admin-text-secondary">기록된 구매 내역이 없습니다.</td>
                  </tr>
                ) : (
                  data?.shop_purchases.map((r, i) => (
                    <tr key={i} className="hover:bg-admin-hover transition-colors">
                      <td className="admin-td font-mono text-xs">{r.reason}</td>
                      <td className="admin-td text-right font-bold text-admin-text-primary">{r.count.toLocaleString()}</td>
                      <td className="admin-td text-right">
                        <span className={`font-black ${r.sum_delta < 0 ? "text-admin-danger" : "text-admin-accent"}`}>
                          {r.sum_delta > 0 ? "+" : ""}{r.sum_delta.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-admin-sidebar/20 border-t border-admin-border text-[10px] text-admin-text-muted italic flex items-center gap-2">
            <BarChart3 className="h-3 w-3" />
            <span>상점 트랜잭션의 상세 사유별 집계 결과입니다.</span>
          </div>
        </div>

        {/* Voucher Uses Card */}
        <div className="admin-card-premium overflow-hidden flex flex-col">
          <div className="p-5 border-b border-admin-border bg-admin-sidebar/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-admin-accent/10 text-admin-accent">
                <Ticket className="h-5 w-5" />
              </div>
              <h3 className="text-admin-body font-black text-admin-text-primary">아이템/바우처 소모</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-admin-text-muted" />
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="bg-admin-sidebar/60">
                  <th className="admin-th">아이템 타입</th>
                  <th className="admin-th text-right">사용수</th>
                  <th className="admin-th text-right">유동액 (Abs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(data?.voucher_uses ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-admin-meta text-admin-text-secondary">소모 기록이 없습니다.</td>
                  </tr>
                ) : (
                  data?.voucher_uses.map((r, i) => (
                    <tr key={i} className="hover:bg-admin-hover transition-colors">
                      <td className="admin-td font-mono text-xs">{r.item_type}</td>
                      <td className="admin-td text-right font-bold text-admin-text-primary">{r.count.toLocaleString()}</td>
                      <td className="admin-td text-right text-admin-brand font-black">
                        {r.sum_abs_delta.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-admin-sidebar/20 border-t border-admin-border text-[10px] text-admin-text-muted italic flex items-center gap-2">
            <Database className="h-3 w-3" />
            <span>회원 인벤토리에서 실제 차감된 아이템 가치 합계입니다.</span>
          </div>
        </div>

        {/* Idempotency Status Card */}
        <div className="admin-card-premium overflow-hidden flex flex-col">
          <div className="p-5 border-b border-admin-border bg-admin-sidebar/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-admin-warning/10 text-admin-warning">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-admin-body font-black text-admin-text-primary">Idempotency 건전성</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-admin-text-muted" />
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="bg-admin-sidebar/60">
                  <th className="admin-th">스코프 (Scope)</th>
                  <th className="admin-th text-right">성공/전체</th>
                  <th className="admin-th text-right">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(data?.idempotency ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-admin-meta text-admin-text-secondary">보안 로그가 없습니다.</td>
                  </tr>
                ) : (
                  data?.idempotency.map((r, i) => (
                    <tr key={i} className="hover:bg-admin-hover transition-colors">
                      <td className="admin-td font-mono text-xs text-admin-text-primary font-bold">{r.scope}</td>
                      <td className="admin-td text-right">
                        <span className="text-admin-text-primary font-bold">{r.completed}</span>
                        <span className="text-admin-text-muted mx-1">/</span>
                        <span className="text-admin-text-secondary">{r.count}</span>
                      </td>
                      <td className="admin-td text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.failed > 0 ? (
                            <span className="w-2 h-2 rounded-full bg-admin-danger animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-admin-accent" />
                          )}
                          <span className={`text-[10px] font-black uppercase ${r.failed > 0 ? "text-admin-danger" : "text-admin-accent"}`}>
                            {r.failed > 0 ? "Alert" : "Stable"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-admin-sidebar/20 border-t border-admin-border text-[10px] text-admin-text-muted italic flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            <span>중복 거래 방지(멱등성) 로직의 실시간 작동 상태입니다.</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminEconomyStatsPage;
