import React from "react";
import {
  useV2ActiveSeason,
  useV2TeamLeaderboard,
  useV2MyTeamMembership,
  useV2JoinableTeams,
  useV2AutoAssignTeam,
} from "../../hooks/useV2TeamBattle";
import Button from "../../components/common/Button";
import clsx from "clsx";
import { useSound } from "../../../hooks/useSound";
import "./TeamBattlePage.css";
import "./TeamBattleRedesign.css";
import { Loader2 } from "lucide-react";

/* Assets - Inherited from V1 */
const BG_SPLIT = "/assets/team_battle/bg_battle_split.png";
const ICON_VS = "/assets/team_battle/icon_vs.png";
const AVATAR_RED = "/assets/team_battle/avatar_red.png";
const AVATAR_BLUE = "/assets/team_battle/avatar_blue.png";
const ICON_DICE = "/assets/icon_dice_silver.png";
const ICON_ROULETTE = "/assets/figma/icon-roulette.png";
const ICON_LOTTERY = "/assets/lottery/icon_lotto_ball.png";

type GameOption = {
  id: string;
  name: string;
  desc: string;
  path: string;
  icon: string;
  points: number;
};

const BATTLE_GAMES: GameOption[] = [
  {
    id: "dice",
    name: "Dice Battle",
    desc: "주사위로 승부하세요",
    path: "/game/dice",
    icon: ICON_DICE,
    points: 10,
  },
  {
    id: "roulette",
    name: "Roulette",
    desc: "한방 승부 룰렛",
    path: "/game/roulette",
    icon: ICON_ROULETTE,
    points: 10,
  },
  {
    id: "lottery",
    name: "Lottery",
    desc: "매일 대박 기회",
    path: "/game/lottery",
    icon: ICON_LOTTERY,
    points: 10,
  },
];

