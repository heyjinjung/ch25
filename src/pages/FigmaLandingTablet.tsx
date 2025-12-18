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

const Sidebar: React.FC = () => {
  return (
    <header className="w-full max-w-[827px] bg-black flex flex-col gap-[30px] px-[20px] py-[20px] text-white lg:px-[40px] lg:gap-[50px]">
      <nav className="flex flex-wrap items-center justify-between gap-4 w-full">
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

      <div className="flex flex-col gap-5 w-full">
        <h1 className="text-[32px] lg:text-[42px] font-medium leading-[1.06] tracking-[-0.84px]">
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
        <div className="grid w-full gap-[10px] grid-cols-1 sm:grid-cols-3">
          {gameTiles.map((tile) => (
            <button
              key={tile.title}
              className="flex-1 h-[120px] rounded-[4px] bg-[#d2fd9c] px-[10px] py-[20px] flex flex-col items-center gap-[14px]"
            >
              <div className="relative h-[30px] w-[30px]">
                <img src={tile.icon} alt={tile.title} className="absolute inset-0 h-full w-full object-contain" />
              </div>
              <p className="text-[18px] lg:text-[20px] font-medium leading-[1.15] text-black text-center">{tile.title}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-[18px] items-center justify-center w-full text-[18px] lg:text-[20px] font-medium" style={{ color: baseAccent }}>
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
  <a
    href="https://ccc-010.com"
    className="bg-white flex flex-col items-center pt-[30px] pb-0 px-[20px] w-full lg:px-[40px] lg:pt-[50px]"
  >
    <div className="relative w-full max-w-[740px] overflow-hidden rounded-[20px]" style={{ aspectRatio: "740/392" }}>
      <img src={assets.headerImage} alt="이벤트 배너" className="absolute inset-0 h-full w-full object-contain" />
    </div>
  </a>
);

const OngoingEvents: React.FC = () => (
  <section className="bg-white flex flex-col items-center gap-[30px] w-full px-[20px] pt-[27px] pb-[10px] lg:px-[40px]">
    <h2 className="text-[32px] lg:text-[42px] font-medium tracking-[-0.84px]" style={{ color: deepOlive }}>
      진행중인 이벤트
    </h2>
    <div className="flex w-full flex-col gap-[20px] md:flex-row md:flex-wrap md:justify-center">
      {[1, 2].map((key) => (
        <a key={key} href="https://figma.com/sites" className="flex w-full md:w-[350px] flex-col gap-[19px]">
          <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "285/221" }}>
            <img src={assets.benefitImage} alt="Benefit" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <p className="text-[18px] lg:text-[20px] font-medium leading-[1.15] text-left" style={{ color: deepOlive }}>
            매일 터지는 룰렛 경품추첨
          </p>
        </a>
      ))}
    </div>
  </section>
);

const HowToUse: React.FC = () => (
  <section className="bg-white flex flex-col items-center gap-[30px] w-full px-[20px] pt-[40px] pb-[20px] lg:px-[40px] lg:pt-[48px]">
    <h2 className="text-[32px] lg:text-[42px] font-medium tracking-[-0.84px] text-center" style={{ color: deepOlive }}>
      지민이벤트 이용하는 법
    </h2>
    <div className="grid w-full gap-[20px] sm:grid-cols-2 lg:grid-cols-4 lg:gap-[40px]">
      {howToIcons.map((item) => (
        <div key={item.title} className="flex flex-col items-center gap-[15px]">
          <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "150/115.75" }}>
            <img src={item.icon} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <p className="text-[18px] lg:text-[20px] font-medium leading-[1.15] text-center text-black">{item.title}</p>
        </div>
      ))}
    </div>
  </section>
);

const BentoGrid: React.FC = () => (
  <section className="bg-white flex flex-col items-center justify-center gap-[30px] w-full px-[20px] pt-[40px] pb-[30px] lg:px-[40px] lg:pt-[50px]">
    <div className="text-center w-full max-w-[500px]">
      <h2 className="text-[32px] lg:text-[42px] font-medium tracking-[-0.84px]" style={{ color: deepOlive }}>
        지민이와 함께하는 씨씨카지노
      </h2>
    </div>
    <div className="flex flex-col gap-[20px] items-center w-full">
      <div className="grid w-full max-w-[900px] gap-[20px] sm:grid-cols-2">
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
                <p className="text-[72px] lg:text-[90px] leading-[1.04] tracking-[-3.6px]">{item.title}</p>
              )}
              <p className="text-[16px] leading-[1.09]">
                {item.description || item.title}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid w-full max-w-[900px] gap-[20px] sm:grid-cols-2">
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
  <footer className="w-full max-w-[800px] bg-[#394508] px-[20px] py-[31px] text-[#d2fd9c] lg:px-[40px]">
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
    <div className="min-h-screen bg-black flex flex-col items-center gap-8 px-[20px] py-[20px] lg:px-[32px] lg:py-[32px]">
      <Sidebar />
      <main className="w-full flex flex-col items-center">
        <Events />
        <OngoingEvents />
        <HowToUse />
        <BentoGrid />
        <Footer />
      </main>
    </div>
  );
};
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
