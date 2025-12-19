import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getActiveSeason, getLeaderboard, getMyTeam } from "../api/teamBattleApi";
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
  { label: "CC카지노", to: "https://ccc-010.com" },
  { label: "레벨", to: "/season-pass" },
  { label: "팀배틀", to: "/team-battle" },
  { label: "내금고", to: "/landing" },
];

const formatCountdown = (endsAt?: string | null) => {
  if (!endsAt) return "-";
  const endStr = endsAt.endsWith("Z") ? endsAt : `${endsAt}Z`;
  const now = Date.now();
  const end = new Date(endStr).getTime();
  const diff = end - now;
  if (diff <= 0) return "종료";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return `${hours}시간 ${minutes}분`;
};

type ViewportVariant = "desktop" | "tablet" | "mobile";

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
    <a
      href="https://figma.com/sites"
      className="rounded-[2px] bg-[#d2fd9c] px-[14px] py-[11px] text-[clamp(11px,2.6vw,12px)] font-medium text-black"
    >
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
          <a href="https://t.me/jm956" target="_blank" rel="noreferrer" className="hover:opacity-90">텔레그램</a>
          <a href="https://t.me/+LksI3XlSjLlhZmE0" target="_blank" rel="noreferrer" className="hover:opacity-90">지민공지채널</a>
          <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">씨씨사이트</a>
          <a href="https://t.me/+IE0NYpuze_k1YWZk" target="_blank" rel="noreferrer" className="hover:opacity-90">씨씨카지노 공식채널</a>
        </div>
      </div>
    </div>
  </footer>
);