const TeamBattlePage: React.FC = () => {
  const seasonQuery = useV2ActiveSeason();
  const myTeamQuery = useV2MyTeamMembership();
  const teamsQuery = useV2JoinableTeams();
  const leaderboardQuery = useV2TeamLeaderboard({
    season_id: seasonQuery.data?.id,
  });
  const autoAssignMutation = useV2AutoAssignTeam();

  const myTeam = myTeamQuery.data?.team;
  const teams = teamsQuery.data || [];
  const entries = leaderboardQuery.data?.entries ?? [];
  const leaderboard = (Array.isArray(entries) ? entries : []).map((entry) => ({
    team_id: entry.team.id,
    team_name: entry.team.name,
    points: entry.season_score,
  }));
  const [showGameModal, setShowGameModal] = React.useState(false);
  const gaugeRef = React.useRef<HTMLDivElement>(null);

  const loading =
    seasonQuery.isLoading || myTeamQuery.isLoading || teamsQuery.isLoading;
  const { startBattleBgm } = useSound();

  // Start Battle BGM
  React.useEffect(() => {
    startBattleBgm();
  }, [startBattleBgm]);

  // Join Team
  const handleJoin = async () => {
    try {
      await autoAssignMutation.mutateAsync();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "알 수 없는 오류";
      alert(`팀 배정 실패: ${msg}`);
    }
  };

  // Calculate Team Scores for Gauge
  const redScore = teams[0]
    ? entries.find((l) => l.team.id === teams[0].id)?.season_score || 0
    : 0;
  const blueScore = teams[1]
    ? entries.find((l) => l.team.id === teams[1].id)?.season_score || 0
    : 0;
  const totalScore = redScore + blueScore || 1;
  const redPercent = Math.round((redScore / totalScore) * 100);
  const bluePercent = 100 - redPercent;

  React.useEffect(() => {
    if (!gaugeRef.current) return;
    gaugeRef.current.style.setProperty("--red-percent", `${redPercent}`);
    gaugeRef.current.style.setProperty("--blue-percent", `${bluePercent}`);
  }, [redPercent, bluePercent]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-white/50 bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );

  return (
    <div className="team-battle-redesign-container">
      {/* Background Watermark */}
      <div className="branding-watermark">CC</div>

      {/* --- 1. Face-Off Header --- */}
      <section className="relative w-full shrink-0 h-[380px] overflow-hidden rounded-b-3xl shadow-2xl mb-6 z-10">
        {/* Background Image - Preserved */}
        <img
          src={BG_SPLIT}
          alt="Battle BG"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* VS Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center pt-8">
          <div className="flex w-full items-center justify-between px-6">
            {/* Red Team */}
            <div
              className={clsx(
                "flex flex-col items-center transition-all duration-500",
                myTeam?.id
                  ? myTeam.id === teams[0]?.id
                    ? "scale-110 grayscale-0"
                    : "scale-90 grayscale opacity-60"
                  : "scale-100",
              )}
            >
              <div className="relative mb-3 h-24 w-24 animate-float-slow">
                <img
                  src={AVATAR_RED}
                  alt="Red Team"
                  className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                />
                {myTeam?.id === teams[0]?.id && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    MY TEAM
                  </div>
                )}
              </div>
              <h2 className="font-black text-2xl italic text-white drop-shadow-md">
                {teams[0]?.name || "RED"}
              </h2>
              <p className="font-mono text-lg font-bold text-red-400">
                {redScore.toLocaleString()}
              </p>
            </div>

            {/* VS Logo */}
            <div className="relative -mt-6 z-20">
              <img
                src={ICON_VS}
                alt="VS"
                className="h-20 w-20 drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Blue Team */}
            <div
              className={clsx(
                "flex flex-col items-center transition-all duration-500",
                myTeam?.id
                  ? myTeam.id === teams[1]?.id
                    ? "scale-110 grayscale-0"
                    : "scale-90 grayscale opacity-60"
                  : "scale-100",
              )}
            >
              <div className="relative mb-3 h-24 w-24 animate-float-slow delay-1000">
                <img
                  src={AVATAR_BLUE}
                  alt="Blue Team"
                  className="h-full w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                />
                {myTeam?.id === teams[1]?.id && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    MY TEAM
                  </div>
                )}
              </div>
              <h2 className="font-black text-2xl italic text-white drop-shadow-md">
                {teams[1]?.name || "BLUE"}
              </h2>
              <p className="font-mono text-lg font-bold text-blue-400">
                {blueScore.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Gauge Bar */}
          <div className="mt-6 w-[90%]">
            <div className="flex justify-between text-xs font-bold text-white mb-1.5 opacity-80">
              <span>{redPercent}% Domination</span>
              <span>{bluePercent}% Domination</span>
            </div>
            <div
              ref={gaugeRef}
              className="relative h-3 w-full overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10 team-battle-gauge"
            >
              <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-1000 team-battle-gauge__red" />
              <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-blue-600 to-blue-500 transition-all duration-1000 team-battle-gauge__blue" />
              <div className="absolute top-0 bottom-0 w-1 bg-white opacity-50 team-battle-gauge__spark" />
            </div>
          </div>
        </div>
      </section>

      {/* --- 2. Action Area --- */}
      <section className="px-4 relative z-20 -mt-10 mb-8">
        {!myTeam ? (
          <div className="glass-card p-6 text-center">
            <h2 className="text-amber-400 text-xs font-black uppercase tracking-widest mb-1.5">
              {seasonQuery.data?.name || "SEASON BATTLE"}
            </h2>
            <h3 className="text-xl font-bold text-white mb-2">
              어느 팀이 승리할까요?
            </h3>
            <p className="text-sm text-white/50 mb-6">
              팀을 배정받고 승리에 기여하세요.<br />
              엄청난 보상이 기다립니다.
            </p>
            <Button
              onClick={handleJoin}
              disabled={autoAssignMutation.isPending}
              className="w-full !py-4 bg-[#25AD82] text-white rounded-xl font-bold hover:bg-[#1E8F6B] active:scale-[0.98] transition-all shadow-lg border-none"
            >
              {autoAssignMutation.isPending ? (
                "분석 중..."
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <img
                    src="/assets/icon_dice_silver.png"
                    alt=""
                    className="w-5 h-5 object-contain"
                  />
                  <span>랜덤 팀 배정받기</span>
                </div>
              )}
            </Button>
          </div>
        ) : (
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 font-bold uppercase mb-0.5">
                My Status
              </p>
              <p className="text-lg font-bold text-white uppercase">
                {myTeam?.name || "READY"} - READY
              </p>
            </div>
            <Button
              className="!px-6 bg-white text-black rounded-xl font-black hover:bg-gray-100 active:scale-95 transition-all text-sm border-none shadow-md"
              onClick={() => setShowGameModal(true)}
            >
              Play Game
            </Button>
          </div>
        )}
      </section>

      {/* --- 3. Leaderboard Preview --- */}
      <section className="px-4 z-10 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 uppercase">
            <img
              src="/assets/icon_trophy.png"
              alt=""
              className="w-5 h-5 object-contain opacity-80"
            />{" "}
            Top Teams
          </h3>
        </div>
        <div className="space-y-2 overflow-y-auto pr-1 pb-4 flex-1">
          {leaderboard.slice(0, 10).map((ranker, idx) => (
            <div
              key={ranker.team_id}
              className="flex items-center justify-between glass-card !bg-white/5 !border-white/5 !rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full font-black text-xs shadow-md",
                    idx === 0
                      ? "bg-yellow-500 text-black"
                      : idx === 1
                        ? "bg-gray-300 text-black"
                        : "bg-orange-700 text-white",
                  )}
                >
                  {idx + 1}
                </div>
                <span className="text-sm font-bold text-white truncate max-w-[120px]">
                  {ranker.team_name}
                </span>
              </div>
              <span className="font-mono text-sm text-emerald-400 font-bold drop-shadow-sm">
                {ranker.points.toLocaleString()} P
              </span>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center text-white/30 text-sm py-8">
              No data available yet
            </p>
          )}
        </div>
      </section>

      {/* --- Game Selection Modal (Battle Zone) --- */}
      {showGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowGameModal(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden glass-modal rounded-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-900/40 to-blue-900/40 p-5 text-center border-b border-white/5">
              <h3 className="text-lg font-black italic text-white uppercase tracking-wider">
                CHOOSE YOUR BATTLE
              </h3>
              <p className="text-xs text-white/50 mt-1">
                게임을 플레이하여 팀 점수를 획득하세요
              </p>
            </div>

            {/* List */}
            <div className="p-4 space-y-3">
              {BATTLE_GAMES.map((game) => (
                <a
                  key={game.id}
                  href={game.path}
                  className="flex items-center gap-4 rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10 active:scale-95 border border-white/5 hover:border-white/20 group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black/30 p-2 shadow-inner transition-colors">
                    <img
                      src={game.icon}
                      alt={game.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{game.name}</h4>
                    <p className="text-xs text-white/40">{game.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-emerald-400">
                      +{game.points} P
                    </span>
                  </div>
                </a>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-black/20 p-3 text-center">
              <button
                onClick={() => setShowGameModal(false)}
                className="text-sm font-bold text-white/40 hover:text-white transition-colors py-2 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamBattlePage;
