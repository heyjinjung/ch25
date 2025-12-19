import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/authStore";

// Mobile-specific assets stored under public/assets/figma
const assets = {
  starDynamicPremium: "/assets/figma/star-dynamic-premium-mobile.png",
  headerImage: "/assets/figma/header-banner-mobile.png",
  benefitImage: "/assets/figma/benefit-card-mobile.png",
  iconPeople: "/assets/figma/icon-people-mobile.png",
  iconWallet: "/assets/figma/icon-wallet-mobile.png",
  iconSecurity: "/assets/figma/icon-security-mobile.png",
  iconGraph: "/assets/figma/icon-graph-mobile.png",
  iconLevel: "/assets/figma/icon-level-mobile.png",
  iconLottery: "/assets/figma/icon-lottery-mobile.png",
  iconRoulette: "/assets/figma/icon-roulette-mobile.png",
  rouletteSvg: "/images/layer-1.svg", // lightning
  levelSvg: "/images/layer-2.svg", // globe
  lotterySvg: "/images/layer-3.svg", // shield
};

const navLinks = [
  { label: "CC 카지노", to: "https://ccc-010.com" },
  { label: "레벨확인", to: "/season-pass" },
  { label: "팀배틀", to: "/team-battle" },
  { label: "내 금고", to: "/landing" },
];

const gameTiles = [
  { title: "레벨 주사위", to: "/dice", icon: assets.levelSvg, fallback: assets.iconLevel },
  { title: "복권 랜덤뽑기", to: "/lottery", icon: assets.lotterySvg, fallback: assets.iconLottery },
  { title: "룰렛 경품뽑기", to: "/roulette", icon: assets.rouletteSvg, fallback: assets.iconRoulette },
];

const howToIcons: { title: string; icon: string; href?: string }[] = [
  { title: "친구초대", icon: assets.iconPeople },
  { title: "씨씨이용하기", icon: assets.iconWallet, href: "https://ccc-010.com" },
  { title: "금고서비스", icon: assets.iconSecurity },
  { title: "포인트게임하기", icon: assets.iconGraph },
];

const baseAccent = "#d2fd9c";
const deepOlive = "#394508";

