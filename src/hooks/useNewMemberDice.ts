// src/hooks/useNewMemberDice.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getNewMemberDiceStatus,
  NewMemberDicePlayResponse,
  NewMemberDiceStatusResponse,
  playNewMemberDice,
} from "../api/newMemberDiceApi";

const NEW_MEMBER_DICE_STATUS_QUERY_KEY = ["new-member-dice-status"] as const;

export const useNewMemberDiceStatus = () => {
  return useQuery<NewMemberDiceStatusResponse, unknown>({
    queryKey: NEW_MEMBER_DICE_STATUS_QUERY_KEY,
    queryFn: getNewMemberDiceStatus,
  });
};

export const usePlayNewMemberDice = () => {
  const queryClient = useQueryClient();
  return useMutation<NewMemberDicePlayResponse, unknown>({
    mutationFn: playNewMemberDice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEW_MEMBER_DICE_STATUS_QUERY_KEY });
    },
  });
};
