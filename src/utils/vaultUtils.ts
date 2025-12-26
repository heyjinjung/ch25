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
    return `${amount.toLocaleString("ko-KR")}원`;
};

export const parseVaultUnlockRules = (
    json: Record<string, unknown> | null | undefined
): string[] => {
    if (!json) return [];

    const rules = json as unknown as VaultUnlockRuleJson;
    const messages: string[] = [];

    // Phase 1 Rules
    if (rules.phase1_deposit_unlock?.tiers) {
        const tiers = rules.phase1_deposit_unlock.tiers;
        // Sort by min_deposit_delta ascending
        const sorted = [...tiers].sort((a, b) => a.min_deposit_delta - b.min_deposit_delta);

        sorted.forEach((tier) => {
            messages.push(
                `${formatWon(tier.min_deposit_delta)} 충전 확인: ${formatWon(tier.unlock_amount)} 해금`
            );
        });
    }

    // Grand Cycle (Phase 2/3) Rules - optional display
    if (rules.grand_cycle_unlock) {
        const r = rules.grand_cycle_unlock;
        if (r.gold_unlock_tiers && r.gold_unlock_tiers.length > 0) {
            messages.push(`Gold: 충전 금액에 따라 ${r.gold_unlock_tiers.join("% / ")}% 차등 해금`);
        }
        if (r.diamond_unlock) {
            messages.push(`Diamond: Diamond Key ${r.diamond_unlock.min_diamond_keys}개 + 누적 ${formatWon(r.diamond_unlock.min_gold_cumulative)} 달성 시 해금`);
        }
    }

    // Fallback if no rules found but JSON exists
    if (messages.length === 0 && rules.version) {
        messages.push("해금 조건: 운영팀 문의");
    }

    return messages;
};
