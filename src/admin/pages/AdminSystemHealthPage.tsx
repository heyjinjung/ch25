import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw, Server, AlertCircle } from "lucide-react";
import { fetchEconomyStats } from "../api/adminEconomyApi";

const AdminSystemHealthPage: React.FC = () => {
    const statsQuery = useQuery({
        queryKey: ["admin", "system", "health"],
        queryFn: fetchEconomyStats,
    });

    if (statsQuery.isLoading) {
        return (
            <div className="admin-page-container">
                <div className="rounded-md border border-admin-border bg-admin-bg p-6 text-admin-text-base flex items-center gap-3">
                <Activity className="animate-spin text-admin-brand" size={24} />
                <span className="text-lg">시스템 상태 확인 중...</span>
            </div>
            </div>
        );
    }

    if (statsQuery.error) {
        return (
            <div className="admin-page-container">
                <div className="rounded-md border border-admin-danger/30 bg-admin-danger/10 p-6 text-admin-danger flex items-center gap-3">
                    <AlertCircle size={24} />
                    <div>
                        <span className="text-lg font-bold">오류 발생</span>
                        <p className="text-base mt-1">시스템 상태 정보를 불러오지 못했습니다.</p>
                    </div>
                </div>
            </div>
        );
    }

    const idempotencyData = statsQuery.data?.idempotency ?? [];

    return (
        <section className="admin-page-container space-y-6 font-sans">
            <header className="pb-4 border-b border-admin-border flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-admin-text-base flex items-center gap-3">
                        <Server size={28} className="text-admin-brand" />
                        시스템 상태 (System Health)
                    </h2>
                    <p className="mt-2 text-base text-admin-text-muted">
                        Idempotency(멱등성) 상태와 주요 시스템 지표를 모니터링합니다.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => statsQuery.refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-admin-sidebar border border-admin-border rounded hover:bg-admin-hover text-admin-text-base transition-colors"
                    aria-label="새로고침"
                    title="새로고침"
                >
                    <RefreshCw size={16} />
                    새로고침
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-admin-border bg-admin-sidebar p-6">
                    <h3 className="text-xl font-semibold text-admin-text-base mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-admin-success" />
                        Idempotency 상태
                    </h3>
                    
                    {idempotencyData.length === 0 ? (
                        <div className="text-admin-text-muted text-center py-8 bg-admin-bg rounded border border-admin-border border-dashed">
                            데이터가 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded border border-admin-border">
                            <table className="w-full text-left text-sm text-admin-text-base">
                                <thead className="bg-admin-bg text-admin-muted font-medium border-b border-admin-border">
                                    <tr>
                                        <th className="px-4 py-3">Scope</th>
                                        <th className="px-4 py-3 text-right">총계</th>
                                        <th className="px-4 py-3 text-right text-admin-success">?�공</th>
                                        <th className="px-4 py-3 text-right text-admin-warning">진행중</th>
                                        <th className="px-4 py-3 text-right text-admin-danger">?�패</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-admin-border bg-admin-sidebar">
                                    {idempotencyData.map((r) => (
                                        <tr key={r.scope} className="hover:bg-admin-hover transition-colors">
                                            <td className="px-4 py-3 font-mono text-admin-brand">{r.scope}</td>
                                            <td className="px-4 py-3 text-right font-mono">{r.count}</td>
                                            <td className="px-4 py-3 text-right font-mono text-admin-success">{r.completed}</td>
                                            <td className="px-4 py-3 text-right font-mono text-admin-warning">{r.in_progress}</td>
                                            <td className="px-4 py-3 text-right font-mono text-admin-danger">{r.failed}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Placeholder for future system metrics */}
                <div className="rounded-lg border border-admin-border bg-admin-sidebar p-6 opacity-50 pointer-events-none">
                    <h3 className="text-xl font-semibold text-admin-text-base mb-4">
                        API Rate Limits (준비중)
                    </h3>
                    <div className="h-32 bg-admin-bg rounded border border-admin-border border-dashed flex items-center justify-center text-admin-muted">
                        추후 연동 예정
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AdminSystemHealthPage;
