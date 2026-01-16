import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUiConfig } from "../api/uiConfigApi";

const CONFIG_KEY = "modal_visibility";

type ModalVisibilityConfig = {
    attendance_streak_enabled: boolean;
    new_user_welcome_enabled: boolean;
    starter_missions_enabled: boolean;
    bailout_enabled: boolean;
};

const DEFAULT_VISIBILITY: ModalVisibilityConfig = {
    attendance_streak_enabled: true,
    new_user_welcome_enabled: true,
    starter_missions_enabled: true,
    bailout_enabled: true,
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
        return {
            attendance_streak_enabled: data.value.attendance_streak_enabled !== false,
            new_user_welcome_enabled: data.value.new_user_welcome_enabled !== false,
            starter_missions_enabled: data.value.starter_missions_enabled !== false,
            bailout_enabled: data.value.bailout_enabled !== false,
        };
    }, [data]);

    return {
        ...config,
        isLoading,
    };
};

