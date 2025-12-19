import React from "react";

// Local asset paths (place files under public/assets/figma/)
const assets = {
  starDynamicPremium: "/assets/figma/star-dynamic-premium.png",
  headerImage: "/assets/figma/header-banner.png",
  benefitImage: "/assets/figma/benefit-card.png",
  iconWallet: "/assets/figma/icon-wallet.png",
  iconSecurity: "/assets/figma/icon-security.png",
  iconGraph: "/assets/figma/icon-graph.png",
  iconPeople: "/assets/figma/icon-people.png",
  iconRoulette: "/assets/figma/icon-roulette.png",
  iconLevel: "/assets/figma/icon-level.png",
  iconLottery: "/assets/figma/icon-lottery.png",
  vectorBar: "/assets/figma/vector-bar.png",
  vectorStreamline: "/assets/figma/vector-streamline.png",
  img130: "/assets/figma/label-130.png",
  rouletteSvg: "/images/layer-1.svg", // lightning mark
  levelSvg: "/images/layer-2.svg", // globe line icon
  lotterySvg: "/images/layer-3.svg", // shield check
  bentoEfficiency: "/images/vector111.svg",
  bentoFastExchange: "/images/vector112.svg",
  bentoCustomerSat: "/images/unnamed113.svg",
};

const howToIcons: { title: string; icon: string; href?: string }[] = [
  { title: "씨씨이용하기", icon: assets.iconWallet, href: "https://ccc-010.com" },
  { title: "금고서비스", icon: assets.iconSecurity },
  { title: "포인트게임하기", icon: assets.iconGraph },
  { title: "친구초대", icon: assets.iconPeople },
];

const bento = [
  {
    title: "2x",
    description: "어디와도 비교불가한 포인트서비스",
    highlight: true,
    icon: null,
  },
  {
    title: "Efficiency Increase Per Transfer",
    description: "",
    icon: assets.bentoEfficiency,
    fallback: assets.vectorBar,
  },
  {
    title: "안전하고 빠른 환전",
    icon: assets.bentoFastExchange,
    fallback: assets.vectorStreamline,
  },
  {
    title: "고객만족도 1위",
    icon: assets.bentoCustomerSat,
    fallback: assets.img130,
  },
];

const baseAccent = "#d2fd9c";
const deepOlive = "#394508";

const Events: React.FC = () => (
  <section className="bg-white flex flex-col items-center px-[40px] py-[20px] w-full">
    <a
      href="https://ccc-010.com"
      className="relative block w-full max-w-[624px] overflow-hidden rounded-[20px]"
      style={{ aspectRatio: "624/348" }}
    >
      <img src={assets.headerImage} alt="이벤트 배너" className="absolute inset-0 h-full w-full object-contain" />
    </a>
  </section>
);

const OngoingEvents: React.FC = () => (
  <section className="bg-white flex flex-col items-center gap-[30px] w-full px-[40px] py-[20px]">
    <h2 className="text-[32px] lg:text-[42px] font-medium tracking-[-0.84px]" style={{ color: "#394508" }}>
      진행중인 이벤트
    </h2>
    <div className="flex w-full flex-col gap-[20px] md:flex-row md:flex-wrap md:justify-center">
      {[1, 2].map((key) => (
        <a
          key={key}
          href="https://figma.com/sites"
          className="flex w-full md:w-[330px] flex-col gap-[19px]"
        >
          <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "285/221.8667" }}>
            <img src={assets.benefitImage} alt="Benefit" className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <p className="text-[18px] lg:text-[20px] font-medium leading-[1.15] text-left" style={{ color: deepOlive }}>
            {key === 1 ? "매일 터지는 룰렛 경품추첨" : "크리스마스 경품이벤트"}
          </p>
        </a>
      ))}
    </div>
  </section>
);

const HowToUse: React.FC = () => (
  <section className="bg-white flex flex-col items-center gap-[30px] w-full px-[20px] pt-[20px] pb-[20px] lg:px-[40px]">
    <h2 className="text-[32px] lg:text-[42px] font-medium tracking-[-0.84px] text-center" style={{ color: deepOlive }}>
      지민이벤트 이용하는 법
    </h2>
    <div className="grid w-full gap-[20px] sm:grid-cols-2 lg:grid-cols-4 lg:gap-[40px]">
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
                  className: "flex flex-col items-center gap-[15px] hover:opacity-90",
                }
              : { className: "flex flex-col items-center gap-[15px]" })}
          >
            <div className="relative w-full overflow-hidden rounded-[10px]" style={{ aspectRatio: "140.75/115.75" }}>
              <img src={item.icon} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
            </div>
            <p className="text-[18px] lg:text-[20px] font-medium leading-[1.15] text-center text-black">{item.title}</p>
          </Wrapper>
        );
      })}
    </div>
  </section>
);

const BentoGrid: React.FC = () => (
  <section className="bg-white flex flex-col items-center justify-center gap-[30px] w-full px-[20px] py-[20px] lg:px-[40px]">
    <div className="text-center">
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
                  <img
                    src={item.icon}
                    alt={item.title}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      if (!("fallback" in item) || !item.fallback) return;
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = item.fallback;
                    }}
                  />
                </div>
              ) : (
                <p className="text-[72px] lg:text-[90px] leading-[1.04] tracking-[-3.6px]">{item.title}</p>
              )}
              <p className="text-[16px] leading-[1.09]">{item.description || item.title}</p>
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
                  <img
                    src={item.icon}
                    alt={item.title}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      if (!("fallback" in item) || !item.fallback) return;
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = item.fallback;
                    }}
                  />
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

const FigmaLanding: React.FC = () => {
  return (
    <main className="w-full min-w-0">
      <div className="mx-auto w-full max-w-[980px]">
        <Events />
        <OngoingEvents />
        <HowToUse />
        <BentoGrid />
      </div>
    </main>
  );
};

export default FigmaLanding;
