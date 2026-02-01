/**
 * 통계 분석 탭 컨텐츠
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Badge } from "../../../../../components/ui/badge";
import { BarChart3, Target, Users, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "../../../../../lib/utils";
import styles from "../../MissionManagerPage.module.css";
import {
  useAdminMissionStats,
  useAdminLoginMissionVerify,
  useAdminActiveUserStats,
} from "../../../../../hooks/useAdminGame";
import { getTrendHeightClass } from "../utils/missionHelpers";

export function StatsTabContent() {
  const { data: missionStats, isLoading: isMissionStatsLoading } =
    useAdminMissionStats();
  const { data: loginVerifyData, isLoading: isLoginVerifyLoading } =
    useAdminLoginMissionVerify({ limit: 20 });
  const { data: activeUserStats, isLoading: isActiveUserStatsLoading } =
    useAdminActiveUserStats(7);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission Stats */}
        <Card className="bg-[#18181B] border-white/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              미션 통계
            </CardTitle>
            <p className="text-xs text-zinc-500">
              미션별 완료율 및 클레임 현황
            </p>
          </CardHeader>
          <CardContent>
            {isMissionStatsLoading ? (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                로딩 중...
              </div>
            ) : missionStats ? (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">전체: </span>
                    <span className="font-bold text-zinc-200">
                      {missionStats.total_missions}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">활성: </span>
                    <span className="font-bold text-emerald-400">
                      {missionStats.active_missions}
                    </span>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {missionStats.stats.slice(0, 10).map((stat) => (
                    <div
                      key={stat.mission_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">
                          {stat.title}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {stat.category}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <div className="text-zinc-500">완료</div>
                          <div className="font-bold text-emerald-400">
                            {stat.completed_count}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-500">클레임</div>
                          <div className="font-bold text-indigo-400">
                            {stat.claimed_count}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-500">완료율</div>
                          <div className="font-bold text-yellow-400">
                            {(stat.completion_rate * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Login Mission Verify */}
        <Card className="bg-[#18181B] border-white/5">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-cyan-400" />
              로그인 미션 검증
            </CardTitle>
            <p className="text-xs text-zinc-500">오늘 로그인 미션 완료 현황</p>
          </CardHeader>
          <CardContent>
            {isLoginVerifyLoading ? (
              <div className="flex items-center justify-center py-8 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                로딩 중...
              </div>
            ) : loginVerifyData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-black/30 border border-white/5">
                    <div className="text-xs text-zinc-500">전체</div>
                    <div className="text-lg font-bold text-zinc-200">
                      {loginVerifyData.total_users}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <div className="text-xs text-zinc-500">완료</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {loginVerifyData.completed_today}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="text-xs text-zinc-500">미완료</div>
                    <div className="text-lg font-bold text-red-400">
                      {loginVerifyData.not_completed_today}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="text-xs text-zinc-500">완료율</div>
                    <div className="text-lg font-bold text-yellow-400">
                      {(loginVerifyData.completion_rate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {loginVerifyData.users.slice(0, 10).map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-2 rounded bg-black/30 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">#{user.user_id}</span>
                        <span className="text-zinc-200">{user.nickname}</span>
                      </div>
                      <Badge
                        className={
                          user.today_login_completed
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-zinc-500/20 text-zinc-400"
                        }
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

      {/* Active User Stats */}
      <Card className="bg-[#18181B] border-white/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-emerald-400" />
            활성 유저 통계
          </CardTitle>
          <p className="text-xs text-zinc-500">
            DAU / WAU / MAU 및 신규 가입자 현황
          </p>
        </CardHeader>
        <CardContent>
          {isActiveUserStatsLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              로딩 중...
            </div>
          ) : activeUserStats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-xs text-zinc-500">DAU (오늘)</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {activeUserStats.stats.dau.toLocaleString()}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      activeUserStats.stats.dau_change >= 0
                        ? "text-emerald-400"
                        : "text-red-400",
                    )}
                  >
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {activeUserStats.stats.dau_change >= 0 ? "+" : ""}
                    {(activeUserStats.stats.dau_change * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-xs text-zinc-500">WAU (7일)</div>
                  <div className="text-2xl font-bold text-indigo-400">
                    {activeUserStats.stats.wau.toLocaleString()}
                  </div>
                  <div
                    className={cn(
                      "text-xs",
                      activeUserStats.stats.wau_change >= 0
                        ? "text-emerald-400"
                        : "text-red-400",
                    )}
                  >
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {activeUserStats.stats.wau_change >= 0 ? "+" : ""}
                    {(activeUserStats.stats.wau_change * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-xs text-zinc-500">MAU (30일)</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {activeUserStats.stats.mau.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                  <div className="text-xs text-zinc-500">
                    신규 (오늘/이번주)
                  </div>
                  <div className="text-xl font-bold text-cyan-400">
                    {activeUserStats.stats.new_users_today} /{" "}
                    {activeUserStats.stats.new_users_this_week}
                  </div>
                </div>
              </div>

              {/* 7-day DAU Trend */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-zinc-300">
                  7일 DAU 추이
                </div>
                <div className="flex items-end gap-1 h-24 p-4 rounded-lg bg-black/30 border border-white/5">
                  {activeUserStats.trend.map((day, idx) => {
                    const maxDau = Math.max(
                      ...activeUserStats.trend.map((d) => d.dau),
                      1,
                    );
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className={cn(
                            "w-full bg-emerald-500/50 rounded-t",
                            styles.trendBar,
                            getTrendHeightClass(day.dau, maxDau),
                          )}
                          title={`${day.date}: ${day.dau}명`}
                        />
                        <div className="text-[10px] text-zinc-500">
                          {day.date.slice(5)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
