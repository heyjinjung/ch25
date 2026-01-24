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
      <span className="text-admin-meta text-admin-text-secondary">Í≤ΩÏ†ú ÏßÄ??Î∂ÑÏÑù Ï§?..</span>
    </div>
  );

  if (error) return (
    <div className="admin-card-premium p-8 flex flex-col items-center gap-4 text-center">
      <AlertCircle className="h-12 w-12 text-admin-danger" />
      <div>
        <h3 className="text-admin-subtitle font-bold text-admin-text-primary">ÏßÄ??Î°úÎìú ?§Ìå®</h3>
        <p className="text-admin-meta text-admin-text-secondary">?úÎ≤ÑÎ°úÎ???Í≤ΩÏ†ú ?∞Ïù¥?∞Î? Í∞Ä?∏Ïò§?????§Ìå®?àÏäµ?àÎã§.</p>
      </div>
      <button onClick={() => refetch()} className="btn-admin-primary px-6">?§Ïãú ?úÎèÑ</button>
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
          <h1 className="text-admin-title text-admin-text-primary">Í≤ΩÏ†ú ?êÏû• ÏßÄ??/h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">Inventory ledger Í∏∞Î∞ò ?µÌï© ?ïÏÇ∞ Î∞?Î©±Îì±??Î≥¥Ïû• ?òÏ???Î™®Îãà?∞ÎßÅ?©Îãà??</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="btn-admin-secondary flex items-center gap-2 px-6 py-3 h-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          <span className="font-bold">?∞Ïù¥???ôÍ∏∞??/span>
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
              <h3 className="text-admin-body font-black text-admin-text-primary">?ÅÏ†ê Íµ¨Îß§ (Ledger Reason)</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-admin-text-muted" />
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="bg-admin-sidebar/60">
                  <th className="admin-th">?êÏù∏ (Reason)</th>
                  <th className="admin-th text-right">Í±∞Îûò??/th>
                  <th className="admin-th text-right">?ÑÏ†Å Î≥Ä??/th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(data?.shop_purchases ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-admin-meta text-admin-text-secondary">Í∏∞Î°ù??Íµ¨Îß§ ?¥Ïó≠???ÜÏäµ?àÎã§.</td>
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
            <span>?ÅÏ†ê ?∏Îûú??Öò???ÅÏÑ∏ ?¨Ïú†Î≥?ÏßëÍ≥Ñ Í≤∞Í≥º?ÖÎãà??</span>
          </div>
        </div>

        {/* Voucher Uses Card */}
        <div className="admin-card-premium overflow-hidden flex flex-col">
          <div className="p-5 border-b border-admin-border bg-admin-sidebar/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-admin-accent/10 text-admin-accent">
                <Ticket className="h-5 w-5" />
              </div>
              <h3 className="text-admin-body font-black text-admin-text-primary">?ÑÏù¥??Î∞îÏö∞Ï≤??åÎ™®</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-admin-text-muted" />
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="bg-admin-sidebar/60">
                  <th className="admin-th">?ÑÏù¥???Ä??/th>
                  <th className="admin-th text-right">?¨Ïö©??/th>
                  <th className="admin-th text-right">?†Îèô??(Abs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(data?.voucher_uses ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-admin-meta text-admin-text-secondary">?åÎ™® Í∏∞Î°ù???ÜÏäµ?àÎã§.</td>
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
            <span>?åÏõê ?∏Î≤§?†Î¶¨?êÏÑú ?§Ï†ú Ï∞®Í∞ê???ÑÏù¥??Í∞ÄÏπ??©Í≥Ñ?ÖÎãà??</span>
          </div>
        </div>

        {/* Idempotency Status Card */}
        <div className="admin-card-premium overflow-hidden flex flex-col">
          <div className="p-5 border-b border-admin-border bg-admin-sidebar/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-admin-warning/10 text-admin-warning">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-admin-body font-black text-admin-text-primary">Idempotency Í±¥Ï†Ñ??/h3>
            </div>
            <ArrowUpRight className="h-4 w-4 text-admin-text-muted" />
          </div>
          <div className="flex-1 p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="bg-admin-sidebar/60">
                  <th className="admin-th">?§ÏΩî??(Scope)</th>
                  <th className="admin-th text-right">?±Í≥µ/?ÑÏ≤¥</th>
                  <th className="admin-th text-right">?ÅÌÉú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(data?.idempotency ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-admin-meta text-admin-text-secondary">Î≥¥Ïïà Î°úÍ∑∏Í∞Ä ?ÜÏäµ?àÎã§.</td>
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
            <span>Ï§ëÎ≥µ Í±∞Îûò Î∞©Ï?(Î©±Îì±?? Î°úÏßÅ???§ÏãúÍ∞??ëÎèô ?ÅÌÉú?ÖÎãà??</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminEconomyStatsPage;
