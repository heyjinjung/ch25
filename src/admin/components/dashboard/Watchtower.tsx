import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Shield,
    ShieldCheck,
    Activity,
    Lock,
    AlertTriangle,
    Eye,
    RefreshCw
} from "lucide-react";
import { fetchOpsLogEntries, OpsLogCategory } from "../../api/adminOpsLogApi";
import dayjs from "dayjs";

const Watchtower: React.FC = () => {
    // Fetch security logs specifically
    const { data: securityLogs, isLoading } = useQuery({
        queryKey: ["admin", "ops-logs", "security"],
        queryFn: () => fetchOpsLogEntries({
            date: new Date().toISOString().split("T")[0],
            category: OpsLogCategory.SECURITY
        }),
        refetchInterval: 5000, // Fast refresh for security
    });

    const threatLevel = useMemo(() => {
        if (!securityLogs || securityLogs.length === 0) return "LOW";
        const recentLogs = securityLogs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            const now = new Date().getTime();
            return (now - logTime) < 1000 * 60 * 60; // Last hour
        });

        if (recentLogs.length > 10) return "CRITICAL";
        if (recentLogs.length > 3) return "ELEVATED";
        return "LOW";
    }, [securityLogs]);

    const getThreatColor = (level: string) => {
        switch (level) {
            case "CRITICAL": return "text-admin-danger";
            case "ELEVATED": return "text-admin-warning";
            default: return "text-admin-accent";
        }
    };

    const getThreatBg = (level: string) => {
        switch (level) {
            case "CRITICAL": return "bg-admin-danger/10 border-admin-danger";
            case "ELEVATED": return "bg-admin-warning/10 border-admin-warning";
            default: return "bg-admin-accent/10 border-admin-accent";
        }
    };

    return (
        <div className="admin-card-premium h-full flex flex-col relative overflow-hidden">
            {/* Radar Scan Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(99,102,241,0.1)_360deg)] animate-spin-slow rounded-full"></div>
            </div>

            <div className="p-6 border-b border-admin-border flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Shield className={`h-5 w-5 ${getThreatColor(threatLevel)}`} />
                        <div className={`absolute inset-0 ${getThreatColor(threatLevel)} animate-ping opacity-20`}></div>
                    </div>
                    <h2 className="text-admin-subtitle text-admin-text-primary">워치타워</h2>
                </div>

                <div className={`px-3 py-1 rounded-full border text-xs font-black tracking-wider flex items-center gap-2 ${getThreatBg(threatLevel)} ${getThreatColor(threatLevel)}`}>
                    <Activity className="h-3 w-3" />
                    경보: {threatLevel}
                </div>
            </div>

            <div className="flex-1 p-0 relative z-10 overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-admin-text-muted gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin" /> 스캔 초기화 중...
                    </div>
                ) : !securityLogs || securityLogs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-admin-text-muted gap-3 opacity-60">
                        <ShieldCheck className="h-12 w-12 text-admin-accent" />
                        <span className="text-sm font-medium">보안 이벤트 없음</span>
                        <span className="text-xs text-admin-text-secondary">현재 시스템은 안정 상태입니다</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                        {securityLogs.slice(0, 20).map((log) => (
                            <div
                                key={log.id}
                                className="p-3 rounded-lg bg-admin-sidebar/50 border border-admin-border/50 hover:border-admin-danger/50 transition-colors group"
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <span className="text-xs font-bold text-admin-danger uppercase tracking-wider flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" /> {log.action_code}
                                    </span>
                                    <span className="text-[10px] font-mono text-admin-text-muted">
                                        {dayjs(log.timestamp).format("HH:mm:ss")}
                                    </span>
                                </div>
                                <div className="text-sm text-admin-text-secondary line-clamp-2">
                                    {JSON.stringify(log.meta_data)}
                                </div>
                                {log.target_id && (
                                    <div className="mt-2 flex justify-end">
                                        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-admin-text-muted font-mono border border-admin-border/30">
                                            ID: {log.target_id}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Status */}
            <div className="p-3 border-t border-admin-border bg-admin-sidebar/30 text-[10px] text-admin-text-muted flex justify-between items-center relative z-10">
                <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" /> 시스템 보호됨
                </span>
                <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> 모니터링 활성
                </span>
            </div>
        </div>
    );
};

export default Watchtower;
