import React from "react";

// Tablet-specific assets (stored under public/assets/figma)
const assets = {
  starDynamicPremium: "/assets/figma/star-dynamic-premium-tablet.png",
  headerImage: "/assets/figma/header-banner-tablet.png",
  benefitImage: "/assets/figma/benefit-card-tablet.png",
  iconWallet: "/assets/figma/icon-wallet-tablet.png",
  iconSecurity: "/assets/figma/icon-security-tablet.png",
  iconGraph: "/assets/figma/icon-graph-tablet.png",
  iconPeople: "/assets/figma/icon-people-tablet.png",
  iconRoulette: "/assets/figma/icon-roulette-tablet.png",
  iconLevel: "/assets/figma/icon-level-tablet.png",
  iconLottery: "/assets/figma/icon-lottery-tablet.png",
  vectorBar: "/assets/figma/vector-bar-tablet.png",
  vectorStreamline: "/assets/figma/vector-streamline-tablet.png",
  img130: "/assets/figma/label-130-tablet.png",
};

const navLinks = [
  { label: "CC카지노", href: "https://figma.com/sites" },
  { label: "레벨", href: "https://figma.com/sites" },
  { label: "팀배틀", href: "https://figma.com/sites" },
  { label: "내금고", href: "https://figma.com/sites" },
];

const gameTiles = [
  { title: "레벨 주사위", icon: assets.iconLevel },
  { title: "랜덤 복권", icon: assets.iconLottery },
  { title: "룰렛 경품뽑기", icon: assets.iconRoulette },
];

const howToIcons = [
  { title: "씨씨이용하기", icon: assets.iconWallet },
  { title: "금고서비스", icon: assets.iconSecurity },
  { title: "포인트게임하기", icon: assets.iconGraph },
  { title: "친구초대", icon: assets.iconPeople },
];

const bento = [
  {
    title: "2x",
    description: "어디와도 비교불가한 포인트서비스",
    icon: null,
  },
  {
    title: "Efficiency Increase Per Transfer",
    description: "",
    icon: assets.vectorBar,
  },
  {
    title: "안전하고 빠른 환전",
    icon: assets.vectorStreamline,
  },
  {
    title: "고객만족도 1위",
    icon: assets.img130,
  },
];

const baseAccent = "#d2fd9c";
const deepOlive = "#394508";

