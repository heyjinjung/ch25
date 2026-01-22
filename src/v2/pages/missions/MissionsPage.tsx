import { Link } from "react-router-dom";
import { Trophy, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useV2Missions, useV2ClaimMission } from "../../hooks/useV2Mission";

export default function MissionsPage() {
  const { data, isLoading, error, refetch } = useV2Missions();
  const claimMutation = useV2ClaimMission();

  const handleClaim = async (missionId: string) => {
    try {
      await claimMutation.mutateAsync(missionId);
      alert("보상을 받았습니다!");
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "보상 수령 실패");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          <p className="text-white/60">미션 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">미션을 불러올 수 없습니다</h2>
          <p className="text-white/60 mb-4">잠시 후 다시 시도해주세요</p>
          <Link to="/v2/home" className="inline-block px-6 py-3 bg-white/10 rounded-lg font-bold">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const { missions = [], streak_info } = data || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-black mb-2">미션 & 이벤트</h1>
        <p className="text-white/60 mb-8">다양한 미션을 완료하고 보상을 받으세요</p>

        {/* Streak Info */}
        {streak_info && (
          <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-2xl p-6 border border-orange-500/30 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60 mb-1">연속 접속</div>
                <div className="text-2xl font-black text-orange-400">
                  {streak_info.current_streak || 0}일 연속 🔥
                </div>
              </div>
              {streak_info.claimable_rewards && streak_info.claimable_rewards.length > 0 && (
                <button
                  onClick={() => alert("스트릭 보상 기능 준비 중")}
                  className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition"
                >
                  보상 받기
                </button>
              )}
            </div>
          </div>
        )}

        {/* Missions List */}
        {missions.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold">미션 목록</h2>
            </div>
            <div className="space-y-3">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-center justify-between bg-white/5 p-4 rounded-xl"
                >
                  <div className="flex-1">
                    <div className="font-bold">{mission.title}</div>
                    <div className="text-xs text-white/50 mt-1">
                      {mission.description}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      진행도: {mission.progress || 0}/{mission.target}
                    </div>
                    <div className="text-xs text-green-400 mt-1">
                      보상:{" "}
                      {mission.reward_type === "VAULT"
                        ? `${mission.reward_amount.toLocaleString()}P`
                        : `${mission.reward_amount.toLocaleString()}티켓`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mission.is_claimed ? (
                      <span className="text-xs px-3 py-1 bg-zinc-700 text-zinc-400 rounded-full font-bold">
                        수령 완료
                      </span>
                    ) : mission.is_completed ? (
                      <button
                        onClick={() => handleClaim(mission.id)}
                        disabled={claimMutation.isPending}
                        className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg text-sm hover:bg-green-600 transition disabled:opacity-50"
                      >
                        {claimMutation.isPending ? "처리 중..." : "보상 받기"}
                      </button>
                    ) : (
                      <Trophy className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {missions.length === 0 && (
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 mb-4 text-center">
            <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-white/60">현재 진행 가능한 미션이 없습니다</p>
          </div>
        )}

        {/* Back Button */}
        <Link
          to="/v2/home"
          className="block w-full py-3 bg-white/10 rounded-xl text-center font-bold hover:bg-white/20 transition"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
