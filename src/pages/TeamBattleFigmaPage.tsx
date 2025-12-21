import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { autoAssignTeam, getActiveSeason, getLeaderboard, getMyContribution, getMyTeam } from "../api/teamBattleApi";
import { useToast } from "../components/common/ToastProvider";
import { getGapToAboveTeam } from "../utils/teamBattleGap";
import { useAuth } from "../auth/authStore";

const baseAccent = "#d2fd9c";

const normalizeIsoForDate = (value: string) => {
  // Accept: 2025-12-21T12:34:56Z, 2025-12-21T12:34:56+09:00
  // If timezone is missing, treat it as UTC for backward compatibility.
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return hasTimezone ? value : `${value}Z`;
};

const formatCountdown = (endsAt?: string | null) => {
  if (!endsAt) return "-";
  const now = Date.now();
  const end = new Date(normalizeIsoForDate(endsAt)).getTime();
  const diff = end - now;
  if (diff <= 0) return "종료";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}시간 ${minutes}분`;
};

type ViewportVariant = "desktop" | "tablet" | "mobile";

const TeamBattleMainPanel: React.FC<{ variant: ViewportVariant }> = ({ variant }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  const seasonQuery = useQuery({
    queryKey: ["team-battle-season"],
    queryFn: getActiveSeason,
    refetchInterval: 60_000,
  });

  const myTeamQuery = useQuery({
    queryKey: ["team-battle-me"],
    queryFn: getMyTeam,
    refetchInterval: 60_000,
  });

  const seasonId = seasonQuery.data?.id;

  const leaderboardQuery = useQuery({
    queryKey: ["team-battle-leaderboard", seasonId, 10],
    queryFn: () => getLeaderboard(seasonId, 10, 0),
    refetchInterval: 60_000,
  });

  const countdown = useMemo(() => formatCountdown(seasonQuery.data?.ends_at), [seasonQuery.data?.ends_at]);
  const myTeamId = myTeamQuery.data?.team_id ?? null;

  const myContributionQuery = useQuery({
    queryKey: ["team-battle-my-contribution", myTeamId, seasonId],
    queryFn: () => getMyContribution(myTeamId as number, seasonId),
    enabled: myTeamId !== null,
    refetchInterval: 60_000,
  });

  const myNickname = useMemo(() => {
    if (user?.nickname) return user.nickname;
    if (user?.external_id) return user.external_id;
    return "나";
  }, [user?.external_id, user?.nickname]);

  const joinWindowState = useMemo(() => {
    const rawStartsAt = seasonQuery.data?.starts_at;
    if (!rawStartsAt) {
      return { canJoin: true, reason: null as string | null };
    }

    const startMs = new Date(normalizeIsoForDate(rawStartsAt)).getTime();
    if (!Number.isFinite(startMs)) {
      return { canJoin: true, reason: null as string | null };
    }

    const nowMs = Date.now();
    const joinEndMs = startMs + 24 * 60 * 60 * 1000;

    if (nowMs < startMs) {
      return { canJoin: false, reason: "시즌 시작 전입니다." };
    }
    if (nowMs > joinEndMs) {
      return { canJoin: false, reason: "시즌 시작 후 24시간이 지나 팀 배정이 종료됐습니다." };
    }
    return { canJoin: true, reason: null as string | null };
  }, [seasonQuery.data?.starts_at]);

  const leaderboard = leaderboardQuery.data ?? [];

  const myLeaderboardIndex = useMemo(() => {
    if (myTeamId === null) return -1;
    return leaderboard.findIndex((row) => row.team_id === myTeamId);
  }, [leaderboard, myTeamId]);

  const myRank = myLeaderboardIndex >= 0 ? myLeaderboardIndex + 1 : null;
  const myPoints = myLeaderboardIndex >= 0 ? leaderboard[myLeaderboardIndex]?.points ?? 0 : null;

  const gapToAbove = useMemo(() => getGapToAboveTeam(leaderboard, myTeamId), [leaderboard, myTeamId]);
  const gapToAbovePoints = gapToAbove?.gap ?? null;

  const showBehindBanner = typeof gapToAbovePoints === "number" && gapToAbovePoints >= 50;

  const myContributionPoints = myContributionQuery.data?.points ?? 0;

  useEffect(() => {
    if (!seasonId || myTeamId === null) return;
    if (leaderboardQuery.isLoading || leaderboardQuery.isError) return;
    if (myLeaderboardIndex < 0) return;
    if (myRank === null || myPoints === null) return;

    const snapshotKey = `teamBattle.snapshot.${seasonId}.${myTeamId}`;
    const behindToastKey = `teamBattle.behindToast.v2.${seasonId}.${myTeamId}.${gapToAbove?.aboveTeamId ?? "none"}`;

    try {
      const rawPrev = localStorage.getItem(snapshotKey);
      if (rawPrev) {
        const parsed = JSON.parse(rawPrev) as { points?: unknown; rank?: unknown; capturedAt?: unknown };
        const prevPoints = typeof parsed.points === "number" ? parsed.points : null;
        const prevRank = typeof parsed.rank === "number" ? parsed.rank : null;

        if (prevRank !== null && myRank < prevRank) {
          addToast(`역전! 우리 팀이 ${myRank}위로 올라왔어요.`, "success");
        }

        if (prevPoints !== null) {
          const delta = myPoints - prevPoints;
          if (delta >= 50) {
            addToast(`추격 중! 우리 팀 점수 +${delta.toLocaleString()} (현재 ${myPoints.toLocaleString()}점)`, "info");
          }
        }
      }

      if (typeof gapToAbovePoints === "number" && gapToAbovePoints >= 50) {
        if (sessionStorage.getItem(behindToastKey) !== "1") {
          sessionStorage.setItem(behindToastKey, "1");
          addToast(`우리 팀이 바로 위 팀과 ${gapToAbovePoints.toLocaleString()}점 차이예요. 지금 달려요!`, "info");
        }
      }

      localStorage.setItem(snapshotKey, JSON.stringify({ points: myPoints, rank: myRank, capturedAt: Date.now() }));
    } catch {
      // storage 접근/파싱 실패 시 알림 로직을 스킵합니다.
    }
  }, [addToast, gapToAbove?.aboveTeamId, gapToAbovePoints, leaderboardQuery.isError, leaderboardQuery.isLoading, myLeaderboardIndex, myPoints, myRank, myTeamId, seasonId]);

  const titleSize = variant === "desktop" ? 32 : variant === "tablet" ? 28 : 26;

  const wrapperClass =
    variant === "desktop"
      ? "w-[798px]"
      : variant === "tablet"
        ? "w-full max-w-[800px]"
        : "w-full max-w-[388px]";

  const padded = variant === "desktop" ? "px-[0px]" : variant === "tablet" ? "px-[24px]" : "px-[10px]";

  return (
    <section className={wrapperClass + " " + padded}
    >
      <div className="mt-[20px]">
        <div className="flex items-center gap-3">
          <div className="relative h-[34px] w-[34px] rounded-full border-[4px]" style={{ borderColor: baseAccent }}>
            <div className="absolute left-1/2 top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: baseAccent, opacity: 0.9 }} />
          </div>
          <p
            className="font-semibold tracking-[-0.4px]"
            style={{ color: baseAccent, fontSize: `clamp(20px, 3.6vw, ${titleSize}px)` }}
          >
            Team Battle
          </p>
        </div>

        <div className="mt-[18px] rounded-[10px] border border-white/10 bg-[#394508]/30 px-[18px] py-[16px]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[clamp(15px,2.8vw,16px)] font-semibold text-white/90">팀배틀</p>
              <p className="mt-1 text-[clamp(13px,2.5vw,14px)] text-white/65">남은 시간</p>
              <p className="mt-1 text-[clamp(20px,3.6vw,24px)] font-semibold text-white">{countdown}</p>
            </div>
            <button
              type="button"
              className={
                "shrink-0 rounded-[6px] px-[18px] py-[12px] text-[clamp(12px,2.8vw,14px)] font-semibold text-black " +
                (refreshing ? "bg-[#d2fd9c]/70" : "bg-[#d2fd9c] hover:brightness-95")
              }
              onClick={async () => {
                setRefreshing(true);
                try {
                  await Promise.all([seasonQuery.refetch(), myTeamQuery.refetch(), leaderboardQuery.refetch()]);
                } finally {
                  setRefreshing(false);
                }
              }}
              disabled={refreshing}
            >
              데이터 새로고침
            </button>
          </div>
        </div>

        {myTeamId !== null ? (
          <div className="sticky top-3 z-20 mt-[12px] rounded-[10px] border border-white/10 bg-black/70 px-[18px] py-[14px] backdrop-blur">
            <p className="text-[clamp(13px,2.6vw,14px)] font-semibold text-white/90">
              {myNickname} · <span style={{ color: baseAccent }}>+{myContributionPoints.toLocaleString()}</span>
            </p>
            <p className="mt-1 text-[clamp(12px,2.6vw,13px)] text-white/65">
              {showBehindBanner ? "내가 빠지면 팀이 진다. 지금 한 판만 더!" : "내가 빠지면 팀이 흔들린다. 지금 점수 쌓자"}
            </p>
          </div>
        ) : null}

        {myTeamId === null ? (
          <div className="mt-[12px] rounded-[10px] border border-white/10 bg-[#394508]/20 px-[18px] py-[14px]">
            <p className="text-[clamp(13px,2.6vw,14px)] font-semibold text-white/90">아직 팀이 없어요</p>
            <p className="mt-1 text-[clamp(12px,2.6vw,13px)] text-white/65">버튼을 누르면 밸런스 기준으로 자동 배정됩니다.</p>

            {!joinWindowState.canJoin && joinWindowState.reason ? (
              <p className="mt-2 text-[clamp(12px,2.6vw,13px)] text-white/55">{joinWindowState.reason}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={
                  "rounded-[6px] px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-black " +
                  (assigning ? "bg-[#d2fd9c]/70" : "bg-[#d2fd9c] hover:brightness-95")
                }
                disabled={assigning || !joinWindowState.canJoin}
                onClick={async () => {
                  if (assigning) return;
                  setAssigning(true);
                  try {
                    await autoAssignTeam();
                    await Promise.all([myTeamQuery.refetch(), leaderboardQuery.refetch()]);
                    addToast("팀 배정이 완료됐어요.", "success");
                  } catch {
                    addToast("팀 배정에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
                  } finally {
                    setAssigning(false);
                  }
                }}
              >
                미스터리 팀 배정
              </button>

              <Link
                to="/dice"
                className="rounded-[6px] border border-white/15 bg-white/5 px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-white/85 hover:bg-white/10"
              >
                게임하러 가기
              </Link>
            </div>
          </div>
        ) : null}

        {showBehindBanner && myRank !== null && myPoints !== null ? (
          <div className="mt-[12px] rounded-[10px] border border-white/10 bg-[#394508]/20 px-[18px] py-[14px]">
            <p className="text-[clamp(13px,2.6vw,14px)] font-semibold text-white/90">
              지금 우리 팀이 <span style={{ color: baseAccent }}>#{myRank}</span> ( {myPoints.toLocaleString()}점 ) · 바로 위 팀과{" "}
              <span style={{ color: baseAccent }}>{gapToAbovePoints?.toLocaleString()}점</span> 차이
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/dice"
                className="rounded-[6px] bg-[#d2fd9c] px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-black hover:brightness-95"
              >
                게임하러 가기
              </Link>
              <button
                type="button"
                className="rounded-[6px] border border-white/15 bg-white/5 px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-white/85 hover:bg-white/10"
                onClick={() => leaderboardQuery.refetch()}
              >
                리더보드 새로고침
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-[18px] rounded-[12px] border border-white/10 bg-black/70 px-[18px] py-[16px]">
          <p className="text-[clamp(15px,2.8vw,16px)] font-semibold" style={{ color: baseAccent }}>
            룰 안내 (핵심)
          </p>
          <ul className="mt-3 space-y-2 text-[clamp(13px,2.8vw,14px)] text-white/85">
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>참여: 밸런스 기준 자동 배정 (직접 선택 없음)</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>팀 선택: 시작 후 24시간 내 1회</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>점수: 게임 1회당 10점 · 1인 하루 최대 500점</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>보상: 1위 쿠폰 30만 · 2위 쿠폰 20만 · 3위 쿠폰 5만 (전부 수동) · 최소 30회(300점)</span>
            </li>
          </ul>
        </div>

        <div className="mt-[18px]">
          <div className="flex items-center justify-between">
            <p className="text-[clamp(15px,2.8vw,16px)] font-semibold" style={{ color: baseAccent }}>
              리더보드
            </p>
            <p className="text-[clamp(13px,2.8vw,14px)] text-white/55">표시 10</p>
          </div>

          <div className="mt-[10px] space-y-[10px]">
            {leaderboardQuery.isLoading ? (
              <div className="rounded-[12px] border border-white/10 bg-[#394508]/20 px-[18px] py-[18px] text-[clamp(13px,2.8vw,14px)] text-white/70">
                불러오는 중...
              </div>
            ) : leaderboardQuery.isError ? (
              <div className="rounded-[12px] border border-white/10 bg-[#394508]/20 px-[18px] py-[18px] text-[clamp(13px,2.8vw,14px)] text-white/70">
                리더보드를 불러오지 못했습니다.
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="rounded-[12px] border border-white/10 bg-[#394508]/20 px-[18px] py-[18px] text-[clamp(13px,2.8vw,14px)] text-white/70">
                표시할 데이터가 없습니다.
              </div>
            ) : (
              leaderboard.slice(0, 10).map((row, idx) => {
                const isMine = myTeamId !== null && row.team_id === myTeamId;
                const border = isMine ? "border-2 border-[#d2fd9c]" : "border border-white/10";
                const bg = isMine ? "bg-[#394508]/30" : "bg-[#394508]/20";

                return (
                  <div
                    key={`${row.team_id}-${idx}`}
                    className={`rounded-[14px] ${border} ${bg} px-[18px] py-[16px]`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p
                            className="text-[clamp(14px,2.8vw,15px)] font-semibold"
                            style={{ color: idx < 3 ? baseAccent : "rgba(255,255,255,0.85)" }}
                          >
                            #{idx + 1}
                          </p>
                          <p className="truncate text-[clamp(14px,2.8vw,15px)] font-semibold text-white/90">{row.team_name}</p>
                          {isMine ? (
                            <span
                              className="rounded-full px-2 py-[3px] text-[clamp(11px,2.6vw,12px)] font-semibold tracking-[-0.2px] text-black"
                              style={{ backgroundColor: baseAccent }}
                            >
                              내팀
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[clamp(13px,2.6vw,14px)] text-white/60">인원 {row.member_count ?? "-"}명</p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[clamp(12px,2.6vw,13px)] text-white/60">점수</p>
                        <p className="text-[clamp(16px,3.2vw,18px)] font-bold" style={{ color: baseAccent }}>
                          {row.points.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {(seasonQuery.isError || myTeamQuery.isError) && (
            <p className="mt-3 text-[12px] text-white/50">일부 정보를 불러오지 못했습니다. 새로고침을 눌러주세요.</p>
          )}
        </div>
      </div>
    </section>
  );
};

const TeamBattleMainOnly: React.FC = () => {
  return (
    <div className="landing-font w-full">
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="hidden lg:block">
          <TeamBattleMainPanel variant="desktop" />
        </div>
        <div className="hidden md:block lg:hidden">
          <TeamBattleMainPanel variant="tablet" />
        </div>
        <div className="md:hidden">
          <TeamBattleMainPanel variant="mobile" />
        </div>
      </div>
    </div>
  );
};

const TeamBattleFigmaPage: React.FC = () => {
  return (
    <TeamBattleMainOnly />
  );
};

export default TeamBattleFigmaPage;
