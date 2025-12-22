import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { useAuth } from "../auth/authStore";
import SeasonPassRewardsAndTasks from "../components/seasonPass/SeasonPassRewardsAndTasks";
import { useToast } from "../components/common/ToastProvider";

const baseAccent = "#d2fd9c";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getLocalDateKey = (now: Date) => {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const msUntilLocalMidnight = (now: Date) => {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
};

const parseSeasonEndMs = (endDate?: string | null) => {
  if (!endDate) return null;
  // backend는 date(YYYY-MM-DD) 형태를 내려줍니다.
  const parts = endDate.split("-").map((v) => Number(v));
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  const ms = end.getTime();
  return Number.isFinite(ms) ? ms : null;
};

type LevelCardVariant = "desktop" | "tablet" | "mobile";

const LevelCard: React.FC<{ variant: LevelCardVariant }> = ({ variant }) => {
  const { user } = useAuth();
  const season = useSeasonPassStatus();

  const derived = useMemo(() => {
    const currentLevel = season.data?.current_level ?? 0;
    const maxLevel = season.data?.max_level ?? 0;
    const currentXp = season.data?.current_xp ?? 0;
    const nextLevelXp = season.data?.next_level_xp ?? currentXp;

    const nextLevel = maxLevel > 0 ? Math.min(maxLevel, currentLevel + 1) : currentLevel + 1;
    const remaining = Math.max(0, (nextLevelXp ?? 0) - currentXp);
    const denom = Math.max(1, (nextLevelXp ?? 0) || 1);
    const pct = clamp(Math.floor((currentXp / denom) * 100), 0, 100);

    const totalStamps = season.data?.total_stamps ?? 0;
    const claimedBadges = season.data?.levels?.filter((l) => l.is_claimed).length ?? 0;

    return {
      currentLevel,
      nextLevel,
      currentXp,
      remaining,
      pct,
      totalStamps,
      claimedBadges,
    };
  }, [season.data]);

  const displayName = user?.nickname || user?.external_id || "플레이어";
  const statusLabel = user?.status || "ACTIVE";

  const sizing =
    variant === "desktop"
      ? {
          maxW: "w-full max-w-[900px]",
          pad: "px-[10px] py-[clamp(30px,3.4vw,50px)]",
          avatar: "h-[clamp(92px,6.4vw,124px)] w-[clamp(92px,6.4vw,124px)]",
          avatarText: "text-[clamp(28px,3vw,38px)]",
          badge: "h-[clamp(36px,3vw,46px)] w-[clamp(36px,3vw,46px)] text-[clamp(13px,1.8vw,15px)]",
          name: "text-[clamp(22px,2.6vw,28px)]",
          statNumber: "text-[clamp(36px,3.6vw,48px)]",
        }
      : variant === "tablet"
        ? {
            maxW: "w-full max-w-[1024px]",
            pad: "px-[10px] py-[clamp(28px,3.8vw,46px)]",
            avatar: "h-[clamp(86px,7.4vw,118px)] w-[clamp(86px,7.4vw,118px)]",
            avatarText: "text-[clamp(26px,3.2vw,34px)]",
            badge: "h-[clamp(34px,3.4vw,44px)] w-[clamp(34px,3.4vw,44px)] text-[clamp(12px,2vw,14px)]",
            name: "text-[clamp(21px,3.2vw,26px)]",
            statNumber: "text-[clamp(34px,3.8vw,46px)]",
          }
        : {
            maxW: "w-full max-w-[980px]",
            pad: "px-[10px] py-[clamp(28px,7vw,46px)]",
            avatar: "h-[clamp(82px,18vw,116px)] w-[clamp(82px,18vw,116px)]",
            avatarText: "text-[clamp(25px,5.8vw,34px)]",
            badge: "h-[clamp(32px,6.6vw,42px)] w-[clamp(32px,6.6vw,42px)] text-[clamp(12px,3.6vw,14px)]",
            name: "text-[clamp(19px,5.2vw,23px)]",
            statNumber: "text-[clamp(34px,7.4vw,46px)]",
          };

  const isMobile = variant === "mobile";
  const barHeight = variant === "mobile" ? "h-[14px]" : "h-[16px]";

  return (
    <section
      className={
        "w-full " +
        sizing.maxW +
        " rounded-[16px] border border-black/15 bg-cc-moss text-white backdrop-blur-sm " +
        sizing.pad
      }
      aria-label="내 레벨 카드"
    >
      <header className="flex items-center gap-4">
        <div className={"relative rounded-full bg-cc-olive/20 " + sizing.avatar}>
          <div className={"absolute inset-0 flex items-center justify-center font-semibold text-[#d2fd9c] " + sizing.avatarText}>
            {displayName.slice(0, 1)}
          </div>
          <div
            className={
              "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full bg-[#d2fd9c] font-bold text-black " +
              sizing.badge
            }
            aria-label="현재 레벨"
          >
            {derived.currentLevel}
          </div>
        </div>
        <div className="min-w-0">
          <p className={"truncate font-semibold " + sizing.name}>{displayName}</p>
          <p className="text-[clamp(13px,2.8vw,14px)] text-[#d2fd9c]">{statusLabel}</p>
        </div>
      </header>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[clamp(13px,2.8vw,14px)] text-white">
          <span>레벨 {derived.currentLevel}</span>
          <span>레벨 {derived.nextLevel}</span>
        </div>
        <div className={`mt-2 w-full rounded-full bg-[#d2fd9c]/20 ${barHeight}`}>
          <div className="h-full rounded-full bg-[#d2fd9c]" style={{ width: `${derived.pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[clamp(13px,2.8vw,14px)]">
          <span className="text-white/85">{derived.currentXp.toLocaleString()} XP</span>
          <span className="text-[#d2fd9c]">다음 레벨까지 {derived.remaining.toLocaleString()} XP 남음</span>
        </div>
      </div>

      <div className={"mt-8 flex gap-4 " + (isMobile ? "flex-col" : "flex-row")}>
        <div className={"rounded-[6px] border border-black/15 bg-cc-olive/20 px-5 py-4 text-center " + (isMobile ? "w-full" : "flex-1")}>
          <p className={"font-bold text-[#d2fd9c] " + sizing.statNumber}>{derived.totalStamps}</p>
          <div className="mt-1 flex items-center justify-center gap-2 text-[clamp(13px,2.8vw,14px)] text-white/85">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/15 bg-black/25">
              <img
                src="/images/flag.svg"
                alt=""
                className="h-4 w-4 invert brightness-200"
                loading="lazy"
                aria-hidden="true"
              />
            </span>
            완료한 미션
          </div>
        </div>
        <div className={"rounded-[6px] border border-black/15 bg-cc-olive/20 px-5 py-4 text-center " + (isMobile ? "w-full" : "flex-1")}>
          <p className={"font-bold text-[#d2fd9c] " + sizing.statNumber}>{derived.claimedBadges}</p>
          <div className="mt-1 flex items-center justify-center gap-2 text-[clamp(13px,2.8vw,14px)] text-white/85">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/15 bg-black/25">
              <img
                src="/images/coin.svg"
                alt=""
                className="h-4 w-4 invert brightness-200"
                loading="lazy"
                aria-hidden="true"
              />
            </span>
            획득한 뱃지
          </div>
        </div>
        <div className={"rounded-[6px] border border-black/15 bg-cc-olive/20 px-5 py-4 text-center " + (isMobile ? "w-full" : "flex-1")}>
          <p className={"font-bold text-[#d2fd9c] " + sizing.statNumber}>{derived.currentXp.toLocaleString()}</p>
          <div className="mt-1 flex items-center justify-center gap-2 text-[clamp(13px,2.8vw,14px)] text-white/85">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-white/15 bg-black/25">
              <img
                src="/images/dia.svg"
                alt=""
                className="h-4 w-4 invert brightness-200"
                loading="lazy"
                aria-hidden="true"
              />
            </span>
            총 획득 XP
          </div>
        </div>
      </div>

      {season.isLoading ? (
        <p className="mt-6 text-[clamp(13px,2.8vw,14px)] text-white/65">레벨 정보를 불러오는 중...</p>
      ) : season.isError ? (
        <p className="mt-6 text-[clamp(13px,2.8vw,14px)] text-white/65">레벨 정보를 불러오지 못했습니다.</p>
      ) : null}
    </section>
  );
};

const SeasonPassMainPanel: React.FC = () => {
  return (
    <div className="landing-font w-full">
      <div className="mx-auto w-full px-4 md:px-8">
        <div className="pt-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/15 bg-black/25">
              <img
                src="/images/dia.svg"
                alt=""
                className="h-5 w-5 invert brightness-200"
                loading="lazy"
                aria-hidden="true"
              />
            </span>
            <div>
              <p className="text-[clamp(15px,2.8vw,21px)] font-medium leading-[1.15] tracking-[-0.2px]" style={{ color: baseAccent }}>
                지민이와 함께하는 겨울 시즌 패스
              </p>
              <h1 className="mt-2 text-[clamp(20px,6vw,24px)] font-bold leading-[1.1] tracking-[0.2px]" style={{ color: baseAccent }}>
                내 레벨 확인
              </h1>
            </div>
          </div>
        </div>

        <div className="mt-8 flex w-full justify-center">
          <div className="hidden w-full justify-center lg:flex">
            <LevelCard variant="desktop" />
          </div>
          <div className="hidden w-full justify-center md:flex lg:hidden">
            <LevelCard variant="tablet" />
          </div>
          <div className="flex w-full justify-center md:hidden">
            <LevelCard variant="mobile" />
          </div>
        </div>

        <div className="mt-8">
          <SeasonPassRewardsAndTasks />
        </div>
      </div>
    </div>
  );
};

const SeasonPassFigmaPage: React.FC = () => {
  const season = useSeasonPassStatus();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const nudge = useMemo(() => {
    if (!season.data) return null;

    const now = new Date();
    const userKey = String(user?.id ?? user?.external_id ?? "anon");
    const dayKey = getLocalDateKey(now);

    const { current_xp, current_level, max_level, levels } = season.data;
    const totalXp = Math.max(0, current_xp ?? 0);
    const maxRequired = Math.max(0, ...(levels ?? []).map((l) => l.required_xp ?? 0));
    const isMax = (current_level ?? 0) >= (max_level ?? 0) || totalXp >= maxRequired;
    if (isMax) return null;

    const sortedByReq = [...(levels ?? [])].sort((a, b) => (a.required_xp ?? 0) - (b.required_xp ?? 0));
    const nextRow = sortedByReq.find((l) => (l.required_xp ?? 0) > totalXp);
    const prevRow = [...sortedByReq].reverse().find((l) => (l.required_xp ?? 0) <= totalXp);

    const startXp = Math.max(0, prevRow?.required_xp ?? 0);
    const endXp = Math.max(startXp + 1, nextRow?.required_xp ?? maxRequired);
    const remainingXp = Math.max(0, endXp - totalXp);

    const msToMidnight = msUntilLocalMidnight(now);
    const resetSoon = msToMidnight <= 2 * 60 * 60 * 1000;
    const needsStampToday = season.data?.today?.stamped === false;

    const seasonEndMs = parseSeasonEndMs(season.data?.season?.end_date);
    const msToSeasonEnd = seasonEndMs ? seasonEndMs - now.getTime() : null;
    const seasonEndingSoon = typeof msToSeasonEnd === "number" && msToSeasonEnd <= 24 * 60 * 60 * 1000 && msToSeasonEnd > 0;

    let kind: "season_end" | "daily_reset" | null = null;
    if (seasonEndingSoon) kind = "season_end";
    else if (resetSoon && needsStampToday) kind = "daily_reset";
    if (!kind) return null;

    const seenKey = `seasonPass.nudge.v1.${kind}.${userKey}.${dayKey}`;
    try {
      if (localStorage.getItem(seenKey) === "1") return null;
    } catch {
      // storage 접근 실패 시에는 배너를 아예 띄우지 않아 과도한 노출을 방지합니다.
      return null;
    }

    const headline = kind === "season_end" ? "시즌 마감이 임박했어요" : "오늘 누적 진행을 챙겨요";
    const body =
      remainingXp > 0
        ? `다음 보상까지 ${remainingXp.toLocaleString()} XP만 더 모으면 돼요.`
        : "조금만 더 하면 다음 보상을 받을 수 있어요.";

    return { kind, seenKey, headline, body };
  }, [season.data, user?.external_id, user?.id]);

  useEffect(() => {
    if (season.isLoading || season.isError || !season.data) return;

    const sessionKey = "season-pass-90pct-toast-shown";

    try {
      if (sessionStorage.getItem(sessionKey) === "1") return;

      const { current_xp, current_level, max_level, levels } = season.data;
      const totalXp = Math.max(0, current_xp ?? 0);
      const maxRequired = Math.max(0, ...(levels ?? []).map((l) => l.required_xp ?? 0));
      const isMax = (current_level ?? 0) >= (max_level ?? 0) || totalXp >= maxRequired;
      if (isMax) return;

      const sortedByReq = [...(levels ?? [])].sort((a, b) => (a.required_xp ?? 0) - (b.required_xp ?? 0));
      const nextRow = sortedByReq.find((l) => (l.required_xp ?? 0) > totalXp);
      const prevRow = [...sortedByReq].reverse().find((l) => (l.required_xp ?? 0) <= totalXp);

      const startXp = Math.max(0, prevRow?.required_xp ?? 0);
      const endXp = Math.max(startXp + 1, nextRow?.required_xp ?? maxRequired);

      const segmentXp = Math.max(0, totalXp - startXp);
      const segmentTotal = Math.max(1, endXp - startXp);
      const remaining = Math.max(0, endXp - totalXp);

      let progressPct = Math.floor((segmentXp / segmentTotal) * 100);
      if (remaining > 0) progressPct = Math.min(99, Math.max(0, progressPct));

      if (remaining > 0 && progressPct >= 90) {
        sessionStorage.setItem(sessionKey, "1");
        addToast(
          `거의 다 왔어요! 다음 보상까지 ${remaining.toLocaleString()} XP만 더 모으면 돼요.`,
          "info"
        );
      }
    } catch {
      // sessionStorage 접근 불가 환경에서는 토스트를 스킵합니다.
    }
  }, [season.data, season.isError, season.isLoading, addToast]);

  return (
    <>
      {!nudgeDismissed && nudge ? (
        <div className="landing-font w-full">
          <div className="mx-auto w-full px-4 pt-4 md:px-8">
            <div className="rounded-[12px] border border-black/15 bg-cc-olive/20 px-4 py-3 text-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: baseAccent }}>
                    Tip
                  </p>
                  <p className="mt-1 text-[clamp(14px,2.8vw,16px)] font-semibold text-white/90">{nudge.headline}</p>
                  <p className="mt-1 text-[clamp(12px,2.6vw,13px)] text-white/75">{nudge.body}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/dice"
                    className="rounded-[8px] bg-[#d2fd9c] px-3 py-2 text-[12px] font-semibold text-black hover:brightness-95"
                    onClick={() => {
                      try {
                        localStorage.setItem(nudge.seenKey, "1");
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    게임하러 가기
                  </Link>
                  <button
                    type="button"
                    className="rounded-[8px] border border-black/15 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/10"
                    onClick={() => {
                      try {
                        localStorage.setItem(nudge.seenKey, "1");
                      } catch {
                        // ignore
                      }
                      setNudgeDismissed(true);
                    }}
                  >
                    오늘은 그만 보기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SeasonPassMainPanel />
    </>
  );
};

export default SeasonPassFigmaPage;
