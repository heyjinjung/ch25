import React, { useEffect, useMemo } from "react";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { useAuth } from "../auth/authStore";
import SeasonPassRewardsAndTasks from "../components/seasonPass/SeasonPassRewardsAndTasks";
import { useToast } from "../components/common/ToastProvider";

const baseAccent = "#d2fd9c";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

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
  const statusLabel = user?.status || "활동 중";

  const isMobile = variant === "mobile";

  return (
    <section
      className={
        "w-full rounded-[10px] bg-[#394508]/55 text-white " +
        (isMobile ? "max-w-[353px] px-[16px] py-[18px]" : "max-w-[616px] px-[26px] py-[22px]")
      }
      aria-label="내 레벨 카드"
    >
      <header className="flex items-center gap-4">
        <div className="relative h-[54px] w-[54px] rounded-full bg-black/30">
          <div className="absolute inset-0 flex items-center justify-center text-[18px] font-semibold text-[#d2fd9c]">
            {displayName.slice(0, 1)}
          </div>
          <div
            className="absolute -bottom-1 -right-1 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#d2fd9c] text-[11px] font-bold text-black"
            aria-label="현재 레벨"
          >
            {derived.currentLevel}
          </div>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{displayName}</p>
          <p className="text-[clamp(13px,2.8vw,14px)] text-[#d2fd9c]">{statusLabel}</p>
        </div>
      </header>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[clamp(13px,2.8vw,14px)] text-[#d2fd9c]">
          <span>레벨 {derived.currentLevel}</span>
          <span>레벨 {derived.nextLevel}</span>
        </div>
        <div className="mt-2 h-[6px] w-full rounded-full bg-[#d2fd9c]/20">
          <div className="h-full rounded-full bg-[#d2fd9c]" style={{ width: `${derived.pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[clamp(13px,2.8vw,14px)] text-white/85">
          <span>{derived.currentXp.toLocaleString()} XP</span>
          <span>다음 레벨까지 {derived.remaining.toLocaleString()} XP 남음</span>
        </div>
      </div>

      <div className={"mt-8 flex gap-3 " + (isMobile ? "flex-col" : "flex-row")}
      >
        <div className={"rounded-[6px] bg-black/25 px-4 py-3 text-center " + (isMobile ? "w-full" : "flex-1")}
        >
          <p className="text-[22px] font-bold text-[#d2fd9c]">{derived.totalStamps}</p>
          <p className="mt-1 text-[clamp(13px,2.8vw,14px)] text-white/85">완료한 미션</p>
        </div>
        <div className={"rounded-[6px] bg-black/25 px-4 py-3 text-center " + (isMobile ? "w-full" : "flex-1")}
        >
          <p className="text-[22px] font-bold text-[#d2fd9c]">{derived.claimedBadges}</p>
          <p className="mt-1 text-[clamp(13px,2.8vw,14px)] text-white/85">획득한 뱃지</p>
        </div>
        <div className={"rounded-[6px] bg-black/25 px-4 py-3 text-center " + (isMobile ? "w-full" : "flex-1")}
        >
          <p className="text-[22px] font-bold text-[#d2fd9c]">{derived.currentXp.toLocaleString()}</p>
          <p className="mt-1 text-[clamp(13px,2.8vw,14px)] text-white/85">총 획득 XP</p>
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
      <div className="mx-auto w-full max-w-[1040px]">
        <div className="pt-2">
          <p className="text-[clamp(15px,2.8vw,21px)] font-medium leading-[1.15] tracking-[-0.2px]" style={{ color: baseAccent }}>
            지민이와 함께하는 겨울 시즌 패스
          </p>
          <h1 className="mt-2 text-[clamp(34px,6vw,60px)] font-bold leading-[1.1] tracking-[0.2px]" style={{ color: baseAccent }}>
            내 레벨 확인
          </h1>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="hidden lg:block">
            <LevelCard variant="desktop" />
          </div>
          <div className="hidden md:block lg:hidden">
            <LevelCard variant="tablet" />
          </div>
          <div className="md:hidden">
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
    <SeasonPassMainPanel />
  );
};

export default SeasonPassFigmaPage;
