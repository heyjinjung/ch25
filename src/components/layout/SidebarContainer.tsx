import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authStore";
import svgPaths from "../../assets/figma/svgPaths";

const logoSrc = "/assets/figma/star-dynamic-premium.png"; // put the exported PNG here (public/assets/figma)

const hasAnyPath = (keys: Array<keyof typeof svgPaths>): boolean => keys.some((key) => Boolean(svgPaths[key]));

const FallbackRect: React.FC<{ rx?: number }> = ({ rx = 4 }) => (
  <rect width="100%" height="100%" rx={rx} fill="currentColor" opacity="0.18" />
);

function Layer() {
  const keys: Array<keyof typeof svgPaths> = ["p1db78780"];
  const hasPath = hasAnyPath(keys);

  return (
    <div className="absolute inset-[0_19.33%_2.67%_16.67%]" aria-hidden>
      <svg className="block h-full w-full text-black" viewBox="0 0 20 30" fill="none" preserveAspectRatio="none">
        {hasPath ? <path d={svgPaths.p1db78780} fill="currentColor" /> : <FallbackRect rx={2} />}
      </svg>
    </div>
  );
}

function Layer1() {
  const keys: Array<keyof typeof svgPaths> = [
    "p33172f00",
    "p31561700",
    "p22775c00",
    "pf251480",
    "p9026500",
    "p3d114000",
    "p217cb180",
    "p3a6b3b00",
    "p2d27b100",
  ];
  const hasPath = hasAnyPath(keys);

  return (
    <div className="absolute left-[-0.4px] top-[-0.47px] h-[30px] w-[30px]" aria-hidden>
      <svg className="block h-full w-full text-[#394508]" viewBox="0 0 30 30" fill="none" preserveAspectRatio="none">
        {hasPath ? (
          keys.map((key) => {
            const d = svgPaths[key];
            return d ? <path key={key} d={d} fill="currentColor" fillRule="evenodd" clipRule="evenodd" /> : null;
          })
        ) : (
          <FallbackRect rx={4} />
        )}
      </svg>
    </div>
  );
}

function Layer2() {
  const keys: Array<keyof typeof svgPaths> = ["p1acbfd00", "pb2b9000"];
  const hasPath = hasAnyPath(keys);

  return (
    <div className="absolute left-[2px] top-px h-[28.81px] w-[23.93px]" aria-hidden>
      <svg className="block h-full w-full text-[#394508]" viewBox="0 0 24 29" fill="none" preserveAspectRatio="none">
        {hasPath ? (
          keys.map((key) => {
            const d = svgPaths[key];
            return d ? <path key={key} d={d} fill="currentColor" /> : null;
          })
        ) : (
          <FallbackRect rx={3} />
        )}
      </svg>
    </div>
  );
}

const Logo: React.FC = () => (
  <div className="flex w-[184px] shrink-0 items-center gap-5" aria-label="Company logo">
    <div className="relative h-[27px] w-[26px] overflow-hidden rounded-2xl bg-[#d2fd9c]">
      <img
        src={logoSrc}
        alt="CC Casino mark"
        className="absolute inset-0 h-full w-full rounded-2xl object-cover"
        loading="lazy"
      />
    </div>
    <p className="shrink-0 text-[16px] font-semibold tracking-[-0.32px] text-white">CC CASINO</p>
  </div>
);

const Nav: React.FC = () => {
  const { user } = useAuth();

  return (
    <nav className="flex w-full items-start justify-between" aria-label="Site navigation">
      <Logo />
      <div className="flex items-center gap-2">
        {user ? (
          <div className="max-w-[220px] rounded-full border border-white/15 bg-white/5 px-3 py-[6px] text-[12px] leading-none text-white/85">
            <span className="max-w-[140px] truncate align-middle">{user.nickname || user.external_id}</span>{" "}
            <span className="align-middle font-semibold text-black" style={{ color: "#d2fd9c" }}>
              Lv.{user.level ?? 1}
            </span>
          </div>
        ) : null}
        <a
          href="https://ccc-010.com"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-sm bg-[#d2fd9c] px-[14px] py-[11px] text-[10px] font-normal tracking-[-0.2px] text-black"
        >
          CC카지노
        </a>
      </div>
    </nav>
  );
};

const Header: React.FC = () => (
  <div className="flex flex-col gap-5">
    <h1 className="w-[412px] text-[42px] font-medium leading-tight tracking-[-0.84px] text-white">
      지민코드 전용
      <br />
      <span className="text-[#d2fd9c]">포인트서비스</span>
    </h1>
    <h2 className="text-[16px] font-normal leading-[1.1] text-[#cbcbcb]">No personal cre핵심 캐치문구</h2>
  </div>
);

type ModuleButtonProps = {
  title: string;
  icon: React.ReactNode;
};

const ModuleButton: React.FC<ModuleButtonProps> = ({ title, icon }) => (
  <div className="flex h-[120px] flex-1 items-center justify-center rounded bg-[#d2fd9c] transition hover:translate-y-[-2px] hover:shadow-lg">
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-[10px] py-5 text-black">
      <div className="relative h-[30px] w-[30px]">{icon}</div>
      <p className="text-[20px] font-medium leading-[1.15] text-center">{title}</p>
    </div>
  </div>
);

const Modules: React.FC = () => (
  <div className="flex w-full flex-col gap-4">
    <h3 className="text-[20px] font-medium text-[#d2fd9c]">게임 바로가기</h3>
    <div className="flex w-full flex-col gap-3 sm:flex-row">
      <Link to="/roulette" className="flex-1">
        <ModuleButton title="룰렛 경품뽑기" icon={<Layer />} />
      </Link>
      <Link to="/dice" className="flex-1">
        <ModuleButton title="레벨 주사위" icon={<Layer1 />} />
      </Link>
      <Link to="/lottery" className="flex-1">
        <ModuleButton title="랜덤 복권" icon={<Layer2 />} />
      </Link>
    </div>
  </div>
);

const ContactLinks: React.FC = () => (
  <div className="flex w-full flex-wrap items-center gap-4 text-[20px] font-medium text-[#d2fd9c]">
    <a href="https://ccc-010.com" target="_blank" rel="noreferrer">CC카지노</a>
    <Link to="/season-pass">레벨</Link>
    <Link to="/team-battle">팀배틀</Link>
    <Link to="/landing">내금고</Link>
  </div>
);

const SidebarContainer: React.FC = () => (
  <header className="flex h-full w-full flex-col gap-12 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-6 text-white shadow-lg shadow-emerald-900/40 backdrop-blur">
    <Nav />
    <Header />
    <Modules />
    <ContactLinks />
  </header>
);

export default SidebarContainer;
