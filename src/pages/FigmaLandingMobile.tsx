import React from "react";

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
  { label: "CC 카지노", href: "https://figma.com/sites" },
  { label: "레벨확인", href: "https://figma.com/sites" },
  { label: "팀배틀", href: "https://figma.com/sites" },
  { label: "내 금고", href: "https://figma.com/sites" },
];

const gameTiles = [
  { title: "레벨 주사위", icon: assets.levelSvg, fallback: assets.iconLevel },
  { title: "복권 랜덤뽑기", icon: assets.lotterySvg, fallback: assets.iconLottery },
  { title: "룰렛 경품뽑기", icon: assets.rouletteSvg, fallback: assets.iconRoulette },
];

const howToIcons = [
  { title: "친구초대", icon: assets.iconPeople },
  { title: "씨씨이용하기", icon: assets.iconWallet },
  { title: "금고서비스", icon: assets.iconSecurity },
  { title: "포인트게임하기", icon: assets.iconGraph },
];

const baseAccent = "#d2fd9c";
const deepOlive = "#394508";

const MobileLanding: React.FC = () => {
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
          <a
            href="https://figma.com/sites"
            className="shrink-0 rounded-[2px] bg-[#d2fd9c] px-[14px] py-[11px] text-[10px] text-black"
          >
            홈페이지 가이드
          </a>
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
              <button
                key={tile.title}
                className="flex-1 min-w-[110px] h-[120px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px] flex flex-col items-center gap-[14px]"
              >
                <div className="relative h-[30px] w-[30px]">
                  <img
                    src={tile.icon}
                    alt={tile.title}
                    className="absolute inset-0 h-full w-full object-contain"
                    onError={(e) => {
                      if (!("fallback" in tile) || !tile.fallback) return;
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = tile.fallback;
                    }}
                  />
                </div>
                <p className="text-[20px] font-medium leading-[1.15] text-black text-center whitespace-pre-wrap">{tile.title}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-[12.8px] text-[20px] font-medium" style={{ color: baseAccent }}>
          {navLinks.map((item) => (
            <a key={item.label} href={item.href} className="leading-[1.15]">
              {item.label}
            </a>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="w-full max-w-[388px] flex flex-col">
        <a href="https://ccc-010.com" className="flex flex-col items-center bg-white px-[20px] pt-0 pb-[7px]">
          <div className="relative w-full max-w-[340px] overflow-hidden rounded-[20px]" style={{ aspectRatio: "323/216" }}>
            <img src={assets.headerImage} alt="이벤트 배너" className="absolute inset-0 h-full w-full object-contain" />
          </div>
        </a>

        <section className="bg-white flex flex-col items-center gap-[24px] px-[20px] pt-[17px] pb-[40px]">
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

        <section className="bg-white flex flex-col items-center gap-[20px] px-[20px] pt-[18px] pb-[29px]">
          <h2 className="text-[32px] font-medium tracking-[-0.64px] text-center" style={{ color: deepOlive }}>
            지민이벤트 이용하는 법
          </h2>
          <div className="flex flex-wrap justify-center gap-[20px] w-full">
            {howToIcons.map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-[15px] w-[140px]">
                <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "335/250" }}>
                  <img src={item.icon} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <p className="text-[18px] font-medium leading-[1.15] text-center text-black whitespace-pre-wrap">{item.title}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="w-full max-w-[375px] bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-[12px]">
            <p className="text-[20px] font-medium leading-[1.15]">Contact</p>
            <div className="flex flex-col gap-[2px] text-[20px] font-medium leading-[1.15]">
              <p>텔레그램</p>
              <p>지민공지채널</p>
              <p>씨씨사이트</p>
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
