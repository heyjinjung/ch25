import React from "react";
import {
  useActiveTeamSeason,
  useTeamLeaderboard,
  useMyTeam,
  useTeamList,
  useAutoAssignTeam,
} from "../hooks/useTeamBattle";
import Button from "../components/common/Button";
import clsx from "clsx";

/* Assets */
const BG_SPLIT = "/assets/team_battle/bg_battle_split.png";
const ICON_VS = "/assets/team_battle/icon_vs.png";
const AVATAR_RED = "/assets/team_battle/avatar_red.png";
const AVATAR_BLUE = "/assets/team_battle/avatar_blue.png";

const TeamBattlePage: React.FC = () => {
  const seasonQuery = useActiveTeamSeason();
  const myTeamQuery = useMyTeam();
  const teamsQuery = useTeamList();
  const leaderboardQuery = useTeamLeaderboard(seasonQuery.data?.id);
  const autoAssignMutation = useAutoAssignTeam();

  const myTeam = myTeamQuery.data;
  const teams = teamsQuery.data || [];
  const leaderboard = leaderboardQuery.data || [];

  const loading = seasonQuery.isLoading || myTeamQuery.isLoading || teamsQuery.isLoading;

  // Join Team
  const handleJoin = async () => {
    try {
      await autoAssignMutation.mutateAsync();
    } catch (err) {
      alert("팀 배정에 실패했습니다. 이미 배정되었거나 시즌이 종료되었습니다.");
    }
  };

  // Calculate Team Scores for Gauge
  const redScore = leaderboard.find(l => l.team_id === teams[0]?.id)?.points || 0;
  const blueScore = leaderboard.find(l => l.team_id === teams[1]?.id)?.points || 0;
  const totalScore = redScore + blueScore || 1;
  const redPercent = Math.round((redScore / totalScore) * 100);
  const bluePercent = 100 - redPercent;

  if (loading) return <div className="flex h-screen items-center justify-center text-white/50">Loading Battle...</div>;

  return (
    <div className="relative min-h-[80vh] w-full max-w-lg mx-auto pb-32">
      {/* --- 1. Face-Off Header --- */}
      <section className="relative h-[400px] w-full overflow-hidden rounded-b-3xl shadow-2xl">
        {/* Background */}
        <img src={BG_SPLIT} alt="Battle BG" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* VS Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center pt-10">
          <div className="flex w-full items-center justify-between px-6">
            {/* Red Team */}
            <div className={clsx("flex flex-col items-center transition-all duration-500", myTeam?.team_id ? (myTeam.team_id === teams[0]?.id ? "scale-110 grayscale-0" : "scale-90 grayscale opacity-60") : "scale-100")}>
              <div className="relative mb-4 h-28 w-28 animate-float-slow">
                <img src={AVATAR_RED} alt="Red Team" className="h-full w-full drop-shadow-[0_0_25px_rgba(220,38,38,0.6)]" />
                {myTeam?.team_id === teams[0]?.id && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg">MY TEAM</div>}
              </div>
              <h2 className="font-black text-2xl italic text-white drop-shadow-md">{teams[0]?.name || "RED"}</h2>
              <p className="font-mono text-lg font-bold text-red-400">{redScore.toLocaleString()}</p>
            </div>

            {/* VS Logo */}
            <div className="relative -mt-8 z-20">
              <img src={ICON_VS} alt="VS" className="h-24 w-24 animate-pulse drop-shadow-[0_0_30px_rgba(255,215,0,0.5)]" />
            </div>

            {/* Blue Team */}
            <div className={clsx("flex flex-col items-center transition-all duration-500", myTeam?.team_id ? (myTeam.team_id === teams[1]?.id ? "scale-110 grayscale-0" : "scale-90 grayscale opacity-60") : "scale-100")}>
              <div className="relative mb-4 h-28 w-28 animate-float-slow" style={{ animationDelay: "1s" }}>
                <img src={AVATAR_BLUE} alt="Blue Team" className="h-full w-full drop-shadow-[0_0_25px_rgba(37,99,235,0.6)]" />
                {myTeam?.team_id === teams[1]?.id && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg">MY TEAM</div>}
              </div>
              <h2 className="font-black text-2xl italic text-white drop-shadow-md">{teams[1]?.name || "BLUE"}</h2>
              <p className="font-mono text-lg font-bold text-blue-400">{blueScore.toLocaleString()}</p>
            </div>
          </div>

          {/* Gauge Bar */}
          <div className="mt-8 w-[90%]">
            <div className="flex justify-between text-xs font-bold text-white mb-1">
              <span>{redPercent}% Domination</span>
              <span>{bluePercent}% Domination</span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000"
                style={{ width: `${redPercent}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full bg-gradient-to-l from-blue-600 to-blue-500 transition-all duration-1000"
                style={{ width: `${bluePercent}%` }}
              />
              {/* Center Spark */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white blur-[2px]"
                style={{ left: `${redPercent}%`, transition: "left 1s ease-in-out" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- 2. Action Area --- */}
      <section className="px-4 -mt-6 relative z-30">
        {!myTeam ? (
          <div className="rounded-2xl border border-gold-500/30 bg-black/80 backdrop-blur-xl p-6 text-center shadow-xl">
            <h2 className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1">{seasonQuery.data?.name || "SEASON BATTLE"}</h2>
            <h3 className="text-xl font-bold text-white mb-2">어느 팀이 승리할까요?</h3>
            <p className="text-sm text-white/50 mb-6">팀을 배정받고 승리에 기여하세요.<br />엄청난 보상이 기다립니다.</p>
            <Button
              onClick={handleJoin}
              disabled={autoAssignMutation.isPending}
              variant="figma-primary"
              className="w-full !py-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {autoAssignMutation.isPending ? "분석 중..." : (
                <div className="flex items-center justify-center gap-2">
                  <img src="/assets/icon_dice_silver.png" alt="" className="w-5 h-5 object-contain" />
                  <span>랜덤 팀 배정받기</span>
                </div>
              )}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 font-bold uppercase">My Status</p>
              <p className="text-lg font-bold text-white">READY TO FIGHT</p>
            </div>
            <Button variant="figma-secondary" className="!px-6">Play Game</Button>
          </div>
        )}
      </section>

      {/* --- 3. Leaderboard Preview --- */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <img src="/assets/icon_trophy.png" alt="" className="w-6 h-6 object-contain" /> Top Rankers
          </h3>
        </div>
        <div className="space-y-2">
          {leaderboardQuery.data?.slice(0, 10).map((ranker, idx) => (
            <div key={ranker.team_id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full font-black text-xs",
                  idx === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" :
                    idx === 1 ? "bg-gray-300 text-black" :
                      "bg-orange-700 text-white"
                )}>
                  {idx + 1}
                </div>
                <span className="text-sm font-bold text-white truncate max-w-[120px]">{ranker.team_name}</span>
              </div>
              <span className="font-mono text-sm text-emerald-400 font-bold">{ranker.points.toLocaleString()} P</span>
            </div>
          ))}
          {leaderboard.length === 0 && <p className="text-center text-white/30 text-sm py-4">No data available</p>}
        </div>
      </section>
    </div>
  );
};

export default TeamBattlePage;
