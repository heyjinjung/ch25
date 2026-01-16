import { useMutation, useQueryClient } from "@tanstack/react-query";
import { craftItem, CraftResponse } from "../api/exchangeApi";
import { useSound } from "./useSound";

export const useCraftItem = () => {
    const queryClient = useQueryClient();
    const { playBigWin } = useSound();

    return useMutation<CraftResponse, unknown, string>({
        mutationFn: craftItem,
        onSuccess: () => {
            // Invalidate queries to refresh UI
            queryClient.invalidateQueries({ queryKey: ["lottery-status"] });
            queryClient.invalidateQueries({ queryKey: ["roulette-status"] }); // If keys are used there
            queryClient.invalidateQueries({ queryKey: ["vault-status"] });

            // Play sound if provided
            playBigWin();
        },
    });
};
