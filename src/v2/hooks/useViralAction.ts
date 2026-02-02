import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recordViralAction, verifyChannelSubscription } from "../../api/viralApi";
import { triggerNotification } from "../utils/haptic";

export function useViralAction() {
  const queryClient = useQueryClient();

  const recordActionMutation = useMutation({
    mutationFn: recordViralAction,
    onSuccess: () => {
      // Invalidate missions to reflect progress immediately
      queryClient.invalidateQueries({ queryKey: ["v2", "missions"] });
    },
    onError: (error) => {
      console.error("[useViralAction] Record action failed", error);
      triggerNotification("error");
    }
  });

  const verifyChannelMutation = useMutation({
    mutationFn: async ({ missionId, channelUsername }: { missionId: number; channelUsername?: string }) => {
      const result = await verifyChannelSubscription(missionId, channelUsername);
      return result; 
    },
    onSuccess: () => {
      // MissionCard에서 메시지를 처리하므로 여기서는 쿼리 갱신만 수행
      queryClient.invalidateQueries({ queryKey: ["v2", "missions"] });
    },
    onError: (error) => {
      console.error("[useViralAction] Channel verification failed", error);
      triggerNotification("error");
    }
  });

  return {
    recordAction: recordActionMutation.mutateAsync,
    verifyChannel: verifyChannelMutation.mutateAsync,
    isRecording: recordActionMutation.isPending,
    isVerifying: verifyChannelMutation.isPending,
  };
}