const TeamBattleMainPanel: React.FC<{ variant: ViewportVariant }> = ({ variant }) => {
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToast();

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

  const leaderboard = leaderboardQuery.data ?? [];

  const myLeaderboardIndex = useMemo(() => {
    if (myTeamId === null) return -1;
    return leaderboard.findIndex((row) => row.team_id === myTeamId);
  }, [leaderboard, myTeamId]);

  const myRank = myLeaderboardIndex >= 0 ? myLeaderboardIndex + 1 : null;
  const myPoints = myLeaderboardIndex >= 0 ? leaderboard[myLeaderboardIndex]?.points ?? 0 : null;

  const behindBy = useMemo(() => {
    if (myTeamId === null || myLeaderboardIndex < 0 || leaderboard.length === 0) return null;
    const top = leaderboard[0];
    const mine = leaderboard[myLeaderboardIndex];
    if (!top || !mine) return null;
    if (top.team_id === myTeamId) return 0;
    return Math.max(0, (top.points ?? 0) - (mine.points ?? 0));
  }, [leaderboard, myLeaderboardIndex, myTeamId]);

  const showBehindBanner = typeof behindBy === "number" && behindBy >= 50;

  useEffect(() => {
    if (!seasonId || myTeamId === null) return;
    if (leaderboardQuery.isLoading || leaderboardQuery.isError) return;
    if (myLeaderboardIndex < 0) return;
    if (myRank === null || myPoints === null) return;

    const snapshotKey = `teamBattle.snapshot.${seasonId}.${myTeamId}`;
    const behindToastKey = `teamBattle.behindToast.${seasonId}.${myTeamId}`;

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

      if (typeof behindBy === "number" && behindBy >= 50) {
        if (sessionStorage.getItem(behindToastKey) !== "1") {
          sessionStorage.setItem(behindToastKey, "1");
          addToast(`우리 팀이 1위와 ${behindBy.toLocaleString()}점 차이예요. 지금 달려요!`, "info");
        }
      }

      localStorage.setItem(snapshotKey, JSON.stringify({ points: myPoints, rank: myRank, capturedAt: Date.now() }));
    } catch {
      // storage 접근/파싱 실패 시 알림 로직을 스킵합니다.
    }
  }, [addToast, behindBy, leaderboardQuery.isError, leaderboardQuery.isLoading, myLeaderboardIndex, myPoints, myRank, myTeamId, seasonId]);

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

        {showBehindBanner && myRank !== null && myPoints !== null ? (
          <div className="mt-[12px] rounded-[10px] border border-white/10 bg-[#394508]/20 px-[18px] py-[14px]">
            <p className="text-[clamp(13px,2.6vw,14px)] font-semibold text-white/90">
              지금 우리 팀이 <span style={{ color: baseAccent }}>#{myRank}</span> ( {myPoints.toLocaleString()}점 ) · 1위와{" "}
              <span style={{ color: baseAccent }}>{behindBy?.toLocaleString()}점</span> 차이
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

const DesktopLayout: React.FC = () => {
  const desktopTiles = [
    { title: "룰렛 경품", to: "/roulette", icon: assets.rouletteSvg, fallback: assets.iconRoulette },
    { title: "레벨 주사위", to: "/dice", icon: assets.levelSvg, fallback: assets.iconLevel },
    { title: "랜덤 복권", to: "/lottery", icon: assets.lotterySvg, fallback: assets.iconLottery },
  ];

  return (
    <div className="hidden lg:block landing-font min-h-screen bg-black text-white overflow-x-auto">
      <div className="mx-auto flex min-h-screen w-[1280px]">
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
                <h2 className="text-[16px] font-normal leading-[1.09] text-[#cbcbcb]">No personal cre핵심 캐치문구</h2>
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

              <div className="flex w-full items-center justify-center gap-x-3 text-[20px] font-medium" style={{ color: baseAccent }}>
                {navLinks.map((item) =>
                  item.to.startsWith("http") ? (
                    <a
                      key={item.label}
                      href={item.to}
                      target="_blank"
                      rel="noreferrer"
                      className="leading-[1.15]"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link key={item.label} to={item.to} className="leading-[1.15]">
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </div>
          </header>

          <footer className="w-[396px] bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c]">
            <div className="flex flex-col gap-[12px]">
              <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
              <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
                <a href="https://t.me/jm956" target="_blank" rel="noreferrer" className="hover:opacity-90">텔레그램</a>
                <a href="https://t.me/+LksI3XlSjLlhZmE0" target="_blank" rel="noreferrer" className="hover:opacity-90">지민공지채널</a>
                <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">씨씨사이트</a>
                <a href="https://t.me/+IE0NYpuze_k1YWZk" target="_blank" rel="noreferrer" className="hover:opacity-90">씨씨카지노 공식채널</a>
              </div>
            </div>
          </footer>
        </div>

        <main className="flex flex-1 flex-col items-center justify-start">
          <div className="w-[884px] pt-[40px]">
            <div className="px-[43px]">
              <TeamBattleMainPanel variant="desktop" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const TabletLayout: React.FC = () => {
  const tabletModules: Array<{ label: React.ReactNode; to: string }> = [
    { label: <>씨씨<br />카지노</>, to: "https://ccc-010.com" },
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
                  {tabletModules.map((m, idx) =>
                    m.to.startsWith("http") ? (
                      <a
                        key={idx}
                        href={m.to}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 flex h-[85px] w-[85px] flex-col items-center justify-center rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px]"
                      >
                        <p className="text-center text-[clamp(16px,2.4vw,20px)] font-medium leading-[1.15] text-black whitespace-pre-wrap">
                          {m.label}
                        </p>
                      </a>
                    ) : (
                      <Link
                        key={idx}
                        to={m.to}
                        className="shrink-0 flex h-[85px] w-[85px] flex-col items-center justify-center rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px]"
                      >
                        <p className="text-center text-[clamp(16px,2.4vw,20px)] font-medium leading-[1.15] text-black whitespace-pre-wrap">
                          {m.label}
                        </p>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full max-w-[800px] pb-[40px]">
          <TeamBattleMainPanel variant="tablet" />
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
      return <span className="block whitespace-nowrap">{title}</span>;
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
              {navLinks.map((item) =>
                item.to.startsWith("http") ? (
                  <a key={item.label} href={item.to} target="_blank" rel="noreferrer" className="leading-[1.15]">
                    {item.label}
                  </a>
                ) : (
                  <Link key={item.label} to={item.to} className="leading-[1.15]">
                    {item.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </header>

        <main className="w-full max-w-[388px] pb-[40px]">
          <TeamBattleMainPanel variant="mobile" />
        </main>
      </div>

      <FooterContact maxWidthClass="max-w-[388px]" />
    </div>
  );
};

const TeamBattleFigmaPage: React.FC = () => {
  return (
    <div className="bg-black">
      <DesktopLayout />
      <TabletLayout />
      <MobileLayout />
    </div>
  );
};

export default TeamBattleFigmaPage;
