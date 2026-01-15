import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Sparkles, Users, Loader2 } from "lucide-react";
import { fetchCrisisSignals, CrisisSignal } from "../api/adminDashboardApi";

interface CrisisRadarProps {
    onScenarioClick?: (scenario: CrisisSignal) => void;
}

/**
 * Crisis Radar Widget - Displays 11 crisis scenarios with real-time counts.
 * Based on spec: docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md
 */
const CrisisRadar: React.FC<CrisisRadarProps> = ({ onScenarioClick }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["admin", "ops", "crisis-signals"],
        queryFn: fetchCrisisSignals,
        refetchInterval: 60000, // 1 minute polling
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32 bg-zinc-900/50 rounded-2xl border border-white/5">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                <span className="ml-2 text-zinc-500 text-sm">위기 신호 로딩 중...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-32 bg-zinc-900/50 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span className="ml-2 text-rose-400 text-sm">위기 신호 로드 실패</span>
            </div>
        );
    }

    const signals = data?.signals ?? [];
    const highRiskSignals = signals.filter(s => s.level === "HIGH" || s.level === "SPECIAL");

    const getLevelStyles = (level: CrisisSignal["level"], count: number) => {
        if (count === 0) {
            return "bg-zinc-900/30 border-white/5 opacity-50";
        }
        switch (level) {
            case "HIGH":
                return "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40";
            case "SPECIAL":
                return "bg-amber-500/5 border-amber-400/20 ring-1 ring-amber-500/30 hover:ring-amber-500/50";
            case "MEDIUM":
                return "bg-zinc-900/50 border-white/5 hover:border-indigo-500/50";
            case "LOW":
            default:
                return "bg-zinc-900/30 border-white/5 hover:border-zinc-500/30";
        }
    };

    const getLevelIcon = (level: CrisisSignal["level"]) => {
        switch (level) {
            case "HIGH":
                return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
            case "SPECIAL":
                return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
            default:
                return <Users className="w-3.5 h-3.5 text-zinc-500" />;
        }
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    위기 감지 레이더
                </h3>
                {highRiskSignals.length > 0 && (
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-full animate-pulse">
                        {highRiskSignals.length} 긴급
                    </span>
                )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-3">
                {signals.map((signal) => (
                    <div
                        key={signal.id}
                        onClick={() => signal.count > 0 && onScenarioClick?.(signal)}
                        className={`
                            relative p-4 rounded-xl border transition-all duration-200
                            ${getLevelStyles(signal.level, signal.count)}
                            ${signal.count > 0 ? "cursor-pointer" : "cursor-default"}
                            group
                        `}
                    >
                        {/* Pulse animation for high risk with count */}
                        {signal.level === "HIGH" && signal.count > 0 && (
                            <div className="absolute inset-0 rounded-xl bg-rose-500/5 animate-pulse pointer-events-none" />
                        )}

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-1.5 mb-2">
                                {getLevelIcon(signal.level)}
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">
                                    {signal.name}
                                </span>
                            </div>
                            <div className="text-2xl font-mono font-bold text-zinc-100 tabular-nums">
                                {signal.count.toLocaleString()}
                            </div>

                            {/* Samples */}
                            {signal.count > 0 && signal.samples?.length > 0 && (
                                <div className="mt-1 text-[10px] text-zinc-500 truncate">
                                    {signal.samples.slice(0, 3).join(", ")}
                                    {signal.samples.length > 3 && ", ..."}
                                </div>
                            )}

                            {/* Hover action */}
                            {signal.count > 0 && (
                                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs text-indigo-400 font-medium">
                                        작전 실행 →
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CrisisRadar;
