// src/admin/api/adminGameConfigApi.ts
import { adminApi } from "./httpClient";

export interface GameConfig {
    id: number;
    is_active: boolean;
    updated_at: string;
    [key: string]: any;
}

export interface GameConfigSummary {
    game_key: string;
    active_configs: number;
    total_configs: number;
    last_updated: string | null;
}

export const fetchGameConfigsSummary = async (): Promise<GameConfigSummary[]> => {
    try {
        // Fetch summary data from each game type
        const [diceConfigs, rouletteConfigs, lotteryConfigs] = await Promise.all([
            adminApi.get<GameConfig[]>("/admin/api/dice-config/"),
            adminApi.get<GameConfig[]>("/admin/api/roulette-config/"),
            adminApi.get<GameConfig[]>("/admin/api/lottery-config/"),
        ]);

        const summary: GameConfigSummary[] = [
            {
                game_key: "DICE",
                active_configs: diceConfigs.data.filter((c) => c.is_active).length,
                total_configs: diceConfigs.data.length,
                last_updated: diceConfigs.data[0]?.updated_at || null,
            },
            {
                game_key: "ROULETTE",
                active_configs: rouletteConfigs.data.filter((c) => c.is_active).length,
                total_configs: rouletteConfigs.data.length,
                last_updated: rouletteConfigs.data[0]?.updated_at || null,
            },
            {
                game_key: "LOTTERY",
                active_configs: lotteryConfigs.data.filter((c) => c.is_active).length,
                total_configs: lotteryConfigs.data.length,
                last_updated: lotteryConfigs.data[0]?.updated_at || null,
            },
        ];

        return summary;
    } catch (error) {
        console.error("Failed to fetch game configs summary:", error);
        return [];
    }
};