const MobileLanding: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center gap-[16px] pb-[20px]">
      {/* Header / Sidebar container */}
      <header className="w-full max-w-[388px] bg-black text-white flex flex-col gap-[20px] px-[20px] pt-[20px] pb-[30px]">
        <nav className="flex items-start justify-between w-full">
          <div className="flex items-center gap-5" aria-label="Company logo">
            <div className="relative h-[27px] w-[26px] overflow-hidden rounded-[18px]" style={{ backgroundColor: baseAccent }}>
              <img src={assets.starDynamicPremium} alt="CC Casino mark" className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <p className="text-[16px] font-semibold tracking-[-0.32px]">CC CASINO</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {user ? (
              <div className="max-w-[220px] rounded-full border border-white/15 bg-white/5 px-3 py-[6px] text-[12px] leading-none text-white/85">
                <span className="max-w-[140px] truncate align-middle">{user.nickname || user.external_id}</span>{" "}
                <span className="align-middle font-semibold" style={{ color: baseAccent }}>
                  Lv.{user.level ?? 1}
                </span>
              </div>
            ) : null}
            <a
              href="https://figma.com/sites"
              className="shrink-0 rounded-[2px] bg-[#d2fd9c] px-[14px] py-[11px] text-[10px] text-black"
            >
              홈페이지 가이드
            </a>
          </div>
        </nav>

        <div className="flex flex-col gap-[20px] w-full">
          <h1 className="w-[280px] text-[42px] font-medium leading-[1.06] tracking-[-0.84px]">
            지민코드 전용
            <br />
            <span style={{ color: baseAccent }}>포인트 서비스</span>
          </h1>
        </div>

        <div className="flex flex-col gap-[6px] w-full">
          <h3 className="text-[20px] font-medium" style={{ color: baseAccent }}>
            게임 바로가기
          </h3>
          <div className="flex flex-wrap gap-[10px] w-full">
            {gameTiles.map((tile) => (
              <Link
                key={tile.title}
                to={tile.to}
                className="flex-1 min-w-[110px] h-[120px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px] flex flex-col items-center gap-[14px]"
              >
                <div className="relative h-[30px] w-[30px]">
                  <img
                    src={tile.icon}
                    alt={tile.title}
                    className="absolute inset-0 h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = tile.fallback;
                    }}
                  />
                </div>
                <p className="text-[20px] font-medium leading-[1.15] text-black text-center whitespace-pre-wrap">{tile.title}</p>
              </Link>
            ))}
          </div>
        </div>

        <div
          className="flex w-full flex-wrap items-center justify-center gap-x-[12.8px] gap-y-2 text-[20px] font-medium text-center"
          style={{ color: baseAccent }}
        >
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
      </header>

      {/* Main content */}
      <main className="w-full max-w-[388px] flex flex-col">
        <a href="https://ccc-010.com" className="flex flex-col items-center bg-white px-[20px] py-[20px]">
          <div className="relative w-full max-w-[340px] overflow-hidden rounded-[20px]" style={{ aspectRatio: "323/216" }}>
            <img src={assets.headerImage} alt="이벤트 배너" className="absolute inset-0 h-full w-full object-contain" />
          </div>
        </a>

        <section className="bg-white flex flex-col items-center gap-[24px] px-[20px] py-[20px]">
          <h2 className="w-full text-center text-[32px] font-medium tracking-[-0.64px] text-black">진행중인 이벤트</h2>
          <div className="flex flex-col gap-[20px] w-full items-center">
            <div className="flex flex-col gap-[19px] w-full max-w-[335px]">
              <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "285/221" }}>
                <img src={assets.benefitImage} alt="매일 터지는 룰렛 경품추첨" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <p className="text-[20px] font-medium leading-[1.15] text-left text-black"> 매일 터지는 룰렛 경품추첨</p>
            </div>
          </div>
        </section>

        <section className="bg-white flex flex-col items-center gap-[20px] px-[20px] pt-[20px] pb-[29px]">
          <h2 className="text-[32px] font-medium tracking-[-0.64px] text-center" style={{ color: deepOlive }}>
            지민이벤트 이용하는 법
          </h2>
          <div className="flex flex-wrap justify-center gap-[20px] w-full">
            {howToIcons.map((item) => {
              const Wrapper = item.href ? "a" : "div";
              return (
                <Wrapper
                  key={item.title}
                  {...(item.href
                    ? {
                        href: item.href,
                        target: "_blank",
                        rel: "noreferrer",
                        className: "flex flex-col items-center gap-[15px] w-[140px] hover:opacity-90",
                      }
                    : { className: "flex flex-col items-center gap-[15px] w-[140px]" })}
                >
                  <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "335/250" }}>
                    <img src={item.icon} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <p className="text-[18px] font-medium leading-[1.15] text-center text-black whitespace-pre-wrap">{item.title}</p>
                </Wrapper>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="w-full max-w-[375px] bg-[#394508] px-[20px] py-[30px] text-[#d2fd9c]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-[12px]">
            <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
            <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
              <a href="https://t.me/jm956" target="_blank" rel="noreferrer" className="hover:opacity-90">텔레그램</a>
              <a href="https://t.me/+LksI3XlSjLlhZmE0" target="_blank" rel="noreferrer" className="hover:opacity-90">지민공지채널</a>
              <a href="https://ccc-010.com" target="_blank" rel="noreferrer" className="hover:opacity-90">씨씨사이트</a>
              <a href="https://t.me/+IE0NYpuze_k1YWZk" target="_blank" rel="noreferrer" className="hover:opacity-90">씨씨카지노 공식채널</a>
            </div>
          </div>
          <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
            <a href="https://figma.com/sites">Terms & Conditions</a>
            <a href="https://figma.com/sites">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MobileLanding;
