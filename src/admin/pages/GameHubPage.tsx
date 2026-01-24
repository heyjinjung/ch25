import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Gamepad2,
    Trophy,
    Clock,
    Zap,
    CheckCircle2
} from "lucide-react";
import { fetchGameConfigsSummary, type GameConfigSummary } from "../api/adminGameConfigApi";
import { formatNumber, formatDate } from "../utils/formatters";

const GameHubPage: React.FC = () => {
    const { data: summaries = [], isLoading } = useQuery<GameConfigSummary[]>({
        queryKey: ["admin", "game-configs", "summary"],
        queryFn: fetchGameConfigsSummary,
    });

    const GAME_NAMES: Record<string, string> = {
        DICE: "Ï£ºÏÇ¨??,
        ROULETTE: "Î£∞Î†õ",
        LOTTERY: "Î≥µÍ∂å",
    };

    const getStatusBadge = (activeConfigs: number) => {
        const isActive = activeConfigs > 0;
        const color = isActive
            ? "bg-admin-accent/20 text-admin-accent border-admin-accent/30"
            : "bg-admin-text-muted/20 text-admin-text-muted border-admin-text-muted/30";

        return (
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${color}`}>
                <CheckCircle2 className="w-3 h-3" />
                {isActive ? "ACTIVE" : "INACTIVE"}
            </span>
        );
    };

    return (
        <section className="admin-page-container space-y-10 pb-20">
            <header className="flex flex-col gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-admin-brand">
                        <Gamepad2 className="h-5 w-5" />
                        <span className="text-admin-meta font-black uppercase tracking-[0.2em]">Game Management</span>
                    </div>
                    <h1 className="text-admin-title text-admin-text-primary">Í≤åÏûÑ ?àÎ∏å Ïª®Ìä∏Î°??ºÌÑ∞</h1>
                    <p className="text-admin-body text-admin-text-secondary font-medium">
                        ?ºÏù¥Î∏?Í≤åÏûÑ???ÅÌÉúÎ•?Î™®Îãà?∞ÎßÅ?òÍ≥† Í∞úÎ≥Ñ ?§Ï†ï???úÏñ¥?©Îãà??
                    </p>
                </div>
            </header>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-admin-text-muted gap-4">
                    <Zap className="h-10 w-10 animate-pulse text-admin-brand" />
                    <p className="text-admin-meta">Í≤åÏûÑ ?∞Ïù¥?∞Î? Î∂àÎü¨?§Îäî Ï§?..</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {summaries.map((game) => {
                        const name = GAME_NAMES[game.game_key] || game.game_key;

                        return (
                            <Link
                                key={game.game_key}
                                to={`/admin/conf/games/${game.game_key}`}
                                className="group admin-card-premium block p-0 overflow-hidden hover:border-admin-brand/50 transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Header */}
                                <div className="p-6 pb-4 flex justify-between items-start">
                                    <div className="p-3 rounded-xl bg-admin-brand/10 text-admin-brand mb-4 group-hover:bg-admin-brand group-hover:text-white transition-colors duration-300">
                                        <Trophy className="h-6 w-6" />
                                    </div>
                                    {getStatusBadge(game.active_configs)}
                                </div>

                                {/* Content */}
                                <div className="px-6 pb-6">
                                    <h3 className="text-admin-subtitle text-admin-text-primary mb-1 group-hover:text-admin-brand transition-colors">
                                        {name}
                                    </h3>
                                    <p className="text-admin-meta text-admin-text-muted font-mono mb-6">
                                        {game.game_key}
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/20 rounded-lg p-3 border border-admin-border/50">
                                            <div className="flex items-center gap-1.5 text-admin-text-muted mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                                            </div>
                                            <span className="text-lg font-black text-admin-text-primary tabular-nums">
                                                {formatNumber(game.active_configs)}
                                            </span>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-3 border border-admin-border/50">
                                            <div className="flex items-center gap-1.5 text-admin-text-muted mb-1">
                                                <Gamepad2 className="h-3 w-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
                                            </div>
                                            <span className="text-lg font-black text-admin-text-primary tabular-nums">
                                                {formatNumber(game.total_configs)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-black/40 px-6 py-4 border-t border-admin-border flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs text-admin-text-muted font-mono">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {formatDate(game.last_updated)}
                                        </span>
                                    </div>
                                    <span className="text-xs font-bold text-admin-brand opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        Configure <Zap className="h-3 w-3" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default GameHubPage;
