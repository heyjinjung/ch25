import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSeasonPassStatus } from "../hooks/useSeasonPass";
import { useAuth } from "../auth/authStore";
import SeasonPassRewardsAndTasks from "../components/seasonPass/SeasonPassRewardsAndTasks";
import { useToast } from "../components/common/ToastProvider";

const assets = {
  starDynamicPremium: "/assets/figma/star-dynamic-premium.png",
  rouletteSvg: "/images/layer-1.svg",
  levelSvg: "/images/layer-2.svg",
  lotterySvg: "/images/layer-3.svg",
  iconRoulette: "/assets/figma/icon-roulette.png",
  iconLevel: "/assets/figma/icon-level.png",
  iconLottery: "/assets/figma/icon-lottery.png",
};

const baseAccent = "#d2fd9c";

const navLinks = [
  { label: "CC카지노", to: "/landing" },
  { label: "레벨", to: "/season-pass" },
  { label: "팀배틀", to: "/team-battle" },
  { label: "내금고", to: "/landing" },
];

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
          <p className="text-[12px] text-[#d2fd9c]">{statusLabel}</p>
        </div>
      </header>

      <div className="mt-6">
        <div className="flex items-center justify-between text-[12px] text-[#d2fd9c]">
          <span>레벨 {derived.currentLevel}</span>
          <span>레벨 {derived.nextLevel}</span>
        </div>
        <div className="mt-2 h-[6px] w-full rounded-full bg-[#d2fd9c]/20">
          <div className="h-full rounded-full bg-[#d2fd9c]" style={{ width: `${derived.pct}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[12px] text-white/80">
          <span>{derived.currentXp.toLocaleString()} XP</span>
          <span>다음 레벨까지 {derived.remaining.toLocaleString()} XP 남음</span>
        </div>
      </div>

      <div className={"mt-8 flex gap-3 " + (isMobile ? "flex-col" : "flex-row")}
      >
        <div className={"rounded-[6px] bg-black/25 px-4 py-3 text-center " + (isMobile ? "w-full" : "flex-1")}
        >
          <p className="text-[22px] font-bold text-[#d2fd9c]">{derived.totalStamps}</p>
          <p className="mt-1 text-[12px] text-white/80">완료한 미션</p>
        </div>
        <div className={"rounded-[6px] bg-black/25 px-4 py-3 text-center " + (isMobile ? "w-full" : "flex-1")}
        >
          <p className="text-[22px] font-bold text-[#d2fd9c]">{derived.claimedBadges}</p>
          <p className="mt-1 text-[12px] text-white/80">획득한 뱃지</p>
        </div>
        <div className={"rounded-[6px] bg-black/25 px-4 py-3 text-center " + (isMobile ? "w-full" : "flex-1")}
        >
          <p className="text-[22px] font-bold text-[#d2fd9c]">{derived.currentXp.toLocaleString()}</p>
          <p className="mt-1 text-[12px] text-white/80">총 획득 XP</p>
        </div>
      </div>

      {season.isLoading ? (
        <p className="mt-6 text-[12px] text-white/60">레벨 정보를 불러오는 중...</p>
      ) : season.isError ? (
        <p className="mt-6 text-[12px] text-white/60">레벨 정보를 불러오지 못했습니다.</p>
      ) : null}
    </section>
  );
};

const LogoAndGuide: React.FC<{ className?: string }> = ({ className }) => (
  <nav className={"flex items-start justify-between " + (className ?? "")}
  >
    <div className="flex items-center gap-5" aria-label="Company logo">
      <div
        className="relative h-[27px] w-[26px] overflow-hidden rounded-[18px]"
        style={{ backgroundColor: baseAccent }}
      >
        <img
          src={assets.starDynamicPremium}
          alt="CC Casino mark"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <p className="text-[16px] font-semibold tracking-[-0.32px]">CC CASINO</p>
    </div>
    <a href="https://figma.com/sites" className="rounded-[2px] bg-[#d2fd9c] px-[14px] py-[11px] text-[10px] text-black">
      홈페이지 가이드
    </a>
  </nav>
);

const FooterContact: React.FC<{ maxWidthClass: string }> = ({ maxWidthClass }) => (
  <footer className="w-full bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c]">
    <div className={"mx-auto " + maxWidthClass}
    >
      <div className="flex flex-col gap-[12px]">
        <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
        <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
          <p>텔레그램</p>
          <p>지민공지채널</p>
          <p>씨씨사이트</p>
        </div>
      </div>
    </div>
  </footer>
);

const DesktopLayout: React.FC = () => {
  const desktopTiles = [
    { title: "룰렛 경품", to: "/roulette", icon: assets.rouletteSvg, fallback: assets.iconRoulette },
    { title: "레벨 주사위", to: "/dice", icon: assets.levelSvg, fallback: assets.iconLevel },
    { title: "랜덤 복권", to: "/lottery", icon: assets.lotterySvg, fallback: assets.iconLottery },
  ];

  return (
    <div className="hidden lg:block landing-font min-h-screen bg-black text-white overflow-x-auto">
      <div className="mx-auto flex min-h-screen w-[1220px]">
        <div className="flex w-[396px] flex-col justify-between">
          <header className="pl-[10px] pr-[10px] pt-[30px]">
            <div className="flex flex-col gap-[49px] w-[386px]">
              <LogoAndGuide />

              <div className="flex flex-col gap-5">
                <h1 className="w-[381px] text-[42px] font-medium leading-[1.06] tracking-[-0.84px]">
                  지민코드 전용
                  <br />
                  <span style={{ color: baseAccent }}>포인트서비스</span>
                </h1>
              </div>

              <div className="flex flex-col gap-5">
                <h3 className="text-[20px] font-medium" style={{ color: baseAccent }}>
                  게임 바로가기
                </h3>
                <div className="flex gap-[10px]">
                  {desktopTiles.map((tile) => (
                    <Link
                      key={tile.title}
                      to={tile.to}
                      className="flex h-[108px] flex-col items-center justify-center gap-[14px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px]"
                      style={{ width: tile.title === "레벨 주사위" ? 124 : tile.title === "룰렛 경품" ? 116 : 110 }}
                    >
                      <div className="relative h-[30px] w-[30px]">
                        <img
                          src={tile.icon}
                          alt={tile.title}
                          className="absolute inset-0 h-full w-full object-contain"
                          onError={(e) => {
                            if (!tile.fallback) return;
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = tile.fallback;
                          }}
                        />
                      </div>
                      <p className="text-[20px] font-medium leading-[1.15] text-black text-center">{tile.title}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div
                className="flex w-full items-center justify-center gap-x-3 text-[20px] font-medium"
                style={{ color: baseAccent }}
              >
                {navLinks.map((item) => (
                  <Link key={item.label} to={item.to} className="leading-[1.15]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          <footer className="w-[396px] bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c]">
            <div className="flex flex-col gap-[12px]">
              <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
              <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
                <p>텔레그램</p>
                <p>지민공지채널</p>
                <p>씨씨사이트</p>
              </div>
            </div>
          </footer>
        </div>

        <main className="flex flex-1 flex-col items-center justify-start pt-[20px] pr-[19px]">
          <div className="w-[816px]">
            <div className="mt-[10px] px-[32px]">
              <p className="text-[21px] font-medium leading-[22px] tracking-[0.15px]" style={{ color: baseAccent }}>
                지민이와 함께하는 겨울 시즌 패스
              </p>
              <p className="mt-2 text-[60px] font-bold leading-[76px] tracking-[0.5px]" style={{ color: baseAccent }}>
                내 레벨 확인
              </p>
            </div>

            <div className="mt-[130px] flex justify-center">
              <LevelCard variant="desktop" />
            </div>

            <div className="mt-[40px] px-[32px] pb-[60px]">
              <SeasonPassRewardsAndTasks />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const TabletLayout: React.FC = () => {
  const tabletModules: Array<{ label: React.ReactNode; to: string }> = [
    { label: <>씨씨<br />카지노</>, to: "/landing" },
    { label: <>내 레벨</>, to: "/season-pass" },
    { label: <>랜덤<br />복권</>, to: "/lottery" },
    { label: <>레벨<br />주사위</>, to: "/dice" },
    { label: <>룰렛<br />경품</>, to: "/roulette" },
    { label: <>팀배틀</>, to: "/team-battle" },
    { label: <>금고<br />서비스</>, to: "/landing" },
  ];

  return (
    <div className="hidden md:flex lg:hidden min-h-screen bg-black text-white flex-col">
      <div className="flex-1 flex flex-col items-center">
        <header className="w-full max-w-[800px] px-[24px] pt-[21px] pb-[30px]">
          <div className="flex flex-col gap-[20px]">
            <LogoAndGuide className="w-full" />

            <div className="flex flex-col gap-[20px]">
              <h1 className="text-[clamp(28px,5vw,42px)] font-medium leading-[1.06] tracking-[-0.84px]">
                지민코드 전용 <span style={{ color: baseAccent }}>포인트서비스</span>
              </h1>
            </div>

            <div className="flex flex-col gap-[9px]">
              <h3 className="text-[20px] font-medium leading-[1.15]" style={{ color: baseAccent }}>
                게임 바로가기
              </h3>
              <div className="w-full overflow-x-auto">
                <div className="flex min-w-max items-center justify-center gap-[26px] px-0 py-[5px]">
                  {tabletModules.map((m, idx) => (
                    <Link
                      key={idx}
                      to={m.to}
                      className="shrink-0 flex h-[85px] w-[85px] flex-col items-center justify-center rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px]"
                    >
                      <p className="text-center text-[clamp(16px,2.4vw,20px)] font-medium leading-[1.15] text-black whitespace-pre-wrap">
                        {m.label}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-[800px] px-[24px] pb-[40px]">
          <div className="pt-[10px]">
            <p className="text-[21px] font-medium leading-[22px] tracking-[0.15px]" style={{ color: baseAccent }}>
              지민이와 함께하는 겨울 시즌 패스
            </p>
            <p className="mt-2 text-[clamp(40px,7vw,60px)] font-bold leading-[1.15] tracking-[0.5px]" style={{ color: baseAccent }}>
              내 레벨 확인
            </p>
          </div>

          <div className="mt-[70px] flex justify-center">
            <LevelCard variant="tablet" />
          </div>

          <div className="mt-[30px] pb-[40px]">
            <SeasonPassRewardsAndTasks />
          </div>
        </main>
      </div>

      <FooterContact maxWidthClass="max-w-[800px]" />
    </div>
  );
};

const MobileLayout: React.FC = () => {
  const mobileTiles = [
    { title: "룰렛 경품", to: "/roulette", icon: assets.rouletteSvg, fallback: assets.iconRoulette },
    { title: "레벨 주사위", to: "/dice", icon: assets.levelSvg, fallback: assets.iconLevel },
    { title: "랜덤 복권", to: "/lottery", icon: assets.lotterySvg, fallback: assets.iconLottery },
  ];

  const renderTileLabel = (title: string) => {
    const parts = title.split(" ").filter(Boolean);
    if (parts.length !== 2) {
      return (
        <span className="block whitespace-nowrap">
          {title}
        </span>
      );
    }

    return (
      <span className="flex flex-col items-center leading-[1.05]">
        <span className="block whitespace-nowrap">{parts[0]}</span>
        <span className="block whitespace-nowrap">{parts[1]}</span>
      </span>
    );
  };

  return (
    <div className="md:hidden min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center">
        <header className="w-full max-w-[388px] px-[10px] pt-[20px]">
          <div className="flex flex-col gap-[20px]">
            <LogoAndGuide className="w-full" />

            <div className="flex flex-col gap-[20px]">
              <h1 className="text-[clamp(28px,7vw,42px)] font-medium leading-[1.06] tracking-[-0.84px]">
                지민코드 전용 <span style={{ color: baseAccent }}>포인트서비스</span>
              </h1>
            </div>

            <div className="flex flex-col gap-[11px]">
              <h3 className="text-[20px] font-medium leading-[1.15]" style={{ color: baseAccent }}>
                게임 바로가기
              </h3>
              <div className="grid grid-cols-3 gap-[10px]">
                {mobileTiles.map((tile) => (
                  <Link
                    key={tile.title}
                    to={tile.to}
                    className="min-w-0 flex h-[99px] w-full flex-col items-center justify-between rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px]"
                  >
                    <div className="relative h-[30px] w-[30px]">
                      <img
                        src={tile.icon}
                        alt={tile.title}
                        className="absolute inset-0 h-full w-full object-contain"
                        onError={(e) => {
                          if (!tile.fallback) return;
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = tile.fallback;
                        }}
                      />
                    </div>
                    <p className="text-center text-[clamp(14px,4vw,20px)] font-medium leading-[1.1] text-black">
                      {renderTileLabel(tile.title)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex w-full items-center justify-center gap-x-[12.8px] text-[20px] font-medium" style={{ color: baseAccent }}>
              {navLinks.map((item) => (
                <Link key={item.label} to={item.to} className="leading-[1.15]">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <main className="w-full max-w-[388px] px-[10px] pb-[40px]">
          <div className="pt-[30px]">
            <p className="text-[clamp(16px,4.2vw,20px)] font-normal leading-[1.09] tracking-[-0.4px]" style={{ color: baseAccent }}>
              지민이와 함께하는 겨울 시즌 패스
            </p>
            <p className="mt-2 text-[clamp(32px,8vw,42px)] font-medium leading-[1.06] tracking-[-0.84px]" style={{ color: baseAccent }}>
              내 레벨 확인
            </p>
          </div>

          <div className="mt-[30px] flex justify-center">
            <LevelCard variant="mobile" />
          </div>

          <div className="mt-[24px] pb-[40px]">
            <SeasonPassRewardsAndTasks />
          </div>
        </main>
      </div>

      <FooterContact maxWidthClass="max-w-[388px]" />
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
    <div className="bg-black">
      <DesktopLayout />
      <TabletLayout />
      <MobileLayout />
    </div>
  );
};

export default SeasonPassFigmaPage;
