// src/admin/pages/RewardTypesPage.tsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Palette, Loader2 } from "lucide-react";
import { fetchRewardTypes } from "../api/adminRewardTypesApi";

const RewardTypesPage: React.FC = () => {
    const { data: rewardTypes, isLoading, isError, error } = useQuery({
        queryKey: ["admin", "reward-types"],
        queryFn: fetchRewardTypes,
    });

    if (isLoading) {
        return (
            <div className="rounded-md border border-admin-border bg-admin-bg p-6 text-admin-text-base flex items-center gap-3">
                <Loader2 className="animate-spin text-admin-brand" size={24} />
                <span className="text-lg">Î¶¨ÏÜå??Î°úÎî©Ï§?..</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-md border border-red-900/50 bg-[#2d0e0e] p-6 text-admin-danger">
                <span className="text-lg font-bold">?§Î•ò: Î≥¥ÏÉÅ ?ïÎ≥¥Î•?Î∂àÎü¨?§Îäî???§Ìå®?àÏäµ?àÎã§.</span>
                <br />
                <span className="text-base">{error instanceof Error ? error.message : ""}</span>
            </div>
        );
    }

    const getIconPath = (key: string) => {
        const k = key.toUpperCase();
        // Coin / Money
        if (k.includes("COIN") || k.includes("POINT") || k.includes("GOLD")) return "/assets/asset_coin_gold.png";

        // Diamond / Cash
        if (k.includes("DIAMOND") || k.includes("CASH") || k.includes("GEM")) {
            // If it's specifically a ticket
            if (k.includes("TICKET")) return "/assets/asset_ticket_diamond.png";
            return "/assets/icon_diamond.png";
        }

        // Tickets
        if (k.includes("TICKET")) {
            if (k.includes("GREEN")) return "/assets/asset_ticket_green.png";
            if (k.includes("TRIAL")) return "/assets/asset_ticket_trial.png";
            return "/assets/asset_ticket_gold.png";
        }

        // Dice
        if (k.includes("DICE")) return "/assets/icon_dice_silver.png";

        // Trophy
        if (k.includes("TROPHY")) return "/assets/icon_trophy.png";

        return null;
    };

    return (
        <section className="space-y-6 font-sans">
            <header className="pb-4 border-b border-admin-border">
                <h2 className="text-2xl font-bold text-admin-text-base flex items-center gap-3">
                    <Palette size={24} className="text-admin-brand" />
                    Î≥¥ÏÉÅ ?†Ìòï ?ïÏùò
                </h2>
                <p className="mt-2 text-base text-admin-muted">
                    ?ÑÏó≠ Î≥¥ÏÉÅ ?†Ìòï, ?ÑÏù¥ÏΩ? ?âÏÉÅ ?±ÏùÑ ?ïÏùò?òÍ≥† Í¥ÄÎ¶¨Ìï©?àÎã§.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewardTypes?.map((reward) => {
                    const iconPath = getIconPath(reward.key);

                    return (
                        <div
                            key={reward.key}
                            className="group relative rounded-lg border border-admin-border bg-admin-sidebar p-6 hover:border-admin-brand transition-colors"
                        >
                            {/* Category Badge */}
                            <div className="absolute top-4 right-4">
                                <span className="text-xs font-medium bg-admin-bg text-admin-text-base px-2.5 py-1 rounded border border-admin-border">
                                    {reward.category}
                                </span>
                            </div>

                            {/* Icon & Name */}
                            <div className="flex items-center gap-4 mb-4">
                                <div
                                    className="w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold border border-admin-border bg-admin-bg overflow-hidden"
                                    style={{
                                        color: reward.color,
                                    }}
                                >
                                    {iconPath ? (
                                        <img src={iconPath} alt={reward.key} className="w-full h-full object-contain" />
                                    ) : (
                                        reward.icon.substring(0, 2).toUpperCase()
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-admin-text-base truncate group-hover:text-admin-brand transition-colors">
                                        {reward.display_name}
                                    </h3>
                                    <p className="text-xs text-admin-muted mt-0.5">{reward.key}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-base text-admin-text-base/90 leading-relaxed line-clamp-2 min-h-[3em]">
                                {reward.description}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default RewardTypesPage;
