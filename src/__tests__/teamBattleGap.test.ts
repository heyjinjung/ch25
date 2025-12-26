import { describe, expect, it } from "vitest";
import { getGapToAboveTeam } from "../utils/teamBattleGap";

describe("getGapToAboveTeam", () => {
  it("returns null when myTeamId is null", () => {
    expect(getGapToAboveTeam([{ team_id: 1, team_name: "A", points: 100 }], null)).toBeNull();
  });

  it("returns null when my team is rank #1 (index 0)", () => {
    const leaderboard = [
      { team_id: 1, team_name: "A", points: 100 },
      { team_id: 2, team_name: "B", points: 90 },
    ];
    expect(getGapToAboveTeam(leaderboard, 1)).toBeNull();
  });

  it("returns gap to immediately above team", () => {
    const leaderboard = [
      { team_id: 1, team_name: "A", points: 100 },
      { team_id: 2, team_name: "B", points: 90 },
      { team_id: 3, team_name: "C", points: 40 },
    ];

    expect(getGapToAboveTeam(leaderboard, 3)).toEqual({
      gap: 50,
      aboveTeamId: 2,
      aboveTeamName: "B",
      aboveRank: 2,
    });
  });

  it("never returns negative gap", () => {
    const leaderboard = [
      { team_id: 1, team_name: "A", points: 100 },
      { team_id: 2, team_name: "B", points: 120 },
    ];

    expect(getGapToAboveTeam(leaderboard, 2)).toEqual({
      gap: 0,
      aboveTeamId: 1,
      aboveTeamName: "A",
      aboveRank: 1,
    });
  });
});
