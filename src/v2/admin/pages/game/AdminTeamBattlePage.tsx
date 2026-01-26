import { useMemo, useState } from "react";
import {
  useAdminAdjustTeamBattleScore,
  useAdminCreateTeamBattleSeason,
  useAdminCreateTeamBattleTeam,
  useAdminEndTeamBattleSeason,
  useAdminForceJoinTeamBattle,
  useAdminForceLeaveTeamBattle,
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

const toIsoString = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
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

  const handleForceJoin = () => {
    setNotice(null);
    setError(null);
    const userId = Number(forceJoinForm.userId);
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
        onSuccess: () => setNotice("강제 팀 가입 완료"),
        onError: () => setError("강제 팀 가입 실패"),
      },
    );
  };

  const handleForceLeave = () => {
    setNotice(null);
    setError(null);
    const userId = Number(forceLeaveForm.userId);
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
        onSuccess: () => setNotice("강제 팀 탈퇴 완료"),
        onError: () => setError("강제 팀 탈퇴 실패"),
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
            <Input
              type="number"
              placeholder="유저 ID"
              value={forceJoinForm.userId}
              onChange={(e) =>
                setForceJoinForm({ ...forceJoinForm, userId: e.target.value })
              }
              className="bg-black/50 border-white/10"
            />
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
            <Input
              type="number"
              placeholder="유저 ID"
              value={forceLeaveForm.userId}
              onChange={(e) =>
                setForceLeaveForm({ ...forceLeaveForm, userId: e.target.value })
              }
              className="bg-black/50 border-white/10"
            />
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
    </div>
  );
}
