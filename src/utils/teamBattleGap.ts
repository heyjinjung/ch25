import { LeaderboardEntry } from "../types/teamBattle";

export type GapToAboveTeam = {
  gap: number;
  aboveTeamId: number;
  aboveTeamName: string;
  aboveRank: number;
};

export function getGapToAboveTeam(leaderboard: LeaderboardEntry[], myTeamId: number | null): GapToAboveTeam | null {
  if (myTeamId === null) return null;
  if (!Array.isArray(leaderboard) || leaderboard.length === 0) return null;

  const myIndex = leaderboard.findIndex((row) => row.team_id === myTeamId);
  if (myIndex <= 0) return null;

  const above = leaderboard[myIndex - 1];
  const mine = leaderboard[myIndex];
  if (!above || !mine) return null;

  const gap = Math.max(0, (above.points ?? 0) - (mine.points ?? 0));

  return {
    gap,
    aboveTeamId: above.team_id,
    aboveTeamName: above.team_name,
    aboveRank: myIndex,
  };
}
