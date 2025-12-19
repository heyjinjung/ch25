import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authStore";

const baseAccent = "#d2fd9c";

const assets = {
  starDynamicPremium: "/assets/figma/star-dynamic-premium.png",
  rouletteSvg: "/images/layer-1.svg",
  levelSvg: "/images/layer-2.svg",
  lotterySvg: "/images/layer-3.svg",
  iconRoulette: "/assets/figma/icon-roulette.png",
  iconLevel: "/assets/figma/icon-level.png",
  iconLottery: "/assets/figma/icon-lottery.png",
};

type ModuleTile = {
  to: string;
  title: React.ReactNode;
  icon: string;
  fallback?: string;
  widthClassDesktop: string;
};

const DesktopTiles: ModuleTile[] = [
  {
    to: "/roulette",
    title: "룰렛 경품",
    icon: assets.rouletteSvg,
    fallback: assets.iconRoulette,
    widthClassDesktop: "w-[116px]",
  },
  {
    to: "/dice",
    title: "레벨 주사위",
    icon: assets.levelSvg,
    fallback: assets.iconLevel,
    widthClassDesktop: "w-[124px]",
  },
  {
    to: "/lottery",
    title: "랜덤 복권",
    icon: assets.lotterySvg,
    fallback: assets.iconLottery,
    widthClassDesktop: "w-[110px]",
  },
];

const MobileTiles: ModuleTile[] = [
  {
    to: "/dice",
    title: "레벨 주사위",
    icon: assets.levelSvg,
    fallback: assets.iconLevel,
    widthClassDesktop: "",
  },
  {
    to: "/lottery",
    title: (
      <span className="flex flex-col items-center leading-[1.15]">
        <span>복권</span>
        <span>랜덤뽑기</span>
      </span>
    ),
    icon: assets.lotterySvg,
    fallback: assets.iconLottery,
    widthClassDesktop: "",
  },
  {
    to: "/roulette",
    title: (
      <span className="flex flex-col items-center leading-[1.15]">
        <span>룰렛</span>
        <span>경품뽑기</span>
      </span>
    ),
    icon: assets.rouletteSvg,
    fallback: assets.iconRoulette,
    widthClassDesktop: "",
  },
];

const Logo: React.FC = () => (
  <div className="flex items-center gap-5" aria-label="Company logo">
    <div className="relative h-[27px] w-[26px] overflow-hidden rounded-[18px]">
      <img
        src={assets.starDynamicPremium}
        alt="CC Casino mark"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
    </div>
    <p className="text-[16px] font-semibold tracking-[-0.32px] text-white">CC CASINO</p>
  </div>
);

const GuideButton: React.FC = () => (
  <Link
    to="/guide"
    className="shrink-0 rounded-[2px] bg-[#d2fd9c] px-[14px] py-[11px] text-[10px] tracking-[-0.2px] text-black hover:bg-[#b8e685]"
  >
    홈페이지 가이드
  </Link>
);

const UserBadge: React.FC = () => {
  const { user } = useAuth();
  const name = (user?.nickname || user?.external_id || "지민").toString();
  const level = user?.level ?? 1;

  return (
    <div className="rounded-full border border-white/15 bg-white/5 px-3 py-[6px] text-[12px] leading-none text-white/85">
      <span className="max-w-[120px] truncate align-middle">{name}</span>
      <span className="align-middle">레벨 </span>
      <span className="align-middle font-semibold" style={{ color: baseAccent }}>
        {level}
      </span>
    </div>
  );
};

