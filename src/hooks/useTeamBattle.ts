import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getActiveSeason,
    getLeaderboard,
    autoAssignTeam,
    listTeams,
    getMyTeam,
    getContributors
} from "../api/teamBattleApi";
import { TeamSeason, LeaderboardEntry, TeamMembership } from "../types/teamBattle";

export const useActiveTeamSeason = () => {
    return useQuery<TeamSeason | null>({
        queryKey: ["active-team-season"],
        queryFn: getActiveSeason,
        staleTime: 30_000,
    });
};

export const useTeamLeaderboard = (seasonId?: number) => {
    return useQuery<LeaderboardEntry[]>({
        queryKey: ["team-leaderboard", seasonId],
        queryFn: () => getLeaderboard(seasonId, 10, 0),
        enabled: !!seasonId,
        staleTime: 30_000,
    });
};

export const useMyTeam = () => {
    return useQuery<TeamMembership | null>({
        queryKey: ["team-membership"],
        queryFn: getMyTeam,
        staleTime: 30_000,
    });
};

export const useTeamList = () => {
    return useQuery({
        queryKey: ["team-list"],
        queryFn: listTeams,
        staleTime: 60_000,
    });
};

export const useAutoAssignTeam = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: autoAssignTeam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team-membership"] });
            queryClient.invalidateQueries({ queryKey: ["team-leaderboard"] });
            queryClient.invalidateQueries({ queryKey: ["team-list"] });
        },
    });
};

export const useTeamContributors = (teamId: number, seasonId?: number) => {
    return useQuery({
        queryKey: ["team-contributors", teamId, seasonId],
        queryFn: () => getContributors(teamId, seasonId, 10, 0),
        enabled: !!teamId && !!seasonId,
        staleTime: 30_000,
    });
};
