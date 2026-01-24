import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { autoAssignTeam, getActiveSeason, getLeaderboard, getMyContribution, getMyTeam } from "../api/teamBattleApi";
import { useToast } from "../components/common/ToastProvider";
import AnimatedCountdown from "../components/common/AnimatedCountdown";
import { getGapToAboveTeam } from "../utils/teamBattleGap";
import { useAuth } from "../auth/authStore";

const baseAccent = "#d2fd9c";

const normalizeIsoForDate = (value: string) => {
  // Accept: 2025-12-21T12:34:56Z, 2025-12-21T12:34:56+09:00
  // If timezone is missing, treat it as UTC for backward compatibility.
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return hasTimezone ? value : `${value}Z`;
};

const parseEndsAtMs = (endsAt?: string | null) => {
  if (!endsAt) return null;
  const end = new Date(normalizeIsoForDate(endsAt)).getTime();
  return Number.isFinite(end) ? end : null;
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

  const endsAtMs = useMemo(() => parseEndsAtMs(seasonQuery.data?.ends_at), [seasonQuery.data?.ends_at]);
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
    return "??;
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
      return { canJoin: false, reason: "?œì¦Œ ?œì‘ ?„ì…?ˆë‹¤." };
    }
    if (nowMs > joinEndMs) {
      return { canJoin: false, reason: "?œì¦Œ ?œì‘ ??24?œê°„??ì§€???€ ë°°ì •??ì¢…ë£Œ?ìŠµ?ˆë‹¤." };
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
          addToast(`?? „! ?°ë¦¬ ?€??${myRank}?„ë¡œ ?¬ë¼?”ì–´??`, "success");
        }

        if (prevPoints !== null) {
          const delta = myPoints - prevPoints;
          if (delta >= 50) {
            addToast(`ì¶”ê²© ì¤? ?°ë¦¬ ?€ ?ìˆ˜ +${delta.toLocaleString()} (?„ì¬ ${myPoints.toLocaleString()}??`, "info");
          }
        }
      }

      if (typeof gapToAbovePoints === "number" && gapToAbovePoints >= 50) {
        if (sessionStorage.getItem(behindToastKey) !== "1") {
          sessionStorage.setItem(behindToastKey, "1");
          addToast(`?°ë¦¬ ?€??ë°”ë¡œ ???€ê³?${gapToAbovePoints.toLocaleString()}??ì°¨ì´?ˆìš”. ì§€ê¸??¬ë ¤??`, "info");
        }
      }

      localStorage.setItem(snapshotKey, JSON.stringify({ points: myPoints, rank: myRank, capturedAt: Date.now() }));
    } catch {
      // storage ?‘ê·¼/?Œì‹± ?¤íŒ¨ ???Œë¦¼ ë¡œì§???¤í‚µ?©ë‹ˆ??
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
          <div
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full border-[4px] bg-black/30"
            style={{ borderColor: baseAccent }}
          >
            <img
              src="/assets/icon_trophy.png"
              alt=""
              className="h-[20px] w-[20px] object-contain"
              loading="lazy"
              aria-hidden="true"
            />
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
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/15 bg-black/30">
                  <img
                    src="/assets/icon_trophy.png"
                    alt=""
                    className="h-5 w-5 object-contain"
                    loading="lazy"
                    aria-hidden="true"
                  />
                </span>
                <p className="text-[clamp(15px,2.8vw,16px)] font-semibold text-white/90">?€ë°°í?</p>
              </div>
              <p className="mt-1 text-[clamp(13px,2.5vw,14px)] text-white/65">?¨ì? ?œê°„</p>
              <p className="mt-1 text-[clamp(20px,3.6vw,24px)] font-semibold text-white">
                <AnimatedCountdown targetMs={endsAtMs} expiredText="ì¢…ë£Œ" showDays />
              </p>
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
              ?°ì´???ˆë¡œê³ ì¹¨
            </button>
          </div>
        </div>

        {myTeamId !== null ? (
          <div className="sticky top-3 z-20 mt-[12px] rounded-[10px] border border-white/10 bg-black/70 px-[18px] py-[14px] backdrop-blur">
            <p className="text-[clamp(13px,2.6vw,15px)] font-semibold text-white/90">
              {myNickname} Â· <span style={{ color: baseAccent }}>+{myContributionPoints.toLocaleString()}</span>
            </p>
            <p className="mt-1 text-[clamp(12px,2.6vw,15px)] text-white/65">
              {showBehindBanner ? "?´ê? ë¹ ì?ë©??€??ì§„ë‹¤. ì§€ê¸????ë§Œ ??" : "?´ê? ë¹ ì?ë©??€???”ë“¤ë¦°ë‹¤. ì§€ê¸??ìˆ˜ ?“ì"}
            </p>
          </div>
        ) : null}

        {myTeamId === null ? (
          <div className="mt-[12px] rounded-[10px] border border-white/10 bg-[#394508]/20 px-[18px] py-[14px]">
            <p className="text-[clamp(13px,2.6vw,14px)] font-semibold text-white/90">?„ì§ ?€???†ì–´??/p>
            <p className="mt-1 text-[clamp(12px,2.6vw,13px)] text-white/65">ë²„íŠ¼???„ë¥´ë©?ë°¸ëŸ°??ê¸°ì??¼ë¡œ ?ë™ ë°°ì •?©ë‹ˆ??</p>

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
                    addToast("?€ ë°°ì •???„ë£Œ?ì–´??", "success");
                  } catch {
                    addToast("?€ ë°°ì •???¤íŒ¨?ˆìŠµ?ˆë‹¤. ? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.", "error");
                  } finally {
                    setAssigning(false);
                  }
                }}
              >
                ë¯¸ìŠ¤?°ë¦¬ ?€ ë°°ì •
              </button>

              <Link
                to="/dice"
                className="rounded-[6px] border border-white/15 bg-white/5 px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-white/85 hover:bg-white/10"
              >
                ê²Œì„?˜ëŸ¬ ê°€ê¸?              </Link>
            </div>
          </div>
        ) : null}

        {showBehindBanner && myRank !== null && myPoints !== null ? (
          <div className="mt-[12px] rounded-[10px] border border-white/10 bg-[#394508]/20 px-[18px] py-[14px]">
            <p className="text-[clamp(13px,2.6vw,14px)] font-semibold text-white/90">
              ì§€ê¸??°ë¦¬ ?€??<span style={{ color: baseAccent }}>#{myRank}</span> ( {myPoints.toLocaleString()}??) Â· ë°”ë¡œ ???€ê³?" "}
              <span style={{ color: baseAccent }}>{gapToAbovePoints?.toLocaleString()}??/span> ì°¨ì´
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to="/dice"
                className="rounded-[6px] bg-[#d2fd9c] px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-black hover:brightness-95"
              >
                ê²Œì„?˜ëŸ¬ ê°€ê¸?              </Link>
              <button
                type="button"
                className="rounded-[6px] border border-white/15 bg-white/5 px-3 py-2 text-[clamp(12px,2.8vw,13px)] font-semibold text-white/85 hover:bg-white/10"
                onClick={() => leaderboardQuery.refetch()}
              >
                ë¦¬ë”ë³´ë“œ ?ˆë¡œê³ ì¹¨
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-[18px] rounded-[12px] border border-white/10 bg-black/70 px-[18px] py-[16px]">
          <p className="text-[clamp(15px,2.8vw,16px)] font-semibold" style={{ color: baseAccent }}>
            ë£??ˆë‚´ (?µì‹¬)
          </p>
          <ul className="mt-3 space-y-2 text-[clamp(13px,2.8vw,16px)] text-white/85">
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>ì°¸ì—¬: ë°¸ëŸ°??ê¸°ì? ?ë™ ë°°ì • (ì§ì ‘ ? íƒ ?†ìŒ)</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>?€ ? íƒ: ?œì‘ ??24?œê°„ ??1??/span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>?ìˆ˜: ê²Œì„ 1?Œë‹¹ 10??Â· 1???˜ë£¨ ìµœë? 500??/span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[6px] inline-block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: baseAccent }} />
              <span>ë³´ìƒ: 1??ì¿ í° 30ë§?Â· 2??ì¿ í° 20ë§?Â· 3??ì¿ í° 5ë§?(?„ë? ?˜ë™) Â· ìµœì†Œ 30??300??</span>
            </li>
          </ul>
        </div>

        <div className="mt-[18px]">
          <div className="flex items-center justify-between">
            <p className="text-[clamp(15px,2.8vw,16px)] font-semibold" style={{ color: baseAccent }}>
              ë¦¬ë”ë³´ë“œ
            </p>
            <p className="text-[clamp(13px,2.8vw,14px)] text-white/55">?œì‹œ 10</p>
          </div>

          <div className="mt-[10px] space-y-[10px]">
            {leaderboardQuery.isLoading ? (
              <div className="rounded-[12px] border border-white/10 bg-[#394508]/20 px-[18px] py-[18px] text-[clamp(13px,2.8vw,14px)] text-white/70">
                ë¶ˆëŸ¬?¤ëŠ” ì¤?..
              </div>
            ) : leaderboardQuery.isError ? (
              <div className="rounded-[12px] border border-white/10 bg-[#394508]/20 px-[18px] py-[18px] text-[clamp(13px,2.8vw,14px)] text-white/70">
                ë¦¬ë”ë³´ë“œë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="rounded-[12px] border border-white/10 bg-[#394508]/20 px-[18px] py-[18px] text-[clamp(13px,2.8vw,14px)] text-white/70">
                ?œì‹œ???°ì´?°ê? ?†ìŠµ?ˆë‹¤.
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
                            className="text-[clamp(14px,2.8vw,16px)] font-semibold"
                            style={{ color: idx < 3 ? baseAccent : "rgba(255,255,255,0.85)" }}
                          >
                            #{idx + 1}
                          </p>
                          <p className="truncate text-[clamp(14px,2.8vw,16px)] font-semibold text-white/90">{row.team_name}</p>
                          {isMine ? (
                            <span
                              className="rounded-full px-2 py-[3px] text-[clamp(11px,2.6vw,12px)] font-semibold tracking-[-0.2px] text-black"
                              style={{ backgroundColor: baseAccent }}
                            >
                              ?´í?
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[clamp(13px,2.6vw,16px)] text-white/60">?¸ì› {row.member_count ?? "-"}ëª?/p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-[clamp(13px,2.6vw,16px)] text-white/60">?ìˆ˜</p>
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
            <p className="mt-3 text-[12px] text-white/50">?¼ë? ?•ë³´ë¥?ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ?? ?ˆë¡œê³ ì¹¨???ŒëŸ¬ì£¼ì„¸??</p>
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
