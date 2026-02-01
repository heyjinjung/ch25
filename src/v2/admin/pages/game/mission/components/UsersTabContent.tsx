/**
 * 유저 관리 탭 컨텐츠
 */
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import {
  UserCog,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Flame,
  RotateCcw,
  Award,
} from "lucide-react";
import { cn } from "../../../../../lib/utils";
import { CollapsibleSection } from "./CollapsibleSection";
import {
  resolveAdminUserIdentifier,
  type AdminMissionDto,
} from "../../../../../api/adminApi";
import {
  useAdminUserMissionHistory,
  useAdminForceCompleteMission,
  useAdminUpdateUserMissionProgress,
  useAdminResetUserMissionProgress,
  useAdminClaimUserMissionReward,
  useAdminUserStreak,
  useAdminResetUserStreak,
  useAdminSetUserStreakCount,
  useAdminUserMilestoneProgress,
  useAdminForceGrantMilestone,
  useAdminResetUserMissions,
} from "../../../../../hooks/useAdminGame";

interface UsersTabContentProps {
  missions: AdminMissionDto[];
}

export function UsersTabContent({ missions }: UsersTabContentProps) {
  // User Mission Management
  const [userMissionUserIdInput, setUserMissionUserIdInput] = useState("");
  const [userMissionUserId, setUserMissionUserId] = useState<number | null>(
    null,
  );
  const [userMissionUserLabel, setUserMissionUserLabel] = useState<string>("");
  const [userMissionError, setUserMissionError] = useState<string | null>(null);
  const [userMissionNotice, setUserMissionNotice] = useState<string | null>(
    null,
  );
  const [progressEdits, setProgressEdits] = useState<Record<number, string>>(
    {},
  );

  const { data: userMissions = [], isLoading: isUserMissionsLoading } =
    useAdminUserMissionHistory(userMissionUserId ?? undefined);
  const forceCompleteMutation = useAdminForceCompleteMission();
  const updateProgressMutation = useAdminUpdateUserMissionProgress();
  const resetProgressMutation = useAdminResetUserMissionProgress();
  const claimRewardMutation = useAdminClaimUserMissionReward();

  // Streak & Milestone
  const [streakUserIdInput, setStreakUserIdInput] = useState("");
  const [streakUserId, setStreakUserId] = useState<number | null>(null);
  const [streakEditValue, setStreakEditValue] = useState("");
  const [milestoneDay, setMilestoneDay] = useState(3);
  const [milestoneReason, setMilestoneReason] = useState("");

  const { data: streakData, isLoading: isStreakLoading } = useAdminUserStreak(
    streakUserId ?? undefined,
  );
  const { data: milestoneData, isLoading: isMilestoneLoading } =
    useAdminUserMilestoneProgress(streakUserId ?? undefined);
  const resetStreakMutation = useAdminResetUserStreak();
  const setStreakCountMutation = useAdminSetUserStreakCount();
  const forceGrantMilestoneMutation = useAdminForceGrantMilestone();

  // Mission Reset
  const [missionResetReason, setMissionResetReason] = useState("");
  const [selectedMissionIdForReset, setSelectedMissionIdForReset] = useState<
    number | null
  >(null);
  const resetUserMissionsMutation = useAdminResetUserMissions();

  // Handlers
  const handleLoadUserMissions = async () => {
    const raw = userMissionUserIdInput.trim();
    if (!raw) {
      setUserMissionError("유저 ID 또는 닉네임을 입력하세요.");
      setUserMissionNotice(null);
      return;
    }

    if (/^\d+$/.test(raw)) {
      const parsed = parseInt(raw, 10);
      if (!parsed || parsed <= 0) {
        setUserMissionError("유저 ID 또는 닉네임을 입력하세요.");
        return;
      }
      setUserMissionError(null);
      setUserMissionNotice(null);
      setUserMissionUserId(parsed);
      setUserMissionUserLabel(`USER #${parsed}`);
      return;
    }

    try {
      setUserMissionError(null);
      const resolved = await resolveAdminUserIdentifier(raw);
      setUserMissionUserId(resolved.userId);
      setUserMissionUserLabel(
        `${resolved.nickname} (USER #${resolved.userId})`,
      );
    } catch {
      setUserMissionUserId(null);
      setUserMissionUserLabel("");
      setUserMissionError("닉네임으로 유저를 찾을 수 없습니다.");
    }
  };

  const handleProgressChange = (missionId: number, value: string) => {
    setProgressEdits((prev) => ({ ...prev, [missionId]: value }));
  };

  const handleSaveProgress = (missionId: number, fallback: number) => {
    if (!userMissionUserId) return;
    const raw = progressEdits[missionId];
    const parsed =
      raw === undefined || raw.trim() === "" ? fallback : Number(raw);
    if (Number.isNaN(parsed) || parsed < 0) {
      setUserMissionError("진행값은 0 이상의 숫자여야 합니다.");
      return;
    }
    setUserMissionError(null);
    updateProgressMutation.mutate({
      userId: userMissionUserId,
      missionId,
      payload: { currentValue: parsed },
    });
  };

  const handleResetProgress = (missionId: number) => {
    if (!userMissionUserId) return;
    resetProgressMutation.mutate({ userId: userMissionUserId, missionId });
  };

  const handleForceComplete = (missionId: number) => {
    if (!userMissionUserId) return;
    forceCompleteMutation.mutate({ userId: userMissionUserId, missionId });
  };

  const handleClaimReward = async (missionId: number) => {
    if (!userMissionUserId) return;
    setUserMissionError(null);
    setUserMissionNotice(null);
    try {
      const res = await claimRewardMutation.mutateAsync({
        userId: userMissionUserId,
        missionId,
      });
      if (!res.success) {
        setUserMissionError(res.message || "보상 지급 실패");
        return;
      }
      const rewardLabel = res.rewardType ? `${res.rewardType}` : "보상";
      setUserMissionNotice(`${rewardLabel} ${res.rewardAmount ?? 0} 지급 완료`);
    } catch {
      setUserMissionError("보상 지급 실패");
    }
  };

  return (
    <div className="space-y-6">
      {/* User Mission Management */}
      <Card className="bg-[#18181B] border-white/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCog className="w-5 h-5 text-emerald-400" />
            유저 미션 관리
          </CardTitle>
          <p className="text-xs text-zinc-500">
            진행값 수정, 강제 완료, 보상 지급
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={userMissionUserIdInput}
                onChange={(e) => setUserMissionUserIdInput(e.target.value)}
                placeholder="유저 ID 또는 닉네임"
                className="pl-10 bg-black/50 border-white/10"
                onKeyDown={(e) => e.key === "Enter" && handleLoadUserMissions()}
              />
            </div>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={handleLoadUserMissions}
            >
              조회
            </Button>
            {userMissionUserId && (
              <Badge
                variant="outline"
                className="bg-white/5 text-zinc-300 border-white/10"
              >
                {userMissionUserLabel}
              </Badge>
            )}
          </div>

          {userMissionError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {userMissionError}
            </div>
          )}
          {userMissionNotice && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              {userMissionNotice}
            </div>
          )}

          {isUserMissionsLoading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              로딩 중...
            </div>
          ) : userMissionUserId && userMissions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              유저 미션 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {userMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 rounded-lg border border-white/5 bg-black/30 hover:bg-black/50 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {mission.missionTitle}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {mission.category} · 진행: {mission.progress}/
                        {mission.maxProgress}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        mission.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : mission.status === "FAILED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-zinc-500/20 text-zinc-400",
                      )}
                    >
                      {mission.status === "COMPLETED"
                        ? "완료"
                        : mission.status === "FAILED"
                          ? "실패"
                          : mission.status === "IN_PROGRESS"
                            ? "진행중"
                            : mission.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={
                        progressEdits[mission.missionId] ??
                        String(mission.progress)
                      }
                      onChange={(e) =>
                        handleProgressChange(mission.missionId, e.target.value)
                      }
                      className="w-24 bg-black/50 border-white/10 text-right"
                      type="number"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleSaveProgress(mission.missionId, mission.progress)
                      }
                    >
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResetProgress(mission.missionId)}
                    >
                      리셋
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleForceComplete(mission.missionId)}
                    >
                      강제완료
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-500/90 hover:bg-indigo-500"
                      onClick={() => handleClaimReward(mission.missionId)}
                    >
                      보상지급
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak & Milestone Section */}
      <CollapsibleSection
        title="스트릭 & 마일스톤"
        subtitle="유저 스트릭 조회/수정, 마일스톤 보상"
        icon={<Flame className="w-4 h-4" />}
        iconColor="text-orange-400"
        defaultOpen
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={streakUserIdInput}
              onChange={(e) => setStreakUserIdInput(e.target.value)}
              placeholder="유저 ID"
              className="w-32 bg-black/50 border-white/10"
            />
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => {
                const parsed = parseInt(streakUserIdInput, 10);
                if (parsed > 0) setStreakUserId(parsed);
              }}
            >
              조회
            </Button>
            {streakUserId && (
              <Badge
                variant="outline"
                className="bg-white/5 text-zinc-300 border-white/10"
              >
                USER #{streakUserId}
              </Badge>
            )}
          </div>

          {isStreakLoading && (
            <div className="text-sm text-zinc-500">로딩 중...</div>
          )}

          {streakData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-black/30 border border-white/5">
              <div>
                <div className="text-xs text-zinc-500">스트릭 일수</div>
                <div className="text-2xl font-bold text-orange-400">
                  {streakData.streak_days}일
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">상태</div>
                <div className="flex gap-2 mt-1">
                  {streakData.is_hot && (
                    <Badge className="bg-red-500/20 text-red-400">HOT</Badge>
                  )}
                  {streakData.is_legend && (
                    <Badge className="bg-purple-500/20 text-purple-400">
                      LEGEND
                    </Badge>
                  )}
                  {!streakData.is_hot && !streakData.is_legend && (
                    <Badge className="bg-zinc-500/20 text-zinc-400">일반</Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">다음 마일스톤</div>
                <div className="text-lg font-semibold text-zinc-200">
                  {streakData.next_milestone ?? "-"}일
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">배율</div>
                <div className="text-lg font-semibold text-emerald-400">
                  x{streakData.current_multiplier}
                </div>
              </div>
            </div>
          )}

          {streakUserId && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={streakEditValue}
                onChange={(e) => setStreakEditValue(e.target.value)}
                placeholder="스트릭 일수"
                className="w-28 bg-black/50 border-white/10"
                type="number"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const val = parseInt(streakEditValue, 10);
                  if (val >= 0 && streakUserId) {
                    setStreakCountMutation.mutate({
                      userId: streakUserId,
                      payload: { streak_days: val },
                    });
                  }
                }}
                disabled={setStreakCountMutation.isPending}
              >
                스트릭 설정
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="text-red-400"
                onClick={() => {
                  if (
                    streakUserId &&
                    confirm("스트릭을 0으로 초기화하시겠습니까?")
                  ) {
                    resetStreakMutation.mutate(streakUserId);
                  }
                }}
                disabled={resetStreakMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                리셋
              </Button>
            </div>
          )}

          {/* Milestone Progress */}
          {isMilestoneLoading && (
            <div className="text-sm text-zinc-500">마일스톤 로딩 중...</div>
          )}
          {milestoneData && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-zinc-300">
                마일스톤 진행 현황
              </div>
              <div className="flex flex-wrap gap-2">
                {milestoneData.milestones.map((m) => (
                  <div
                    key={m.day}
                    className={cn(
                      "px-3 py-2 rounded-lg border",
                      m.claimed
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : m.achieved
                          ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                          : "bg-zinc-800/50 border-white/5 text-zinc-500",
                    )}
                  >
                    <div className="text-xs font-bold">{m.day}일</div>
                    <div className="text-[10px]">
                      {m.claimed ? "수령완료" : m.achieved ? "달성" : "미달성"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Force Grant Milestone */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Select
                  value={String(milestoneDay)}
                  onValueChange={(v) => setMilestoneDay(Number(v))}
                >
                  <SelectTrigger className="w-24 bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white">
                    {[3, 7, 14, 30].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}일
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={milestoneReason}
                  onChange={(e) => setMilestoneReason(e.target.value)}
                  placeholder="지급 사유"
                  className="w-40 bg-black/50 border-white/10"
                />
                <Button
                  size="sm"
                  className="bg-purple-500 hover:bg-purple-600"
                  onClick={() => {
                    if (streakUserId && milestoneReason) {
                      forceGrantMilestoneMutation.mutate({
                        userId: streakUserId,
                        payload: {
                          milestone_day: milestoneDay,
                          reason: milestoneReason,
                        },
                      });
                    }
                  }}
                  disabled={forceGrantMilestoneMutation.isPending}
                >
                  <Award className="w-4 h-4 mr-1" />
                  마일스톤 지급
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Mission Reset Section */}
      <CollapsibleSection
        title="미션 일괄 리셋"
        subtitle="특정 유저의 미션 진행 상태 초기화"
        icon={<RotateCcw className="w-4 h-4" />}
        iconColor="text-red-400"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={userMissionUserIdInput}
            onChange={(e) => setUserMissionUserIdInput(e.target.value)}
            placeholder="유저 ID"
            className="w-32 bg-black/50 border-white/10"
          />
          <Select
            value={
              selectedMissionIdForReset === null
                ? "all"
                : String(selectedMissionIdForReset)
            }
            onValueChange={(v) =>
              setSelectedMissionIdForReset(v === "all" ? null : Number(v))
            }
          >
            <SelectTrigger className="w-48 bg-black/50 border-white/10">
              <SelectValue placeholder="미션 선택" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-60">
              <SelectItem value="all">전체 미션</SelectItem>
              {missions.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={missionResetReason}
            onChange={(e) => setMissionResetReason(e.target.value)}
            placeholder="리셋 사유"
            className="w-40 bg-black/50 border-white/10"
          />
          <Button
            className="bg-red-500 hover:bg-red-600"
            onClick={() => {
              const userId = parseInt(userMissionUserIdInput, 10);
              if (userId > 0 && missionResetReason) {
                resetUserMissionsMutation.mutate({
                  userId,
                  payload: {
                    mission_id: selectedMissionIdForReset,
                    reason: missionResetReason,
                  },
                });
              }
            }}
            disabled={resetUserMissionsMutation.isPending}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            리셋
          </Button>
        </div>
        {resetUserMissionsMutation.isSuccess &&
          resetUserMissionsMutation.data && (
            <div className="mt-3 text-sm text-emerald-400">
              리셋 완료: {resetUserMissionsMutation.data.reset_count}개 미션
            </div>
          )}
      </CollapsibleSection>
    </div>
  );
}
