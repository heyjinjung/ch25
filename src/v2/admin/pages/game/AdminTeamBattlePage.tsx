import { useMemo, useState } from "react";
import {
  useAdminAdjustTeamBattleScore,
  useAdminCreateTeamBattleSeason,
  useAdminCreateTeamBattleTeam,
  useAdminEndTeamBattleSeason,
  useAdminForceJoinTeamBattle,
  useAdminForceLeaveTeamBattle,
  useAdminTeamBattleTeamMembers,
  useAdminTeamBattleMemberContributions,
  useAdminUpdateTeamBattleMemberJoinedAt,
  useAdminAdjustTeamBattleMemberContribution,
  useAdminTeamBattleSeasons,
  useAdminTeamBattleTeams,
} from "../../../hooks/useAdminGame";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { resolveAdminUserIdentifier } from "../../../api/adminApi";

const toIsoString = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const toDatetimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function AdminTeamBattlePage() {
  const { data: seasons = [], isLoading: isSeasonsLoading } =
    useAdminTeamBattleSeasons();
  const { data: teams = [], isLoading: isTeamsLoading } =
    useAdminTeamBattleTeams();

  const createSeasonMutation = useAdminCreateTeamBattleSeason();
  const endSeasonMutation = useAdminEndTeamBattleSeason();
  const createTeamMutation = useAdminCreateTeamBattleTeam();
  const adjustScoreMutation = useAdminAdjustTeamBattleScore();
  const forceJoinMutation = useAdminForceJoinTeamBattle();
  const forceLeaveMutation = useAdminForceLeaveTeamBattle();
  const updateMemberJoinedAtMutation = useAdminUpdateTeamBattleMemberJoinedAt();
  const adjustMemberContributionMutation =
    useAdminAdjustTeamBattleMemberContribution();

  const [seasonForm, setSeasonForm] = useState({
    name: "",
    starts_at: "",
    ends_at: "",
    is_active: false,
  });
  const [teamForm, setTeamForm] = useState({ name: "", icon: "" });
  const [scoreForm, setScoreForm] = useState({
    seasonId: "",
    teamId: "",
    delta: "",
    reason: "",
  });
  const [forceJoinForm, setForceJoinForm] = useState({
    userId: "",
    teamId: "",
    reason: "Admin forced join",
  });
  const [forceLeaveForm, setForceLeaveForm] = useState({
    userId: "",
    reason: "Admin forced leave",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState({
    teamId: "",
    seasonId: "",
  });
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [memberJoinedAt, setMemberJoinedAt] = useState("");
  const [memberJoinedReason, setMemberJoinedReason] = useState(
    "Admin joined_at update",
  );
  const [contributionDelta, setContributionDelta] = useState("");
  const [contributionReason, setContributionReason] =
    useState("관리자 기여도 조정");
  const [contributionAction, setContributionAction] = useState("ADMIN_ADJUST");
  const [resolvedJoinUserId, setResolvedJoinUserId] = useState<number | null>(
    null,
  );
  const [resolvedJoinUserInfo, setResolvedJoinUserInfo] = useState<{
    userId: number;
    nickname: string;
    ccId: string;
  } | null>(null);
  const [resolvedLeaveUserId, setResolvedLeaveUserId] = useState<number | null>(
    null,
  );
  const [resolvedLeaveUserInfo, setResolvedLeaveUserInfo] = useState<{
    userId: number;
    nickname: string;
    ccId: string;
  } | null>(null);

  const memberTeamId = memberFilter.teamId
    ? Number(memberFilter.teamId)
    : undefined;
  const memberSeasonId = memberFilter.seasonId
    ? Number(memberFilter.seasonId)
    : null;
  const { data: teamMembers, isLoading: isMembersLoading } =
    useAdminTeamBattleTeamMembers(memberTeamId, memberSeasonId);
  const { data: memberContributions, isLoading: isContribLoading } =
    useAdminTeamBattleMemberContributions(
      memberTeamId,
      selectedMemberId ?? undefined,
      memberSeasonId,
    );

  const selectedMember = useMemo(() => {
    if (!teamMembers?.members || !selectedMemberId) return null;
    return (
      teamMembers.members.find(
        (member) => member.user_id === selectedMemberId,
      ) ?? null
    );
  }, [teamMembers, selectedMemberId]);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.is_active) ?? null,
    [seasons],
  );

  const handleCreateSeason = () => {
    setNotice(null);
    setError(null);
    if (!seasonForm.name.trim()) {
      setError("시즌명을 입력하세요.");
      return;
    }
    const startsAt = toIsoString(seasonForm.starts_at);
    const endsAt = toIsoString(seasonForm.ends_at);
    if (!startsAt || !endsAt) {
      setError("시작/종료 시간을 입력하세요.");
      return;
    }
    createSeasonMutation.mutate(
      {
        name: seasonForm.name.trim(),
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: seasonForm.is_active,
      },
      {
        onSuccess: () => {
          setNotice("시즌 생성 완료");
          setSeasonForm({
            name: "",
            starts_at: "",
            ends_at: "",
            is_active: false,
          });
        },
        onError: () => setError("시즌 생성 실패"),
      },
    );
  };

  const handleEndSeason = (seasonId: number) => {
    setNotice(null);
    setError(null);
    endSeasonMutation.mutate(
      { seasonId, distributeRewards: false },
      {
        onSuccess: () => setNotice("시즌 종료 처리 완료"),
        onError: () => setError("시즌 종료 실패"),
      },
    );
  };

  const handleCreateTeam = () => {
    setNotice(null);
    setError(null);
    if (!teamForm.name.trim()) {
      setError("팀명을 입력하세요.");
      return;
    }
    createTeamMutation.mutate(
      { name: teamForm.name.trim(), icon: teamForm.icon || undefined },
      {
        onSuccess: () => {
          setNotice("팀 생성 완료");
          setTeamForm({ name: "", icon: "" });
        },
        onError: () => setError("팀 생성 실패"),
      },
    );
  };

  const handleAdjustScore = () => {
    setNotice(null);
    setError(null);
    const seasonId = Number(scoreForm.seasonId);
    const teamId = Number(scoreForm.teamId);
    const delta = Number(scoreForm.delta);
    if (!seasonId || !teamId || Number.isNaN(delta)) {
      setError("시즌/팀/점수 정보를 입력하세요.");
      return;
    }
    if (!scoreForm.reason.trim()) {
      setError("조정 사유를 입력하세요.");
      return;
    }
    adjustScoreMutation.mutate(
      {
        season_id: seasonId,
        team_id: teamId,
        delta,
        reason: scoreForm.reason.trim(),
      },
      {
        onSuccess: () => setNotice("점수 조정 완료"),
        onError: () => setError("점수 조정 실패"),
      },
    );
  };

  const handleSearchJoinUser = async () => {
    setNotice(null);
    setError(null);
    setResolvedJoinUserInfo(null);

    if (!forceJoinForm.userId.trim()) {
      setError("유저 ID 또는 닉네임을 입력하세요.");
      return;
    }

    try {
      const resolved = await resolveAdminUserIdentifier(
        forceJoinForm.userId.trim(),
      );
      setResolvedJoinUserId(resolved.userId);
      setResolvedJoinUserInfo({
        userId: resolved.userId,
        nickname: resolved.nickname,
        ccId: resolved.ccId,
      });
      setNotice(`유저 조회 완료`);
    } catch (err: any) {
      setError(
        `유저 조회 실패: ${err.response?.data?.detail || "알 수 없는 오류"}`,
      );
    }
  };

  const handleForceJoin = async () => {
    setNotice(null);
    setError(null);

    let userId = resolvedJoinUserId;

    // If no resolved user, try to resolve
    if (!userId) {
      if (!forceJoinForm.userId.trim()) {
        setError("유저를 먼저 조회하세요.");
        return;
      }

      try {
        const resolved = await resolveAdminUserIdentifier(
          forceJoinForm.userId.trim(),
        );
        userId = resolved.userId;
        setResolvedJoinUserId(userId);
        setResolvedJoinUserInfo({
          userId: resolved.userId,
          nickname: resolved.nickname,
          ccId: resolved.ccId,
        });
      } catch (err: any) {
        setError(
          `유저 조회 실패: ${err.response?.data?.detail || "알 수 없는 오류"}`,
        );
        return;
      }
    }

    const teamId = Number(forceJoinForm.teamId);
    if (!userId || !teamId) {
      setError("유저 ID와 팀 ID를 입력하세요.");
      return;
    }

    forceJoinMutation.mutate(
      {
        user_id: userId,
        team_id: teamId,
        reason: forceJoinForm.reason || "Admin forced join",
      },
      {
        onSuccess: () => {
          setNotice("강제 팀 가입 완료");
          setForceJoinForm({
            userId: "",
            teamId: "",
            reason: "Admin forced join",
          });
          setResolvedJoinUserId(null);
          setResolvedJoinUserInfo(null);
        },
        onError: () => setError("강제 팀 가입 실패"),
      },
    );
  };

  const handleSearchLeaveUser = async () => {
    setNotice(null);
    setError(null);
    setResolvedLeaveUserInfo(null);

    if (!forceLeaveForm.userId.trim()) {
      setError("유저 ID 또는 닉네임을 입력하세요.");
      return;
    }

    try {
      const resolved = await resolveAdminUserIdentifier(
        forceLeaveForm.userId.trim(),
      );
      setResolvedLeaveUserId(resolved.userId);
      setResolvedLeaveUserInfo({
        userId: resolved.userId,
        nickname: resolved.nickname,
        ccId: resolved.ccId,
      });
      setNotice(`유저 조회 완료`);
    } catch (err: any) {
      setError(
        `유저 조회 실패: ${err.response?.data?.detail || "알 수 없는 오류"}`,
      );
    }
  };

  const handleForceLeave = async () => {
    setNotice(null);
    setError(null);

    let userId = resolvedLeaveUserId;

    // If no resolved user, try to resolve
    if (!userId) {
      if (!forceLeaveForm.userId.trim()) {
        setError("유저를 먼저 조회하세요.");
        return;
      }

      try {
        const resolved = await resolveAdminUserIdentifier(
          forceLeaveForm.userId.trim(),
        );
        userId = resolved.userId;
        setResolvedLeaveUserId(userId);
        setResolvedLeaveUserInfo({
          userId: resolved.userId,
          nickname: resolved.nickname,
          ccId: resolved.ccId,
        });
      } catch (err: any) {
        setError(
          `유저 조회 실패: ${err.response?.data?.detail || "알 수 없는 오류"}`,
        );
        return;
      }
    }

    if (!userId) {
      setError("유저 ID를 입력하세요.");
      return;
    }

    forceLeaveMutation.mutate(
      {
        user_id: userId,
        reason: forceLeaveForm.reason || "Admin forced leave",
      },
      {
        onSuccess: () => {
          setNotice("강제 팀 탈퇴 완료");
          setForceLeaveForm({ userId: "", reason: "Admin forced leave" });
          setResolvedLeaveUserId(null);
          setResolvedLeaveUserInfo(null);
        },
        onError: () => setError("강제 팀 탈퇴 실패"),
      },
    );
  };

  const handleSelectMember = (userId: number, joinedAt: string | null) => {
    setSelectedMemberId(userId);
    setMemberJoinedAt(toDatetimeLocal(joinedAt));
    setContributionDelta("");
    setContributionReason("관리자 기여도 조정");
    setContributionAction("ADMIN_ADJUST");
  };

  const handleUpdateMemberJoinedAt = () => {
    setNotice(null);
    setError(null);
    if (!selectedMemberId) {
      setError("멤버를 선택하세요.");
      return;
    }
    const joinedAtIso = toIsoString(memberJoinedAt);
    if (!joinedAtIso) {
      setError("가입일을 입력하세요.");
      return;
    }
    if (!memberJoinedReason.trim()) {
      setError("사유를 입력하세요.");
      return;
    }
    updateMemberJoinedAtMutation.mutate(
      {
        userId: selectedMemberId,
        payload: { joined_at: joinedAtIso, reason: memberJoinedReason.trim() },
      },
      {
        onSuccess: () => setNotice("가입일 수정 완료"),
        onError: () => setError("가입일 수정 실패"),
      },
    );
  };

  const handleAdjustMemberContribution = () => {
    setNotice(null);
    setError(null);
    if (!selectedMemberId || !memberTeamId) {
      setError("팀과 멤버를 선택하세요.");
      return;
    }
    const delta = Number(contributionDelta);
    if (Number.isNaN(delta) || delta === 0) {
      setError("기여도 변경량을 입력하세요.");
      return;
    }
    if (!contributionReason.trim()) {
      setError("사유를 입력하세요.");
      return;
    }
    adjustMemberContributionMutation.mutate(
      {
        team_id: memberTeamId,
        user_id: selectedMemberId,
        delta,
        reason: contributionReason.trim(),
        season_id: memberSeasonId ?? undefined,
        action: contributionAction.trim() || "ADMIN_ADJUST",
      },
      {
        onSuccess: () => setNotice("기여도 조정 완료"),
        onError: () => setError("기여도 조정 실패"),
      },
    );
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">팀 배틀 어드민</h1>
          <p className="text-sm text-zinc-400">
            시즌/팀 관리 및 점수/멤버 강제 조정을 제공합니다.
          </p>
        </div>
        {activeSeason && (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            ACTIVE: {activeSeason.name}
          </Badge>
        )}
      </div>

      {(notice || error) && (
        <div className="text-sm">
          {notice && <p className="text-emerald-400">{notice}</p>}
          {error && <p className="text-red-400">{error}</p>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#18181B] border-white/5 p-4 space-y-3">
          <h2 className="text-lg font-semibold">시즌 목록</h2>
          {isSeasonsLoading ? (
            <p className="text-sm text-zinc-500">시즌 로딩 중...</p>
          ) : seasons.length === 0 ? (
            <p className="text-sm text-zinc-500">등록된 시즌이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {seasons.map((season) => (
                <div
                  key={season.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 p-3"
                >
                  <div>
                    <div className="font-semibold">{season.name}</div>
                    <div className="text-xs text-zinc-500">
                      {season.starts_at || "-"} ~ {season.ends_at || "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {season.is_active && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        ACTIVE
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 text-zinc-200"
                      onClick={() => handleEndSeason(season.id)}
                    >
                      종료
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-[#18181B] border-white/5 p-4 space-y-3">
          <h2 className="text-lg font-semibold">시즌 생성</h2>
          <Input
            placeholder="시즌명"
            value={seasonForm.name}
            onChange={(e) =>
              setSeasonForm({ ...seasonForm, name: e.target.value })
            }
            className="bg-black/50 border-white/10"
          />
          <Input
            type="datetime-local"
            value={seasonForm.starts_at}
            onChange={(e) =>
              setSeasonForm({ ...seasonForm, starts_at: e.target.value })
            }
            className="bg-black/50 border-white/10"
          />
          <Input
            type="datetime-local"
            value={seasonForm.ends_at}
            onChange={(e) =>
              setSeasonForm({ ...seasonForm, ends_at: e.target.value })
            }
            className="bg-black/50 border-white/10"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={seasonForm.is_active}
              onChange={(e) =>
                setSeasonForm({ ...seasonForm, is_active: e.target.checked })
              }
            />
            <span className="text-sm text-zinc-400">즉시 활성화</span>
          </div>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleCreateSeason}
          >
            시즌 생성
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#18181B] border-white/5 p-4 space-y-3">
          <h2 className="text-lg font-semibold">팀 목록</h2>
          {isTeamsLoading ? (
            <p className="text-sm text-zinc-500">팀 로딩 중...</p>
          ) : teams.length === 0 ? (
            <p className="text-sm text-zinc-500">등록된 팀이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 p-3"
                >
                  <div>
                    <div className="font-semibold">{team.name}</div>
                    <div className="text-xs text-zinc-500">ID: {team.id}</div>
                  </div>
                  <Badge className="bg-white/5 text-zinc-300 border-white/10">
                    {team.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-[#18181B] border-white/5 p-4 space-y-3">
          <h2 className="text-lg font-semibold">팀 생성</h2>
          <Input
            placeholder="팀명"
            value={teamForm.name}
            onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
            className="bg-black/50 border-white/10"
          />
          <Input
            placeholder="아이콘(선택)"
            value={teamForm.icon}
            onChange={(e) => setTeamForm({ ...teamForm, icon: e.target.value })}
            className="bg-black/50 border-white/10"
          />
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleCreateTeam}
          >
            팀 생성
          </Button>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#18181B] border-white/5 p-4 space-y-3">
          <h2 className="text-lg font-semibold">점수 조정</h2>
          <Select
            value={scoreForm.seasonId}
            onValueChange={(value) =>
              setScoreForm({ ...scoreForm, seasonId: value })
            }
          >
            <SelectTrigger className="bg-black/50 border-white/10">
              <SelectValue placeholder="시즌 선택" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-white/10 text-white">
              {seasons.map((season) => (
                <SelectItem key={season.id} value={String(season.id)}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={scoreForm.teamId}
            onValueChange={(value) =>
              setScoreForm({ ...scoreForm, teamId: value })
            }
          >
            <SelectTrigger className="bg-black/50 border-white/10">
              <SelectValue placeholder="팀 선택" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-white/10 text-white">
              {teams.map((team) => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="점수 변경량 (+/-)"
            value={scoreForm.delta}
            onChange={(e) =>
              setScoreForm({ ...scoreForm, delta: e.target.value })
            }
            className="bg-black/50 border-white/10"
          />
          <Input
            placeholder="조정 사유"
            value={scoreForm.reason}
            onChange={(e) =>
              setScoreForm({ ...scoreForm, reason: e.target.value })
            }
            className="bg-black/50 border-white/10"
          />
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleAdjustScore}
          >
            점수 조정
          </Button>
        </Card>

        <Card className="bg-[#18181B] border-white/5 p-4 space-y-4">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">멤버 강제 가입</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="유저 ID 또는 닉네임"
                  value={forceJoinForm.userId}
                  onChange={(e) => {
                    setForceJoinForm({
                      ...forceJoinForm,
                      userId: e.target.value,
                    });
                    setResolvedJoinUserId(null);
                    setResolvedJoinUserInfo(null);
                  }}
                  className="bg-black/50 border-white/10 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchJoinUser();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearchJoinUser}
                  className="border-white/10 text-zinc-200 hover:bg-white/10"
                >
                  조회
                </Button>
              </div>
              {resolvedJoinUserInfo && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold">
                      조회된 유저 정보
                    </span>
                  </div>
                  <div className="text-sm text-white space-y-0.5">
                    <div className="flex gap-2">
                      <span className="text-zinc-400 w-20">닉네임:</span>
                      <span className="font-semibold">
                        {resolvedJoinUserInfo.nickname}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-400 w-20">유저 ID:</span>
                      <span className="font-mono">
                        {resolvedJoinUserInfo.userId}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-400 w-20">CC ID:</span>
                      <span className="font-mono text-xs">
                        {resolvedJoinUserInfo.ccId}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input
              type="number"
              placeholder="팀 ID"
              value={forceJoinForm.teamId}
              onChange={(e) =>
                setForceJoinForm({ ...forceJoinForm, teamId: e.target.value })
              }
              className="bg-black/50 border-white/10"
            />
            <Input
              placeholder="사유"
              value={forceJoinForm.reason}
              onChange={(e) =>
                setForceJoinForm({ ...forceJoinForm, reason: e.target.value })
              }
              className="bg-black/50 border-white/10"
            />
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleForceJoin}
            >
              강제 가입
            </Button>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">멤버 강제 탈퇴</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="유저 ID 또는 닉네임"
                  value={forceLeaveForm.userId}
                  onChange={(e) => {
                    setForceLeaveForm({
                      ...forceLeaveForm,
                      userId: e.target.value,
                    });
                    setResolvedLeaveUserId(null);
                    setResolvedLeaveUserInfo(null);
                  }}
                  className="bg-black/50 border-white/10 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchLeaveUser();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearchLeaveUser}
                  className="border-white/10 text-zinc-200 hover:bg-white/10"
                >
                  조회
                </Button>
              </div>
              {resolvedLeaveUserInfo && (
                <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-semibold">
                      조회된 유저 정보
                    </span>
                  </div>
                  <div className="text-sm text-white space-y-0.5">
                    <div className="flex gap-2">
                      <span className="text-zinc-400 w-20">닉네임:</span>
                      <span className="font-semibold">
                        {resolvedLeaveUserInfo.nickname}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-400 w-20">유저 ID:</span>
                      <span className="font-mono">
                        {resolvedLeaveUserInfo.userId}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-zinc-400 w-20">CC ID:</span>
                      <span className="font-mono text-xs">
                        {resolvedLeaveUserInfo.ccId}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input
              placeholder="사유"
              value={forceLeaveForm.reason}
              onChange={(e) =>
                setForceLeaveForm({ ...forceLeaveForm, reason: e.target.value })
              }
              className="bg-black/50 border-white/10"
            />
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleForceLeave}
            >
              강제 탈퇴
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#18181B] border-white/5 p-4 space-y-3">
          <h2 className="text-lg font-semibold">팀 멤버 상세</h2>
          <Select
            value={memberFilter.teamId}
            onValueChange={(value) => {
              setMemberFilter({ ...memberFilter, teamId: value });
              setSelectedMemberId(null);
            }}
          >
            <SelectTrigger className="bg-black/50 border-white/10">
              <SelectValue placeholder="팀 선택" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-white/10 text-white">
              {teams.map((team) => (
                <SelectItem key={team.id} value={String(team.id)}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={memberFilter.seasonId || "auto"}
            onValueChange={(value) =>
              setMemberFilter({
                ...memberFilter,
                seasonId: value === "auto" ? "" : value,
              })
            }
          >
            <SelectTrigger className="bg-black/50 border-white/10">
              <SelectValue placeholder="시즌(자동/활성)" />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-white/10 text-white">
              <SelectItem value="auto">자동(활성/최근)</SelectItem>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={String(season.id)}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isMembersLoading ? (
            <p className="text-sm text-zinc-500">멤버 로딩 중...</p>
          ) : !teamMembers?.members?.length ? (
            <p className="text-sm text-zinc-500">멤버가 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {teamMembers.members.map((member) => (
                <div
                  key={member.user_id}
                  className={`flex items-center justify-between rounded-md border bg-black/30 p-3 ${
                    selectedMemberId === member.user_id
                      ? "border-emerald-500/40"
                      : "border-white/10"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      {member.nickname ?? "닉네임 없음"}#{member.user_id}
                    </div>
                    <div className="text-xs text-zinc-500">
                      가입일: {member.joined_at ?? "-"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      기여도: {member.contribution_points.toLocaleString()}
                    </div>
                    <div className="text-xs text-zinc-500">
                      최근 기여: {member.latest_event_at ?? "-"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-zinc-200"
                    onClick={() =>
                      handleSelectMember(member.user_id, member.joined_at)
                    }
                  >
                    선택
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-[#18181B] border-white/5 p-4 space-y-4">
          <h2 className="text-lg font-semibold">멤버 상세/기여도 관리</h2>
          {!selectedMember ? (
            <p className="text-sm text-zinc-500">멤버를 선택하세요.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-white/10 bg-black/30 p-3 space-y-1">
                <div className="text-sm font-semibold">
                  {selectedMember.nickname ?? "닉네임 없음"}#
                  {selectedMember.user_id}
                </div>
                <div className="text-xs text-zinc-500">
                  CC ID: {selectedMember.external_id ?? "-"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">가입일 수정</div>
                <Input
                  type="datetime-local"
                  value={memberJoinedAt}
                  onChange={(e) => setMemberJoinedAt(e.target.value)}
                  className="bg-black/50 border-white/10"
                />
                <Input
                  placeholder="사유"
                  value={memberJoinedReason}
                  onChange={(e) => setMemberJoinedReason(e.target.value)}
                  className="bg-black/50 border-white/10"
                />
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={handleUpdateMemberJoinedAt}
                >
                  가입일 수정
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">기여도 조정</div>
                <Input
                  type="number"
                  placeholder="기여도 변경량 (+/-)"
                  value={contributionDelta}
                  onChange={(e) => setContributionDelta(e.target.value)}
                  className="bg-black/50 border-white/10"
                />
                <Input
                  placeholder="액션 코드"
                  value={contributionAction}
                  onChange={(e) => setContributionAction(e.target.value)}
                  className="bg-black/50 border-white/10"
                />
                <Input
                  placeholder="사유"
                  value={contributionReason}
                  onChange={(e) => setContributionReason(e.target.value)}
                  className="bg-black/50 border-white/10"
                />
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={handleAdjustMemberContribution}
                >
                  기여도 조정
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">기여도 내역</div>
                {isContribLoading ? (
                  <p className="text-sm text-zinc-500">내역 로딩 중...</p>
                ) : !memberContributions?.items?.length ? (
                  <p className="text-sm text-zinc-500">내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {memberContributions.items.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-md border border-white/10 bg-black/30 p-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-300">{log.action}</span>
                          <span className="text-zinc-500">
                            {log.created_at ?? "-"}
                          </span>
                        </div>
                        <div className="text-zinc-400">Δ {log.delta}</div>
                        {log.meta?.reason && (
                          <div className="text-zinc-500">
                            사유: {log.meta.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
