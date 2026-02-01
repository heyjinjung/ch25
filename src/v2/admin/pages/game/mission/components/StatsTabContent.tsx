/**
 * 통계 분석 탭 컨텐츠
 * 리디자인: 2026-01 - 더 넓은 여백과 시원한 레이아웃 적용
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Badge } from "../../../../../components/ui/badge";
import { BarChart3, Target, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "../../../../../lib/utils";
import {
  useAdminMissionStats,
  useAdminLoginMissionVerify,
  useAdminActiveUserStats,
} from "../../../../../hooks/useAdminGame";

export function StatsTabContent() {
  const { data: missionStats, isLoading: isMissionStatsLoading } =
    useAdminMissionStats();
  const { data: loginVerifyData, isLoading: isLoginVerifyLoading } =
    useAdminLoginMissionVerify({ limit: 20 });
  const { data: activeUserStats } = useAdminActiveUserStats(7);

  return (
    <div className="space-y-8 p-2">
      {/* 상단 요약 카드 - 핵심 지표만 표시 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
          <div className="text-sm text-emerald-400/80 mb-1">DAU (오늘)</div>
          <div className="text-3xl font-bold text-emerald-400">
            {activeUserStats?.stats.dau.toLocaleString() ?? "-"}
          </div>
          {activeUserStats && (
            <div
              className={cn(
                "text-xs mt-1",
                activeUserStats.stats.dau_change >= 0
                  ? "text-emerald-400/70"
                  : "text-red-400/70",
              )}
            >
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {activeUserStats.stats.dau_change >= 0 ? "+" : ""}
              {(activeUserStats.stats.dau_change * 100).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20">
          <div className="text-sm text-indigo-400/80 mb-1">WAU (7일)</div>
          <div className="text-3xl font-bold text-indigo-400">
            {activeUserStats?.stats.wau.toLocaleString() ?? "-"}
          </div>
          {activeUserStats && (
            <div
              className={cn(
                "text-xs mt-1",
                activeUserStats.stats.wau_change >= 0
                  ? "text-emerald-400/70"
                  : "text-red-400/70",
              )}
            >
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {activeUserStats.stats.wau_change >= 0 ? "+" : ""}
              {(activeUserStats.stats.wau_change * 100).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20">
          <div className="text-sm text-yellow-400/80 mb-1">MAU (30일)</div>
          <div className="text-3xl font-bold text-yellow-400">
            {activeUserStats?.stats.mau.toLocaleString() ?? "-"}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
          <div className="text-sm text-cyan-400/80 mb-1">신규 가입</div>
          <div className="text-2xl font-bold text-cyan-400">
            <span className="text-3xl">
              {activeUserStats?.stats.new_users_today ?? "-"}
            </span>
            <span className="text-lg text-cyan-400/50 mx-1">/</span>
            <span className="text-xl text-cyan-400/70">
              {activeUserStats?.stats.new_users_this_week ?? "-"}
            </span>
          </div>
          <div className="text-xs text-cyan-400/50 mt-1">오늘 / 이번주</div>
        </div>
      </div>

      {/* 7일 DAU 추이 차트 */}
      {activeUserStats && (
        <Card className="bg-[#18181B]/50 border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <TrendingUp className="w-4 h-4" />
              7일 DAU 추이
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32 pt-4">
              {activeUserStats.trend.map((day, idx) => {
                const maxDau = Math.max(
                  ...activeUserStats.trend.map((d) => d.dau),
                  1,
                );
                const heightPercent = Math.max((day.dau / maxDau) * 100, 5);
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2"
                  >
                    <div className="text-xs text-zinc-400 font-medium">
                      {day.dau}
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all duration-300 hover:from-emerald-400 hover:to-emerald-300"
                      style={{ height: `${heightPercent}%`, minHeight: "8px" }}
                      title={`${day.date}: ${day.dau}명`}
                    />
                    <div className="text-[11px] text-zinc-500">
                      {day.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 미션 통계 & 로그인 검증 - 2열 그리드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Mission Stats */}
        <Card className="bg-[#18181B]/50 border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              미션별 통계
            </CardTitle>
            {missionStats && (
              <div className="flex gap-4 text-sm mt-2">
                <Badge
                  variant="outline"
                  className="border-zinc-600 text-zinc-400"
                >
                  전체 {missionStats.total_missions}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                  활성 {missionStats.active_missions}
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isMissionStatsLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                로딩 중...
              </div>
            ) : missionStats ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {missionStats.stats.slice(0, 10).map((stat) => (
                  <div
                    key={stat.mission_id}
                    className="p-4 rounded-lg bg-black/20 hover:bg-black/30 transition-colors border border-white/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 mb-1">
                          {stat.title}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-zinc-700 text-zinc-500"
                        >
                          {stat.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <div className="text-lg font-bold text-emerald-400">
                            {stat.completed_count}
                          </div>
                          <div className="text-[10px] text-zinc-500">완료</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-indigo-400">
                            {stat.claimed_count}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            클레임
                          </div>
                        </div>
                        <div className="pl-4 border-l border-white/10">
                          <div className="text-lg font-bold text-yellow-400">
                            {(stat.completion_rate * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            완료율
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Login Mission Verify */}
        <Card className="bg-[#18181B]/50 border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-cyan-400" />
              로그인 미션 검증
            </CardTitle>
            <p className="text-xs text-zinc-500 mt-1">
              오늘 로그인 미션 완료 현황
            </p>
          </CardHeader>
          <CardContent>
            {isLoginVerifyLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                로딩 중...
              </div>
            ) : loginVerifyData ? (
              <div className="space-y-5">
                {/* 요약 통계 - 더 넓은 카드 */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-4 rounded-lg bg-black/20 border border-white/5 text-center">
                    <div className="text-2xl font-bold text-zinc-200">
                      {loginVerifyData.total_users}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">전체</div>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                      {loginVerifyData.completed_today}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">완료</div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {loginVerifyData.not_completed_today}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">미완료</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {(loginVerifyData.completion_rate * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">완료율</div>
                  </div>
                </div>

                {/* 유저 목록 */}
                <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                  {loginVerifyData.users.slice(0, 10).map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 font-mono">
                          #{user.user_id}
                        </span>
                        <span className="text-sm text-zinc-200">
                          {user.nickname}
                        </span>
                      </div>
                      <Badge
                        className={cn(
                          "px-3",
                          user.today_login_completed
                            ? "bg-emerald-500/20 text-emerald-400 border-0"
                            : "bg-zinc-700/30 text-zinc-500 border-0",
                        )}
                      >
                        {user.today_login_completed ? "완료" : "미완료"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
