import React, { useEffect, useState } from "react";
import {
    TrendingUp,
    Zap,
    Users,
    Clock,
    X,
} from "lucide-react";
import { getVaultStats, getVaultDefaultProgram } from "../../api/adminVaultApi";
import { formatCurrency } from "../../utils/formatters";
import { ConfirmModal } from "../common/ConfirmModal";
import { adminApi } from "../../api/httpClient";
import dayjs from "dayjs";

interface VaultMetricsProps {
    onGoldenHourToggle?: (enabled: boolean) => void;
}

export const VaultDashboardMetrics: React.FC<VaultMetricsProps> = ({ onGoldenHourToggle }) => {
    const [stats, setStats] = useState<any>(null);
    const [config, setConfig] = useState<any>(null);
    const [goldenHourEnabled, setGoldenHourEnabled] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await getVaultStats();
            const prog = await getVaultDefaultProgram();
            setStats(data);
            setConfig(prog);
            // Assuming config has golden_hour flag, checking pseudo-state for now
            // In real impl, we would check data.config.golden_hour
        } catch (error) {
            console.error("Stats fetch error", error);
        }
    };

    const handleGoldenHourClick = () => {
        setShowConfirm(true);
    };

    const confirmGoldenHour = async () => {
        const newState = !goldenHourEnabled;
        setGoldenHourEnabled(newState);
        if (onGoldenHourToggle) onGoldenHourToggle(newState);
        setShowConfirm(false);

        // Log logic would go here or in the parent
    };

    const [detailModal, setDetailModal] = useState<{ type: string; title: string } | null>(null);
    const [detailData, setDetailData] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const fetchDetailData = async (type: string) => {
        setLoadingDetail(true);
        try {
            const { data } = await adminApi.get(`/admin/api/vault-programs/stats/details?type=${type}`);
            setDetailData(data);
        } catch (error) {
            console.error("Failed to fetch detail data", error);
            setDetailData({ items: [] });
        } finally {
            setLoadingDetail(false);
        }
    };

    const openDetailModal = (type: string, title: string) => {
        setDetailModal({ type, title });
        fetchDetailData(type);
    };

    const MetricCard = ({ title, value, subValue, icon: Icon, colorClass, borderClass, detailType }: any) => (
        <div
            onClick={() => detailType && openDetailModal(detailType, title)}
            className={`flex-1 min-w-[220px] bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors group ${borderClass ? `hover:${borderClass}` : ''}`}
        >
            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{title}</span>
                <div className={`text-xl font-bold tracking-tight ${colorClass} font-mono`}>{value}</div>
                <div className="text-[10px] text-zinc-600">{subValue}</div>
            </div>

            <div className={`p-2 rounded-lg bg-zinc-800/50 text-zinc-600 group-hover:${colorClass} transition-colors`}>
                <Icon size={18} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Ticker Row */}
            <div className="flex items-stretch gap-4 overflow-x-auto pb-2 custom-scrollbar">
                <MetricCard
                    title="오늘의 금고 적립"
                    value={stats ? formatCurrency(Object.values(stats.today_accrual || {}).reduce((sum: number, v: any) => sum + (v?.total || 0), 0)) : "-"}
                    subValue={stats?.expiring_soon_24h > 0 ? `만료 임박 ${stats.expiring_soon_24h}명` : "안정적"}
                    icon={TrendingUp}
                    colorClass="text-admin-brand"
                    borderClass="border-admin-brand/20"
                    detailType="accrual"
                    compact
                />

                <MetricCard
                    title="총 예치 부채"
                    value={stats ? formatCurrency(stats.total_liabilities || 0) : "-"}
                    subValue={stats ? `잠금 ${formatCurrency(stats.total_locked || 0)}` : "-"}
                    icon={Users}
                    colorClass="text-admin-warning"
                    borderClass="border-admin-warning/20"
                    detailType="liabilities"
                    compact
                />

                <MetricCard
                    title="출금 승인 대기"
                    value={stats ? `${formatCurrency(stats.total_reserved || 0)}` : "-"}
                    subValue="예약된 출금 금액"
                    icon={Clock}
                    colorClass="text-admin-accent"
                    borderClass="border-admin-accent/20"
                    detailType="withdrawal"
                    compact
                />

                {/* Golden Hour Control (Integrated) */}
                <div
                    onClick={handleGoldenHourClick}
                    className={`flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all hover:brightness-110 relative overflow-hidden group
                        ${goldenHourEnabled
                            ? 'bg-yellow-500/10 border-yellow-500/50'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                >
                    <div className="flex flex-col gap-1 z-10 relative">
                        <div className="flex items-center gap-2">
                            <Zap size={14} className={goldenHourEnabled ? "text-yellow-400 fill-yellow-400" : "text-zinc-500"} />
                            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">GOLDEN HOUR</span>
                        </div>
                        <div className={`text-lg font-black tracking-tight ${goldenHourEnabled ? 'text-yellow-400' : 'text-zinc-500'}`}>
                            {goldenHourEnabled ? "부스터 가동중" : "대기(OFF)"}
                        </div>
                    </div>

                    <div className={`w-3 h-3 rounded-full ${goldenHourEnabled ? 'bg-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-zinc-700'}`} />

                    {goldenHourEnabled && (
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-yellow-500/20 blur-2xl rounded-full pointer-events-none" />
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {detailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-admin-card w-full max-w-4xl rounded-2xl border border-admin-border shadow-2xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-admin-border">
                            <h3 className="text-xl font-bold text-white">{detailModal.title} - 상세 내역</h3>
                            <button
                                onClick={() => setDetailModal(null)}
                                className="text-admin-text-muted hover:text-white transition-colors"
                                aria-label="상세 모달 닫기"
                                title="닫기"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {loadingDetail ? (
                                <div className="text-center py-12 text-admin-text-secondary">로딩 중...</div>
                            ) : !detailData || !detailData.items || detailData.items.length === 0 ? (
                                <div className="text-center py-12 text-admin-text-muted">데이터가 없습니다.</div>
                            ) : (
                                <div className="space-y-3">
                                    {detailData.items.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-admin-sidebar/50 border border-admin-border rounded-xl p-4 hover:bg-admin-hover transition-colors">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <div className="text-admin-meta text-admin-text-secondary mb-1">사용자</div>
                                                    <div className="font-bold text-admin-text-primary">
                                                        {item.nickname || item.external_id || `User #${item.user_id}`}
                                                    </div>
                                                    <div className="text-xs text-admin-text-muted">#{item.external_id || item.user_id}</div>
                                                </div>
                                                <div>
                                                    <div className="text-admin-meta text-admin-text-secondary mb-1">금액</div>
                                                    <div className="font-black text-admin-brand">{formatCurrency(item.amount)}</div>
                                                    {item.count && item.count > 1 && <div className="text-xs text-admin-text-muted">{item.count}건</div>}
                                                </div>
                                                <div>
                                                    <div className="text-admin-meta text-admin-text-secondary mb-1">일시</div>
                                                    <div className="text-admin-body text-admin-text-primary">
                                                        {item.timestamp ? dayjs(item.timestamp).format("YYYY-MM-DD HH:mm") : "-"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-admin-meta text-admin-text-secondary mb-1">메타</div>
                                                    <div className="text-xs text-admin-text-muted">
                                                        {item.meta ? JSON.stringify(item.meta).substring(0, 50) : "-"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-admin-border flex justify-end">
                            <button
                                onClick={() => setDetailModal(null)}
                                className="px-6 py-2 bg-admin-sidebar text-admin-text-secondary hover:bg-admin-hover rounded-xl font-bold transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmGoldenHour}
                title={goldenHourEnabled ? "골든 아워 종료" : "골든 아워 시작"}
                message={goldenHourEnabled
                    ? `현재 적용 중인 ${config?.config_json?.golden_hour_config?.multiplier || 1.5}배 적립 부스터를 종료하시겠습니까?`
                    : `지금부터 모든 유저의 금고 적립률을 ${config?.config_json?.golden_hour_config?.multiplier || 1.5}배로 상향합니다. 진행하시겠습니까?`}
                confirmText={goldenHourEnabled ? "종료하기" : "시작하기 (Fire)"}
                type={goldenHourEnabled ? "danger" : "primary"}
            />
        </div>
    );
};
