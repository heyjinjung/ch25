import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Activity,

    Clock,
    DollarSign,
    Gamepad2,
    Server,
    ShieldAlert,
    User,
    Zap
} from "lucide-react";
import { fetchOpsLogEntries } from "../../api/adminOpsLogApi";
import { OpsLogCategory as OpsLogCategoryValues } from "../../api/opsLogKeys";
import type { OpsLogCategory as OpsLogCategoryType } from "../../api/opsLogKeys";

function formatTimeHHmmss(date: Date) {
    return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

const LiveOpsFeed: React.FC = () => {
    // Fetch logs for today
    const today = new Date().toISOString().split("T")[0];

    const { data: logs, isLoading } = useQuery({
        queryKey: ["admin", "ops-logs", "feed"],
        queryFn: () => fetchOpsLogEntries({ date: today }),
        refetchInterval: 10000, // Refresh every 10 seconds for "Live" feel
    });

    const logsList = Array.isArray(logs) ? logs : [];

    const getCategoryIcon = (category: OpsLogCategoryType) => {
        switch (category) {
            case OpsLogCategoryValues.GAME_PLAY:
                return <Gamepad2 className="h-4 w-4 text-admin-brand" />;
            case OpsLogCategoryValues.ECONOMY:
                return <DollarSign className="h-4 w-4 text-admin-accent" />;
            case OpsLogCategoryValues.SYSTEM:
                return <Server className="h-4 w-4 text-admin-text-secondary" />;
            case OpsLogCategoryValues.USER_MANAGEMENT:
                return <User className="h-4 w-4 text-admin-warning" />;
            case OpsLogCategoryValues.SECURITY:
                return <ShieldAlert className="h-4 w-4 text-admin-danger" />;
            default:
                return <Activity className="h-4 w-4 text-admin-text-muted" />;
        }
    };



    return (
        <div className="bg-zinc-800/60 backdrop-blur-xl border border-white/5 rounded-xl flex flex-col h-full overflow-hidden relative group">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </div>
                    <h2 className="text-[24px] font-light text-zinc-200 tracking-tight">실시간 운영 피드</h2>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900/50 border border-white/5">
                    <span className="w-1.5 h-1.5 rounded-full border border-zinc-500"></span>
                    <span className="text-[12px] text-zinc-500">실시간</span>
                </div>
            </div>

            {/* Scrollable Feed */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
                        <Clock className="h-6 w-6 animate-pulse opacity-50" />
                        <span className="text-sm font-light">데이터 수신 중...</span>
                    </div>
                ) : logs && !Array.isArray(logs) ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-3">
                        <span className="text-sm font-light">피드 데이터 형식이 올바르지 않습니다</span>
                        <span className="text-xs font-mono opacity-60">type: {typeof logs}</span>
                    </div>
                ) : logsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-4 opacity-50">
                        <div className="p-4 rounded-full border-2 border-zinc-700">
                            <Zap className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-light">오늘 기록된 운영 로그가 없습니다</span>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {logsList.slice(0, 50).map((log) => (
                            <div
                                key={log.id}
                                className="flex items-start gap-4 p-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors group/item"
                            >
                                {/* Icon Column */}
                                <div className="mt-1 flex-shrink-0">
                                    <div className={`p-2 rounded-lg bg-zinc-900 border border-white/5 ${log.category === OpsLogCategoryValues.SECURITY ? 'text-rose-400' :
                                        log.category === OpsLogCategoryValues.ECONOMY ? 'text-emerald-400' :
                                            'text-indigo-400'
                                        }`}>
                                        {getCategoryIcon(log.category)}
                                    </div>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm font-bold text-zinc-300">
                                            {log.action_code}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-mono">
                                            {formatTimeHHmmss(new Date(log.timestamp))}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 leading-relaxed break-all line-clamp-2 group-hover/item:line-clamp-none transition-all">
                                        {JSON.stringify(log.meta_data)}
                                    </p>
                                    <div className="pt-1 flex items-center gap-2">
                                        {log.target_id && (
                                            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 font-mono">
                                                ID: {log.target_id}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-zinc-600">
                                            {log.target_model}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveOpsFeed;
