export interface VaultUnlockRuleJson {
    version?: number;
    program_key?: string;
    accrual_multiplier?: {
        active: number;
        default: number;
        enabled: boolean;
        window_kst?: {
            start: string;
            end: string;
        };
    };
    phase1_deposit_unlock?: {
        tiers: Array<{ min_deposit_delta: number; unlock_amount: number }>;
    };
    grand_cycle_unlock?: {
        gold_unlock_tiers?: number[];
        diamond_unlock?: {
            min_diamond_keys: number;
            min_gold_cumulative: number;
        };
        seed_carryover?: {
            min_percent: number;
            max_percent: number;
            default_percent: number;
        };
    };
}

export const formatWon = (amount: number): string => {
    return `${amount.toLocaleString("ko-KR")}??;
};

export const parseVaultUnlockRules = (
    json: VaultUnlockRuleJson | null | undefined
): string[] => {
    if (!json) return [];

    const messages: string[] = [];
    
    // Updated Rules 2026-01-16
    messages.push("최근 3?�간 게임 30???�상 ?�레??);
    messages.push("금고 ?�용 ?�적 ?�일 10,000???�상");
    messages.push("?�일 ?�금 기록 보유");
    messages.push("최소 출금 가??금액 10,000??);

    return messages;
};
