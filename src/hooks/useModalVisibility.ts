import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUiConfig } from "../api/uiConfigApi";

const CONFIG_KEY = "modal_visibility";

export type ModalVisibilityConfig = {
    attendance_streak_enabled: boolean;
    new_user_welcome_enabled: boolean;
    starter_missions_enabled: boolean;
    golden_hour_enabled: boolean;
    vip_promo_enabled: boolean;
    vip_eligibility_enabled: boolean;
    inbox_enabled: boolean;
    vault_info_enabled: boolean;
    withdrawal_conditions_enabled: boolean;
    withdrawal_progress_enabled: boolean;
    lottery_collection_enabled: boolean;
    limited_offer_enabled: boolean;
    season_pass_enabled: boolean;
    ticket_zero_enabled: boolean;
};

const DEFAULT_VISIBILITY: ModalVisibilityConfig = {
    attendance_streak_enabled: true,
    new_user_welcome_enabled: true,
    starter_missions_enabled: true,
    golden_hour_enabled: true,
    vip_promo_enabled: true,
    vip_eligibility_enabled: true,
    inbox_enabled: true,
    vault_info_enabled: true,
    withdrawal_conditions_enabled: true,
    withdrawal_progress_enabled: true,
    lottery_collection_enabled: true,
    limited_offer_enabled: true,
    season_pass_enabled: true,
    ticket_zero_enabled: true,
};

export const useModalVisibility = () => {
    const { data, isLoading } = useQuery({
        queryKey: ["uiConfig", CONFIG_KEY],
        queryFn: () => getUiConfig(CONFIG_KEY),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const config: ModalVisibilityConfig = useMemo(() => {
        if (!data?.value) return DEFAULT_VISIBILITY;
        
        // Safe casting/merging
        // Logic: undefined/null => true (default enabled)
        // explicitly false => false
        const val = data.value;
        return {
            attendance_streak_enabled: val.attendance_streak_enabled !== false,
            new_user_welcome_enabled: val.new_user_welcome_enabled !== false,
            starter_missions_enabled: val.starter_missions_enabled !== false,
            golden_hour_enabled: val.golden_hour_enabled !== false,
            vip_promo_enabled: val.vip_promo_enabled !== false,
            vip_eligibility_enabled: val.vip_eligibility_enabled !== false,
            inbox_enabled: val.inbox_enabled !== false,
            vault_info_enabled: val.vault_info_enabled !== false,
            withdrawal_conditions_enabled: val.withdrawal_conditions_enabled !== false,
            withdrawal_progress_enabled: val.withdrawal_progress_enabled !== false,
            lottery_collection_enabled: val.lottery_collection_enabled !== false,
            limited_offer_enabled: val.limited_offer_enabled !== false,
            season_pass_enabled: val.season_pass_enabled !== false,
            ticket_zero_enabled: val.ticket_zero_enabled !== false,
        };
    }, [data]);

    return {
        ...config,
        isLoading,
    };
};

