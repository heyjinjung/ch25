import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Search,
  Filter,
  ChevronRight,
  Zap,
  MessageSquare,
  PhoneCall,
} from "lucide-react";
import { Input } from "../../../components/ui/input";
import { useOpsStatus } from "../../../hooks/useV2Admin";
import { useMemo, useState } from "react";
import { UserDetailDrawer } from "../users/UserDetailDrawer";
import styles from "./CrisisRadarPage.module.css";

export default function CrisisRadarPage() {
  const { data: status } = useOpsStatus();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleUserClick = (userId: number) => {
    setSelectedUserId(userId);
    setIsDrawerOpen(true);
  };

  const riskyUsers = status?.goldenRadar.riskUsers || [];
  const avgChurnScore = useMemo(() => {
    if (typeof status?.goldenRadar.avgChurnScore === "number") {
      return status.goldenRadar.avgChurnScore;
    }
    if (!riskyUsers.length) return null;
    const sum = riskyUsers.reduce((acc, cur) => acc + cur.churnScore, 0);
    return sum / riskyUsers.length;
  }, [riskyUsers, status]);
  const radarAccuracy = status?.goldenRadar.radarAccuracy;
  const interventionsToday = status?.goldenRadar.interventionsToday;
  const interventionSuccessRate = status?.goldenRadar.interventionSuccessRate;

  return (
    <div className="space-y-8 text-white">
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="border-obsidian-border text-obsidian-muted hover:text-white hover:bg-white/5"
        >
          한 번에 선물 주기
        </Button>
        <Button className="bg-red-500 text-white hover:bg-red-600">
          이탈 감지 예민도 설정
        </Button>
      </div>

      {/* Main Analysis Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-obsidian-surface border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-red-400 uppercase tracking-widest">
              매우 위험 (긴급)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">
              {riskyUsers.filter((u) => u.riskLevel === "HIGH").length}
            </div>
            <p className="text-[10px] text-red-400/60 mt-1">
              지금 바로 조치 필요
            </p>
          </CardContent>
        </Card>
        <Card className="bg-obsidian-surface border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              주의 (관심 필요)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">
              {riskyUsers.filter((u) => u.riskLevel === "MEDIUM").length}
            </div>
            <p className="text-[10px] text-amber-400/60 mt-1">나갈 징후 보임</p>
          </CardContent>
        </Card>
        <Card className="bg-obsidian-surface border-obsidian-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-obsidian-muted uppercase tracking-widest">
              평균 이탈 위험도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {avgChurnScore === null
                ? "-"
                : `${Math.round(avgChurnScore * 100)}%`}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              정확도:{" "}
              {typeof radarAccuracy === "number"
                ? `${Math.round(radarAccuracy * 100)}%`
                : "데이터 없음"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-obsidian-surface border-indigo-500/20 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              오늘의 조치 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-400">
              {typeof interventionsToday === "number"
                ? interventionsToday
                : "-"}
            </div>
            <p className="text-[10px] text-indigo-400/60 mt-1">
              성공률(다시 돌아온 비율):{" "}
              {typeof interventionSuccessRate === "number"
                ? `${Math.round(interventionSuccessRate * 100)}%`
                : "데이터 없음"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Table / List */}
      <Card className="bg-obsidian-surface border-obsidian-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">곧 떠날 위험 유저 목록</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                placeholder="유저 검색..."
                className="bg-black/20 border-obsidian-border pl-9 h-9 w-[200px] text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-obsidian-border"
            >
              <Filter className="w-4 h-4 mr-2" /> 필터
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-zinc-500 uppercase tracking-wider border-y border-obsidian-border bg-white/5">
                <tr>
                  <th className="px-6 py-3 font-medium">사용자명</th>
                  <th className="px-6 py-3 font-medium">이탈 위험 점수</th>
                  <th className="px-6 py-3 font-medium">심각도</th>
                  <th className="px-6 py-3 font-medium">왜 떠나려 하나요?</th>
                  <th className="px-6 py-3 font-medium text-right">
                    지금 바로 조치
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border">
                {riskyUsers
                  .filter((u) =>
                    u.nickname.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((u) => (
                    <tr
                      key={u.userId}
                      className="hover:bg-white/[0.02] group transition-colors"
                    >
                      <td
                        className="px-6 py-4 font-bold text-white cursor-pointer"
                        onClick={() => handleUserClick(u.userId)}
                      >
                        {u.nickname}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <progress
                              value={u.churnScore * 100}
                              max={100}
                              className={`${styles.riskBar} ${u.riskLevel === "HIGH" ? styles.riskHigh : styles.riskMedium}`}
                              aria-label="이탈 위험 점수"
                            />
                          </div>
                          <span className="text-[10px] font-mono text-obsidian-muted">
                            {(u.churnScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.riskLevel === "HIGH" ? (
                          <Badge className="bg-red-500/10 text-red-500 border-none h-5 text-[10px]">
                            매우 위험
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-500 border-none h-5 text-[10px]">
                            주의
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">
                        {u.riskReason || "너무 많이 잃고 있음"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-500 hover:text-indigo-400"
                            title="회생 선물 (위로금)"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-500 hover:text-indigo-400"
                            title="메시지 전송"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-500 hover:text-indigo-400"
                            title="CRM 전화"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-zinc-400 group-hover:text-white"
                            onClick={() => handleUserClick(u.userId)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <UserDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        userId={selectedUserId}
      />
    </div>
  );
}
