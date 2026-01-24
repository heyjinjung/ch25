import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    AlertCircle,
    ChevronRight,
    Clock,
    FileCheck,
    Gift,
    Pin,
    Send,
    Settings,
    Trophy,
    Users,
    Zap
} from "lucide-react";
import { getDailyOverview } from "../../api/adminDashboardApi";

interface QuickAction {
    id: string;
    label: string;
    description: string;
    to: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeType?: "warning" | "danger" | "info";
    isPinned?: boolean;
}

const QuickActionsBar: React.FC = () => {
    // Fetch pending counts for dynamic badges
    const { data: overview } = useQuery({
        queryKey: ["admin", "dashboard", "daily-overview"],
        queryFn: getDailyOverview,
        staleTime: 60000,
    });

    const riskCount = overview?.risk_count || 0;
    const streakRiskCount = overview?.streak_risk_count || 0;

    // Contextual actions based on system state
    const contextualActions: QuickAction[] = [
        ...(riskCount > 0 ? [{
            id: "risk-users",
            label: "?�탈 ?�험",
            description: `${riskCount}�?리스??감�?`,
            to: "/admin/marketing",
            icon: <AlertCircle className="h-4 w-4" />,
            badge: riskCount,
            badgeType: "danger" as const,
        }] : []),
        ...(streakRiskCount > 0 ? [{
            id: "streak-risk",
            label: "?�트�??�험",
            description: `${streakRiskCount}�??�탈 ?�박`,
            to: "/admin/streak-rewards",
            icon: <Clock className="h-4 w-4" />,
            badge: streakRiskCount,
            badgeType: "warning" as const,
        }] : []),
    ];

    // Pinned quick links (frequently used)
    const pinnedActions: QuickAction[] = [
        {
            id: "missions",
            label: "미션 관리",
            description: "미션 ?�인/반려",
            to: "/admin/missions",
            icon: <FileCheck className="h-4 w-4" />,
            isPinned: true,
        },
        {
            id: "messages",
            label: "메시지 발송",
            description: "공�?/?�벤???�림",
            to: "/admin/messages",
            icon: <Send className="h-4 w-4" />,
            isPinned: true,
        },
        {
            id: "seasons",
            description: "시즌 패스 관리",
            description: "?�즌 ?�스 관�?,
            to: "/admin/seasons",
            icon: <Trophy className="h-4 w-4" />,
            isPinned: true,
        },
        {
            id: "users",
            label: "?�원 검??,
            description: "?�원 조회/?�정",
            to: "/admin/users",
            icon: <Users className="h-4 w-4" />,
            isPinned: true,
        },
        {
            id: "streak",
            label: "?�트�?보상",
            description: "출석 보상 ?�정",
            to: "/admin/streak-rewards",
            icon: <Gift className="h-4 w-4" />,
            isPinned: true,
        },
        {
            id: "ui-config",
            label: "UI ?�정",
            description: "문구/배치 관�?,
            to: "/admin/ui-config",
            icon: <Settings className="h-4 w-4" />,
            isPinned: true,
        },
    ];

    const renderActionCard = (action: QuickAction, isContextual: boolean = false) => (
        <Link
            key={action.id}
            to={action.to}
            className={`
                group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200
                ${isContextual
                    ? "bg-gradient-to-r from-admin-sidebar to-admin-bg border-admin-border hover:border-admin-brand/50"
                    : "bg-admin-sidebar/50 border-admin-border/50 hover:bg-admin-hover hover:border-admin-border"}
            `}
        >
            <div className={`
                p-2 rounded-lg transition-colors
                ${isContextual
                    ? action.badgeType === "danger"
                        ? "bg-admin-danger/10 text-admin-danger"
                        : "bg-admin-warning/10 text-admin-warning"
                    : "bg-admin-brand/10 text-admin-brand group-hover:bg-admin-brand group-hover:text-white"}
            `}>
                {action.icon}
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-admin-text-primary group-hover:text-admin-brand transition-colors">
                        {action.label}
                    </span>
                    {action.badge && (
                        <span className={`
                            px-1.5 py-0.5 rounded text-[10px] font-black
                            ${action.badgeType === "danger" ? "bg-admin-danger/20 text-admin-danger" : ""}
                            ${action.badgeType === "warning" ? "bg-admin-warning/20 text-admin-warning" : ""}
                            ${action.badgeType === "info" ? "bg-admin-brand/20 text-admin-brand" : ""}
                        `}>
                            {action.badge}
                        </span>
                    )}
                    {action.isPinned && (
                        <Pin className="h-3 w-3 text-admin-text-muted" />
                    )}
                </div>
                <p className="text-[11px] text-admin-text-muted truncate">{action.description}</p>
            </div>
            
            <ChevronRight className="h-4 w-4 text-admin-text-muted group-hover:text-admin-brand group-hover:translate-x-0.5 transition-all" />
        </Link>
    );

    return (
        <div className="admin-card-premium p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-admin-brand" />
                    <h3 className="text-sm font-bold text-admin-text-primary">빠른 ?�업</h3>
                </div>
                <span className="text-[10px] text-admin-text-muted font-mono">
                    {contextualActions.length > 0 ? `${contextualActions.length}�??��? : "?�상"}
                </span>
            </div>

            {/* Contextual Actions (if any) */}
            {contextualActions.length > 0 && (
                <div className="mb-4 space-y-2">
                    <p className="text-[10px] font-bold text-admin-warning uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3" /> 즉시 조치 ?�요
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {contextualActions.map(action => renderActionCard(action, true))}
                    </div>
                </div>
            )}

            {/* Pinned Quick Links */}
            <div>
                <p className="text-[10px] font-bold text-admin-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Pin className="h-3 w-3" /> 빠른 ?�동
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {pinnedActions.map(action => renderActionCard(action))}
                </div>
            </div>
        </div>
    );
};

export default QuickActionsBar;