const Sidebar: React.FC = () => {
  return (
    <header className="w-[827px] bg-black flex flex-col gap-[50px] px-[40px] py-[20px] text-white">
      <nav className="flex items-start justify-between w-full">
        <div className="flex items-center gap-5 w-[184px]" aria-label="Company logo">
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

      <div className="flex flex-col gap-5 w-full">
        <h1 className="w-[412px] text-[42px] font-medium leading-[1.06] tracking-[-0.84px]">
          지민코드 전용
          <br />
          포인트서비스
        </h1>
        <h2 className="text-[16px] font-normal leading-[1.09] text-[#cbcbcb]">No personal cre핵심 캐치문구</h2>
      </div>

      <div className="flex flex-col gap-5 w-full">
        <h3 className="text-[20px] font-medium" style={{ color: baseAccent }}>
          게임 바로가기
        </h3>
        <div className="flex w-full gap-[10px]">
          {gameTiles.map((tile) => (
            <button key={tile.title} className="flex-1 h-[120px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px] flex flex-col items-center gap-[14px]">
              <div className="relative h-[30px] w-[30px]">
                <img src={tile.icon} alt={tile.title} className="absolute inset-0 h-full w-full object-contain" />
              </div>
              <p className="text-[20px] font-medium leading-[1.15] text-black text-center">{tile.title}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-[30px] items-center justify-center w-full text-[20px] font-medium" style={{ color: baseAccent }}>
        {navLinks.map((item) => (
          <a key={item.label} href={item.href} className="leading-[1.15]">
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
};

const Events: React.FC = () => (
  <a href="https://ccc-010.com" className="bg-white flex flex-col items-center pt-[50px] pb-0 px-[40px] h-[431px] w-full">
    <div className="relative h-[392px] w-[740px] overflow-hidden rounded-[20px]">
      <img src={assets.headerImage} alt="이벤트 배너" className="absolute inset-0 h-full w-full object-contain" />
    </div>
  </a>
);

const OngoingEvents: React.FC = () => (
  <section className="bg-white flex flex-col items-center gap-[30px] w-full px-[40px] pt-[27px] pb-0">
    <h2 className="text-[42px] font-medium tracking-[-0.84px]" style={{ color: deepOlive }}>
      진행중인 이벤트
    </h2>
    <div className="flex w-full gap-[20px]">
      {[1, 2].map((key) => (
        <a key={key} href="https://figma.com/sites" className="flex w-[350px] flex-col gap-[19px]">
          <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "285/221" }}>
            <img src={assets.benefitImage} alt="Benefit" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <p className="text-[20px] font-medium leading-[1.15] text-left" style={{ color: deepOlive }}>
            매일 터지는 룰렛 경품추첨
          </p>
        </a>
      ))}
    </div>
  </section>
);

const HowToUse: React.FC = () => (
  <section className="bg-white flex flex-col items-center gap-[30px] w-full px-[40px] pt-[48px] pb-0 h-[313px]">
    <h2 className="text-[42px] font-medium tracking-[-0.84px] text-center" style={{ color: deepOlive }}>
      지민이벤트 이용하는 법
    </h2>
    <div className="flex w-full gap-[40px] items-center pb-[8px]">
      {howToIcons.map((item) => (
        <div key={item.title} className="flex flex-1 flex-col items-center gap-[15px]">
          <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "150/115.75" }}>
            <img src={item.icon} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <p className="text-[20px] font-medium leading-[1.15] text-center text-black">{item.title}</p>
        </div>
      ))}
    </div>
  </section>
);

const BentoGrid: React.FC = () => (
  <section className="bg-white flex flex-col items-center justify-center gap-[37px] w-full h-[615px] px-[40px] pt-[37px] pb-0">
    <div className="text-center w-[437px]">
      <h2 className="text-[42px] font-medium tracking-[-0.84px]" style={{ color: deepOlive }}>
        지민이와 함께하는 씨씨카지노
      </h2>
    </div>
    <div className="flex flex-col gap-[20px] items-center w-full">
      <div className="flex gap-[20px] w-full justify-center">
        {bento.slice(0, 2).map((item) => (
          <div
            key={item.title}
            className="flex flex-1 flex-col items-center justify-end rounded-[10.667px] px-[20.267px] py-[30px]"
            style={{ backgroundColor: baseAccent, minHeight: 221.867 }}
          >
            <div className="flex flex-col items-center gap-[30px] text-center text-[#394508] w-full">
              {item.icon ? (
                <div className="relative" style={{ height: 98.459, width: 142.264 }}>
                  <img src={item.icon} alt={item.title} className="h-full w-full object-contain" />
                </div>
              ) : (
                <p className="text-[90px] leading-[1.04] tracking-[-3.6px]">{item.title}</p>
              )}
              <p className="text-[16px] leading-[1.09]">
                {item.description || item.title}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-[20px] w-full justify-center">
        {bento.slice(2).map((item) => (
          <div
            key={item.title}
            className="flex flex-1 flex-col items-center justify-end rounded-[10.667px] px-[20.267px] py-[30px]"
            style={{ backgroundColor: baseAccent, minHeight: 222 }}
          >
            <div className="flex flex-col items-center gap-[30px] text-center text-[#394508] w-full">
              {item.icon && (
                <div className="relative" style={{ height: item.title === "고객만족도 1위" ? 67.5 : 112, width: item.title === "고객만족도 1위" ? 199.281 : 124.31 }}>
                  <img src={item.icon} alt={item.title} className="h-full w-full object-contain" />
                </div>
              )}
              <p className="text-[16px] leading-[1.09]">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="w-[800px] bg-[#394508] px-[40px] py-[31px] text-[#d2fd9c]">
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
);

const FigmaLandingTablet: React.FC = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <Sidebar />
      <main className="w-full flex flex-col">
        <Events />
        <OngoingEvents />
        <HowToUse />
        <BentoGrid />
        <Footer />
      </main>
    </div>
  );
};

export default FigmaLandingTablet;
