// src/admin/components/dashboard/CommandControl.tsx
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Zap,
    BellRing,
    MousePointerClick,
    Power,
    RefreshCw,
    HelpCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { nudgeRiskGroup } from "../../api/adminDashboardApi";
import { adminApi } from "../../api/httpClient";
import OpsLogQuickLogger from "../ops/OpsLogQuickLogger";

type HealthResponse = { status: string };

async function fetchHealth(): Promise<HealthResponse> {
    const { data } = await adminApi.get<HealthResponse>("/api/health");
    return data;
}

/**
 * CommandControl: Operational interface.
 * Theme: Dark Modern IDE
 */
const CommandControl: React.FC = () => {
    const queryClient = useQueryClient();

    const {
        data: health,
        isFetching: isHealthFetching,
        error: healthError,
        refetch: refetchHealth,
    } = useQuery({
        queryKey: ["admin", "health"],
        queryFn: fetchHealth,
        staleTime: 10000,
        retry: 0,
    });

    const nudgeMutation = useMutation({
        mutationFn: nudgeRiskGroup,
        onSuccess: (data) => {
            alert(`ë¦¬ìŠ¤??ê·¸ë£¹ ?Œë¦¼ ?”ì²­ ?„ë£Œ: ${data.nudged_count}ëª?);
            queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        },
    });

    const handleRefresh = async () => {
        await refetchHealth();
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    };

    return (
        <div className="flex flex-col h-full space-y-4 font-sans">
            {/* System Sync Status */}
            <div className="admin-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-admin-subtitle text-admin-text-primary select-none">?œìŠ¤???íƒœ</h4>
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className={
                            "btn-admin-ghost h-9 w-9 p-0 " +
                            (isHealthFetching ? "animate-spin text-admin-brand" : "text-admin-text-secondary")
                        }
                        title="?íƒœ ?ˆë¡œê³ ì¹¨"
                        aria-label="?íƒœ ?ˆë¡œê³ ì¹¨"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-admin-body text-admin-text-secondary">API ?íƒœ</span>
                        {healthError ? (
                            <div className="text-admin-mono text-admin-danger">?‘ë‹µ ?¤íŒ¨</div>
                        ) : (
                            <div className="text-admin-mono text-admin-text-primary">{health?.status ?? ""}</div>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-admin-body text-admin-text-secondary">?ˆë¡œê³ ì¹¨</span>
                        <div className="text-admin-meta text-admin-text-secondary">?„ìš”????ë²„íŠ¼?¼ë¡œ ì¦‰ì‹œ ê°±ì‹ ?˜ì„¸??</div>
                    </div>
                </div>
            </div>

            {/* Smart Actions */}
            <div className="admin-card p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-admin-subtitle text-admin-text-primary select-none">?´ì˜ ëª…ë ¹</h4>
                    <div className="group relative">
                        <HelpCircle size={16} className="text-admin-text-muted cursor-help hover:text-admin-text-base transition-colors" />
                        {/* Simple Tooltip */}
                        <div className="absolute right-0 top-6 w-56 p-3 rounded bg-admin-bg border border-admin-border text-xs text-admin-text-base opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-lg">
                            ?´ì˜???„ìš”??ë¹ ë¥¸ ?™ì‘ ëª¨ìŒ?…ë‹ˆ??
                            ?„í—˜êµ??Œë¦¼, ?´ì˜ ë¡œê·¸ ê¸°ë¡ ?±ì„ ì§€?í•©?ˆë‹¤.
                        </div>
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    <div className="group relative">
                        <button
                            onClick={() => nudgeMutation.mutate()}
                            disabled={nudgeMutation.isPending}
                            className="w-full flex items-center justify-between p-4 rounded border border-admin-border bg-admin-element-bg hover:bg-admin-hover hover:border-admin-brand transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-admin-brand group-hover:scale-110 transition-transform">
                                    <BellRing size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-admin-body font-bold text-admin-text-primary group-hover:text-admin-text-primary">?´íƒˆ ë°©ì? ?Œë¦¼</p>
                                    <p className="text-admin-meta text-admin-text-secondary">?´íƒˆ ?„í—˜êµ°ì— ?Œë¦¼ ?”ì²­</p>
                                </div>
                            </div>
                            <MousePointerClick size={16} className="text-admin-text-muted group-hover:text-admin-brand" />
                        </button>
                    </div>

                    <div className="group relative">
                        <Link
                            to="/admin/ops"
                            className="w-full flex items-center justify-between p-4 rounded border border-admin-border bg-admin-element-bg hover:bg-admin-hover hover:border-admin-brand transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-admin-brand group-hover:scale-110 transition-transform">
                                    <Zap size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-admin-body font-bold text-admin-text-primary group-hover:text-admin-text-primary">ê³¨ë“  ?„ì›Œ</p>
                                    <p className="text-admin-meta text-admin-text-secondary">?´ì˜ ë¡œê·¸?ì„œ ê³„íš/ë°°ìœ¨ ê¸°ë¡</p>
                                </div>
                            </div>
                            <span className="text-[10px] border border-admin-border text-admin-text-secondary px-1.5 py-0.5 rounded font-mono">?´ë™</span>
                        </Link>
                    </div>
                </div>

                {/* Quick Ops Logger (MVP) */}
                <div className="mt-6 pt-4 border-t border-admin-border space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-admin-meta font-bold tracking-wider text-admin-text-secondary">ë¹ ë¥¸ ?´ì˜ ê¸°ë¡</p>
                        <Link
                            to="/admin/ops"
                            className="text-[10px] font-bold text-admin-text-muted hover:text-admin-brand transition-colors"
                        >
                            ?„ì²´ ë³´ê¸°
                        </Link>
                    </div>
                    <OpsLogQuickLogger variant="compact" />
                </div>

                <div className="mt-6 space-y-3 pt-4 border-t border-admin-border">
                    <p className="text-admin-meta font-bold text-admin-danger tracking-wider">?„í—˜ êµ¬ì—­</p>
                    <button
                        disabled
                        className="w-full py-2.5 rounded bg-admin-danger/10 border border-admin-danger/30 text-admin-danger text-xs font-bold opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
                        title="ì¤€ë¹?ì¤?
                    >
                        <Power size={14} />
                        ê¸´ê¸‰ ?„ë¡œ?¸ìŠ¤ ì¢…ë£Œ(ì¤€ë¹?ì¤?
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommandControl;