const DesktopSidebarContent: React.FC = () => {
  return (
    <div className="hidden h-full w-full flex-col overflow-hidden lg:flex">
      <div className="flex flex-1 flex-col gap-[49px] overflow-y-auto px-[20px] py-[30px]">
        <nav className="flex w-full items-start justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <UserBadge />
            <GuideButton />
          </div>
        </nav>

        <div className="flex flex-col gap-[20px]">
          <h1 className="text-[42px] font-medium leading-[1.058] tracking-[-0.84px] text-white">
            지민코드 전용
            <br />
            <span style={{ color: baseAccent }}>포인트서비스</span>
          </h1>
          <h2 className="text-[16px] font-normal leading-[1.09] text-[#cbcbcb]">
            개인정보 입력 없이
            <br />
            자유롭게 이용하세요
          </h2>
        </div>

        <div className="flex flex-col gap-[20px]">
          <h3 className="text-[20px] font-medium leading-[1.15]" style={{ color: baseAccent }}>
            게임 바로가기
          </h3>
          <div className="flex gap-[10px]">
            {DesktopTiles.map((tile) => (
              <Link
                key={tile.to}
                to={tile.to}
                className={
                  "content-stretch flex h-[108px] flex-col items-center justify-center gap-[14px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px] " +
                  tile.widthClassDesktop
                }
              >
                <div className="relative h-[30px] w-[30px]">
                  <img
                    src={tile.icon}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain"
                    onError={(e) => {
                      if (!tile.fallback) return;
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = tile.fallback;
                    }}
                  />
                </div>
                <p className="text-center text-[20px] font-medium leading-[1.15] text-black">{tile.title}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-[12.8px] text-[20px] font-medium" style={{ color: baseAccent }}>
          <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="leading-[1.15]">
            CC카지노
          </a>
          <Link to="/season-pass" className="leading-[1.15]">
            레벨
          </Link>
          <Link to="/team-battle" className="leading-[1.15]">
            팀배틀
          </Link>
          <Link to="/landing" className="leading-[1.15]">
            내금고
          </Link>
        </div>
      </div>

      <footer className="w-full shrink-0 bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c]">
        <div className="flex flex-col gap-[12px]">
          <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
          <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
            <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">
              CC카지노
            </a>
            <a href="https://t.me/jm956" target="_blank" rel="noreferrer" className="hover:opacity-90">
              텔레그램
            </a>
            <a href="https://t.me/+LksI3XlSjLlhZmE0" target="_blank" rel="noreferrer" className="hover:opacity-90">
              지민공지채널
            </a>
            <a href="https://t.me/+IE0NYpuze_k1YWZk" target="_blank" rel="noreferrer" className="hover:opacity-90">
              씨씨카지노 공식채널
            </a>
            <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">
              씨씨사이트
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const MobileSidebarContent: React.FC = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden lg:hidden">
      <div className="flex flex-1 flex-col gap-[20px] bg-black px-[20px] pb-[30px] pt-[20px]">
        <div className="flex w-full items-start justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <UserBadge />
            <GuideButton />
          </div>
        </div>

        <h1 className="text-[42px] font-medium leading-[1.058] tracking-[-0.84px] text-white">
          지민코드 전용
          <br />
          <span style={{ color: baseAccent }}>포인트 서비스</span>
        </h1>

        <div className="flex flex-col gap-[6px]">
          <h3
            className="text-[20px] font-medium leading-[1.15]"
            style={{ color: baseAccent, textShadow: "0px 4px 4px rgba(0,0,0,0.25)" }}
          >
            게임 바로가기
          </h3>
          <div className="flex flex-wrap gap-[10px]">
            {MobileTiles.map((tile) => (
              <Link
                key={tile.to}
                to={tile.to}
                className="flex-1 min-w-[110px]"
              >
                <div className="flex h-[120px] w-full flex-col items-center justify-center gap-[14px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px]">
                  <div className="relative h-[30px] w-[30px]">
                    <img
                      src={tile.icon}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                      onError={(e) => {
                        if (!tile.fallback) return;
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = tile.fallback;
                      }}
                    />
                  </div>
                  <div className="text-center text-[20px] font-medium leading-[1.15] text-black">{tile.title}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-[12.8px] text-[20px] font-medium" style={{ color: baseAccent }}>
          <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="leading-[1.15]">
            CC 카지노
          </a>
          <Link to="/season-pass" className="leading-[1.15]">
            레벨확인
          </Link>
          <Link to="/team-battle" className="leading-[1.15]">
            팀배틀
          </Link>
          <Link to="/landing" className="leading-[1.15]">
            내 금고
          </Link>
        </div>
      </div>
    </div>
  );
};

export const SidebarMobileFooter: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <footer className={"shrink-0 bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c] " + (className ?? "")}>
      <div className="flex flex-col gap-[12px]">
        <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
        <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
          <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">
            CC카지노
          </a>
          <a href="https://t.me/jm956" target="_blank" rel="noreferrer" className="hover:opacity-90">
            텔레그램
          </a>
          <a href="https://t.me/+LksI3XlSjLlhZmE0" target="_blank" rel="noreferrer" className="hover:opacity-90">
            지민공지채널
          </a>
          <a href="https://t.me/+IE0NYpuze_k1YWZk" target="_blank" rel="noreferrer" className="hover:opacity-90">
            씨씨카지노 공식채널
          </a>
          <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">
            씨씨사이트
          </a>
        </div>
        <div className="mt-6 flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
          <a href="https://figma.com/sites" target="_blank" rel="noreferrer" className="hover:opacity-90">
            Terms & Conditions
          </a>
          <a href="https://figma.com/sites" target="_blank" rel="noreferrer" className="hover:opacity-90">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
};

const SidebarContainer: React.FC = () => {
  return (
    <header className="landing-font h-full w-full">
      <DesktopSidebarContent />
      <MobileSidebarContent />
    </header>
  );
};

export default SidebarContainer;
