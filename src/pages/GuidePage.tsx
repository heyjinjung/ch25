import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import GamePageShell from "../components/game/GamePageShell";

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-[#282d1a] px-4 py-4 text-white md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d2fd9c]">
            <span className="text-xl font-bold text-[#394508]">J</span>
          </div>
          <h1 className="text-xl font-bold md:text-2xl">CC카�????�벤??/h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <Link
            to="/season-pass"
            className="hidden rounded-full bg-[#d2fd9c] px-3 py-2 text-[#394508] transition hover:bg-opacity-90 md:block"
          >
            ??보상 ?�인?�기
          </Link>
          <Link
            to="/landing"
            className="rounded-full border border-[#d2fd9c] bg-[#394508] px-4 py-2 text-white transition hover:bg-opacity-90"
          >
            지�??�작?�기
          </Link>
        </div>
      </div>
    </header>
  );
};

const IntroSection: React.FC = () => {
  return (
    <section className="bg-[rgb(23,27,3)] px-4 py-12 text-white md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center md:flex-row">
        <div className="mb-10 w-full md:mb-0 md:w-3/5 md:pr-10">
          <h2 className="mb-4 text-2xl font-bold leading-tight md:text-3xl lg:text-4xl">
            ?�씨???�금(충전)?�고
            <br />
            ???�에??보상 받으?�요
          </h2>
          <p className="mb-6 text-lg font-medium">
            1) ?�씨 충전(?�금) ??2) ?�켓/?�벨 ?�성 ??3) 게임/미션 ??4) 금고/보상 ?�인
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508]">결과 즉시</span>
            <span className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508]">?�금 기반 ?�적</span>
            <span className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508]">1�??�라?�기</span>
          </div>
          <p className="mb-6 text-sm text-gray-300">처음?�세?? 1분이�??�입?�다.</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/landing"
              className="rounded-full bg-[#d2fd9c] px-6 py-3 text-base font-bold text-[#394508] transition hover:bg-opacity-90"
            >
              지�??�작?�기
            </Link>
            <a
              href="#quick-guide"
              className="rounded-full border border-white px-6 py-3 text-base font-bold text-white transition hover:bg-white hover:bg-opacity-10"
            >
              1�?가?�드
            </a>
          </div>
        </div>
        <div className="flex w-full justify-center md:w-2/5">
          <div className="relative">
            <div className="flex h-64 w-64 items-center justify-center rounded-full bg-[#d2fd9c] md:h-72 md:w-72">
              <div className="flex h-48 w-48 items-center justify-center rounded-full bg-[#282d1a] md:h-56 md:w-56">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#5d5d5d] md:h-40 md:w-40">
                  <div className="h-16 w-16 rounded-full bg-black md:h-20 md:w-20" />
                </div>
              </div>
            </div>
            <motion.div
              className="absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-[#394508] shadow-lg"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              +
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CoreActionSection: React.FC = () => {
  return (
    <section className="bg-white px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-8 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">초보??가?�드</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">?�렇�??�면 ?�니??/h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border-l-4 border-[#394508] bg-gray-50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl font-bold text-[rgb(104,255,132)]">
                1
              </div>
              <h3 className="text-xl font-bold text-[#282d1a]">?�씨 ?�용 ?�역 ?�동(?�택)</h3>
            </div>
            <p className="mb-4 text-gray-700">
              ?�씨?�서 ?�용??기록???�으�? ?�의 ?�적/?�벨/?�켓 반영?????�확?�집?�다. 처음?�는 체험 ?�켓?�로??바로 ?�작?????�어??
            </p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#394508]">TIP</span>: 금고 ?�면???�는 ?�씨?�카지??충전?�기??버튼???�용?�면 ?�합?�다.
              </p>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-[#394508] bg-gray-50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl font-bold text-[rgb(82,255,133)]">
                2
              </div>
              <h3 className="text-xl font-bold text-[#282d1a]">?�켓 ?�인/체험</h3>
            </div>
            <p className="mb-4 text-gray-700">?�켓???�어??게임???�니?? ?�켓??0?�이�?체험 ?�켓(TRIAL_TOKEN)?�로 먼�? 맛볼 ???�어??</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#394508]">TIP</span>: ?�켓 0?�면 ?�체???�켓 3??받기???�내가 ?????�어??
              </p>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-[#394508] bg-gray-50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl font-bold text-[rgb(82,255,133)]">
                3
              </div>
              <h3 className="text-xl font-bold text-[#282d1a]">게임/미션 ??보상</h3>
            </div>
            <p className="mb-4 text-gray-700">게임/미션???�면 ?�이?��? ?�이�? ?�점?�서 교환권을 ?�서 ?�벤?�리?�서 ?�용?�면 ?�켓/?��? 만들 ???�어??</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#394508]">TIP</span>: ?�벨/금고?�서 ?�오???�적??반영?�는지???�인?�보?�요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type GameCardProps = {
  title: string;
  description: string;
  beginnerTip: string;
  icon: React.ReactNode;
  color: string;
  to: string;
};

const GameCard: React.FC<GameCardProps> = ({ title, description, beginnerTip, icon, color, to }) => {
  return (
    <motion.div
      className="flex h-full flex-col rounded-xl bg-white p-6 shadow-lg"
      whileHover={{ y: -5, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.3 }}
    >
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${color}`}>{icon}</div>
      <h3 className="mb-2 text-xl font-bold text-[#282d1a]">{title}</h3>
      <p className="mb-4 text-gray-600">{description}</p>
      <div className="mb-4 flex-grow rounded-lg bg-gray-50 p-3">
        <p className="text-sm text-gray-600">
          <span className="font-bold text-[#394508]">초보 TIP</span>: {beginnerTip}
        </p>
      </div>
      <Link
        to={to}
        className="w-full rounded-lg bg-[rgb(38,103,44)] py-3 text-center font-bold text-white transition hover:bg-opacity-90"
      >
        ?�레?�하�?
      </Link>
    </motion.div>
  );
};

const GamesSection: React.FC = () => {
  const games: GameCardProps[] = [
    {
      title: "룰렛",
      description: "?�리�?보상 받기. 보상?� 룰렛 ?�정�?기�??�로 지�?,
      beginnerTip: "보상?� 룰렛 ?�정�?기�??�로 ?�인",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="white">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      ),
      color: "bg-[#394508]",
      to: "/roulette",
    },
    {
      title: "주사??배�?",
      description: "?��? 결과???�라 보상 지�??�정�?+ 골든?�워 조건 반영)",
      beginnerTip: "보상?� ?�정�?골든?�워 기�??�로 반영",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="white">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
      color: "bg-[#282d1a]",
      to: "/dice",
    },
    {
      title: "복권",
      description: "긁거??뽑아??매일 ?�라지???�첨?�품/보상?�인???�인",
      beginnerTip: "?�첨 결과??즉시 공개",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="white">
          <path
            fillRule="evenodd"
            d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
      color: "bg-[#5d5d5d]",
      to: "/lottery",
    },
  ];

  return (
    <section id="games" className="bg-gray-50 px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">게임 ?�개</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">?�씨지�?코드�?가?�한 보상</h2>
          <p className="mt-2 mx-auto max-w-2xl text-gray-600">?�켓�??�으�?바로 ?�레??가?�한 게임?�로 ?�인?��? 모으?�요.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.title} {...game} />
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-[#d2fd9c] bg-[#f3f7eb] p-6 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-[#394508]">?�켓???�으�??�떻�??�나??</h3>
          <p className="mb-4 text-gray-800">
            ?�씨?�서 ?�용??기록???�으�??�적/?�벨/?�켓 반영?????�정?�입?�다. ?�켓??0?�이?�면 체험 ?�켓?�로 먼�? ?�작???�도 ?�어??
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#point-system"
              className="rounded-full bg-[#394508] px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90 focus:ring-2 focus:ring-[#394508] focus:ring-offset-2"
            >
              ?�동/?�켓 ?�름 보기
            </a>
            <a
              href="https://t.me/jm956"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[#394508] px-4 py-2 text-sm font-bold text-[#394508] transition hover:border-[#d2fd9c] hover:bg-[#d2fd9c] hover:text-[#394508] focus:ring-2 focus:ring-[#d2fd9c] focus:ring-offset-2"
            >
              ?�영?�에�?문의?�기
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const NewFeaturesSection: React.FC = () => {
  return (
    <section id="new-features" className="bg-white px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">??기능</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">?�아?�면 좋�? 것들</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* ?�일�?미션 */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">?�일�?미션</h3>
            <p className="text-gray-600">매일 주어지??미션. ?�료?�면 ?�이?�몬??보상.</p>
            <p className="mt-2 text-sm font-bold text-emerald-600">??매일 체크?�세??/p>
          </div>

          {/* ?�벤?�리 */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">?�벤?�리</h3>
            <p className="text-gray-600">?�이??교환�?바우�?/?��? ?�인?�는 보�???</p>
            <p className="mt-2 text-sm font-bold text-blue-600">???�단 ?�켓버튼?�서 ?�인</p>
          </div>

          {/* ?�점/교환�?*/}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.6 8h13.2L17 13M7 13h10M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">?�점 / 교환�?/h3>
            <p className="text-gray-600">?�이?�로 교환권을 구매 ???�벤?�리?�서 ?�용?�면 ?�켓/?��? 지급돼??</p>
            <p className="mt-2 text-sm font-bold text-indigo-600">???�이??모아??교환</p>
          </div>

          {/* 체험 ?�켓 */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">체험 ?�켓</h3>
            <p className="text-gray-600">?�켓??0?�일 ??TRIAL_TOKEN 3?�을 받아 [체험] ??��???�이?��? 모을 ???�어??</p>
            <p className="mt-2 text-sm font-bold text-teal-600">??맛보�??�습??/p>
          </div>

          {/* 골드???�이?�키 */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">골드??/ ?�이?�키</h3>
            <p className="text-gray-600">?�별 보상 ?????�용. ?�벨 보상?�로 ?�득.</p>
            <p className="mt-2 text-sm font-bold text-yellow-600">???�벨 ?�리�?받음</p>
          </div>

          {/* ?�레그램 ?�용 */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 1 0 24 12.056A12.014 12.014 0 0 0 11.944 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635Z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">?�레그램 ?�용</h3>
            <p className="text-gray-600">?�동 로그?? ?�림 받기. 빠른 ?�속.</p>
            <p className="mt-2 text-sm font-bold text-sky-600">???�레그램?�로�??�속</p>
          </div>

          {/* 메시지 보�???*/}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#282d1a]">메시지 보�???/h3>
            <p className="text-gray-600">?�영??공�?, 보상 ?�림 ?�인.</p>
            <p className="mt-2 text-sm font-bold text-purple-600">???�단 메뉴?�서 ?�인</p>
          </div>

          {/* 금고 차감 규칙 */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="mb-2 text-lg font-bold text-red-700">주의: 금고 차감</h3>
            <p className="text-gray-600">룰렛/주사??보상?� ?�정�?기�??�로 금고??반영?�니??</p>
            <p className="mt-2 text-sm font-bold text-red-600">??보상?� �?게임 ?�정�?기�??�로 ?�인</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const TeamBattleSection: React.FC = () => {
  return (
    <section id="team-battle" className="bg-white px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center md:flex-row">
        <div className="mb-10 w-full md:mb-0 md:w-1/2 md:pr-10">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">?�로???�스??/span>
          <h2 className="mt-1 mb-4 text-2xl font-bold text-[#282d1a] md:text-3xl">?� 배�???/h2>
          <p className="mb-6 text-gray-700">?�리 ?�???�길?�록 보상??커집?�다. ???�레?��? ?� ?�수??기여?�요.</p>
          <ul className="mb-6 space-y-3">
            {[
              "?��? ?�레?�하�??� ?�수가 ?�릅?�다.",
              "?��? ?��??�수 차�? 벌어지�??�림/배너�??�려줍니??",
              "?�즌????�� 초기?? 최�? 5명까지 ???� 가??,
            ].map((text) => (
              <li key={text} className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5 text-[#394508]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">{text}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/team-battle"
              className="rounded-full bg-[#394508] px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90"
            >
              ?�배�? 보러가�?
            </Link>
            <Link
              to="/team-battle"
              className="rounded-full border border-[#394508] px-4 py-2 text-sm font-bold text-[#394508] transition hover:bg-[#394508] hover:bg-opacity-5"
            >
              ?�재 ?�위 ?�로고침
            </Link>
          </div>
        </div>
        <div className="flex w-full justify-center md:w-1/2">
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#394508] text-xl font-bold text-white md:h-28 md:w-28">A?�</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#5d5d5d] text-xl font-bold text-white md:h-28 md:w-28">B?�</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-xl font-bold text-white md:h-28 md:w-28">C?�</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#394508] text-xl font-bold text-[#394508] md:h-28 md:w-28">D?�</div>
            </div>
            <motion.div
              className="absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d2fd9c] text-xl font-bold text-[#394508] shadow-lg"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              VS
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MyVaultSection: React.FC = () => {
  return (
    <section id="my-vault" className="bg-gray-50 px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center md:flex-row-reverse">
        <div className="mb-10 w-full md:mb-0 md:w-1/2 md:pl-10">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">추�? ?�기부??/span>
          <h2 className="mt-1 mb-4 text-2xl font-bold text-[#282d1a] md:text-3xl">??금고</h2>
          <p className="mb-6 text-gray-700">?�씨?�서 ?�용??기록???�으�??�적?????�확??반영?????�어?? 금고?�서 ?�태�??�인?�고, ?�요?�면 ?�씨�??�동?????�어??</p>
          <div className="mb-6 space-y-4">
            {[
              "?�씨 ?�용 ?�역 ?�동(?�택) ???????�적/?�벨 반영",
              "게임 결과???�라 금고가 변?�될 ???�음",
              "금고?�서 ?�씨?�카지??충전?�기?�로 ?�동 가??,
            ].map((text) => (
              <div key={text} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-gray-700">
                  <span className="font-bold text-[#394508]">??/span> {text}
                </p>
              </div>
            ))}
          </div>
          <Link to="/vault" className="rounded-full bg-[#282d1a] px-6 py-3 text-lg font-bold text-white transition hover:bg-opacity-90">
            ??금고/충전 ?�내 보기
          </Link>
        </div>
        <div className="flex w-full justify-center md:w-1/2">
          <div className="relative w-full max-w-sm">
            <div className="rounded-2xl border border-[#d2fd9c] bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#282d1a]">??금고머니</h3>
                <div className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508] shadow">Lv.5</div>
              </div>
              <div className="mb-6 rounded-xl bg-[#f3f7eb] p-4">
                <div className="mb-1 text-sm text-[#394508]">�?보유머니</div>
                <div className="text-3xl font-bold text-[#282d1a]">12,500??/div>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#f3f7eb] p-3">
                  <div className="mb-1 text-xs text-[#394508]">?�번 �??�립</div>
                  <div className="text-xl font-bold text-[#282d1a]">2,340??/div>
                </div>
                <div className="rounded-xl bg-[#f3f7eb] p-3">
                  <div className="mb-1 text-xs text-[#394508]">?�음 ?�벨까�?</div>
                  <div className="text-xl font-bold text-[#282d1a]">4,500??/div>
                </div>
              </div>
              <a
                href="https://ccc-010.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-[#394508] py-3 text-center font-bold text-white transition hover:bg-opacity-90 focus:ring-2 focus:ring-[#394508] focus:ring-offset-2"
              >
                ?�씨카�???충전?�기
              </a>
            </div>
            <motion.div
              className="absolute -bottom-4 -right-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#d2fd9c] text-3xl font-bold text-[#394508] shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              P
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const PointSystemSection: React.FC = () => {
  return (
    <section id="point-system" className="bg-[#282d1a] px-4 py-12 text-white md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#d2fd9c]">보상 ?�스??/span>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">?�인?�는 ?�렇�??�입?�다</h2>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {["?�씨 ?�용 ?�역 ?�동", "?�켓/?�벨 반영", "게임/미션 & 보상"].map((title, index) => (
            <div key={title} className="rounded-xl bg-[rgb(0,0,0)] bg-opacity-10 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d2fd9c] text-2xl font-bold text-[#394508]">
                {index + 1}
              </div>
              <h3 className="mb-2 text-xl font-bold">{title}</h3>
              <p className="text-gray-300">
                {index === 0 && "?�씨?�서 ?�용??기록???�으�????�의 ?�적/?�벨 반영?????�확?�집?�다."}
                {index === 1 && "?�적/?�벨??반영?�면 ?�켓/보상 ?�름?????�게 ?�해?�고 ?�라�????�어??"}
                {index === 2 && "게임/미션?�로 ?�이?��? 모아 ?�점/?�벤?�리?�서 교환권을 ?�용?�고, ?�벨/금고�??�인?�세??"}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white bg-opacity-10 p-6 md:p-8">
          <h3 className="mb-6 text-xl font-bold">?�주 묻는 ?�벨?�인??질문</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-[rgb(5,39,16)] bg-opacity-10 p-4">
              <h4 className="mb-2 font-bold text-[#d2fd9c]">?�벨?�인?��??</h4>
              <p className="text-sm text-gray-300">?�벨 진행?�에 반영?�는 값입?�다. 게임 ?�레?��?(?�요 ?? ?�씨?�이???�용 기록???�라 반영?????�어??</p>
            </div>
            <div className="rounded-lg bg-[rgb(5,39,16)] bg-opacity-10 p-4">
              <h4 className="mb-2 font-bold text-[#d2fd9c]">?�벨 보상?��??</h4>
              <p className="text-sm text-gray-300">?�벨 ?�성 ??받을 ???�는 ?�별 ?�택?�니?? ?�벨???�을?�록 ??좋�? 보상??받습?�다.</p>
            </div>
            <div className="rounded-lg bg-[rgb(5,39,16)] bg-opacity-10 p-4">
              <h4 className="mb-2 font-bold text-[#d2fd9c]">?�배�? ?�수?�?</h4>
              <p className="text-sm text-gray-300">?�벨?�인??기반?�로 ?�정?�는 ?� 경쟁???�수?�니?? ???�동???� ?�체???�위??기여?�니??</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const QuickGuideSection: React.FC = () => {
  return (
    <section id="quick-guide" className="bg-white px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">빠른 ?�작</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">1�??�라?�기</h2>
          <p className="mt-2 mx-auto max-w-2xl text-gray-600">?�서?��??�르�??�니??</p>
        </div>

        <div className="mx-auto max-w-3xl">
          <ol className="relative border-l border-[#d2fd9c]">
            {[1, 2, 3, 4, 5].map((step) => (
              <li key={step} className={step === 5 ? "ml-6" : "mb-10 ml-6"}>
                <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#394508] ring-4 ring-white">
                  <span className="font-bold text-white">{step}</span>
                </span>
                <StepContent step={step} />
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/landing"
            className="rounded-full bg-[#394508] px-8 py-3 text-lg font-bold text-white transition hover:bg-opacity-90"
          >
            지�??�작?�기
          </Link>
        </div>
      </div>
    </section>
  );
};

const StepContent: React.FC<{ step: number }> = ({ step }) => {
  const data = {
    1: {
      title: "?�씨카�????�용(?�택)",
      desc: "?�씨?�서 ?�용??기록???�으�??�적/?�벨/?�켓 반영?????�정?�입?�다. ?�만 ?�수???�니�? 처음?�는 체험 ?�켓?�로???�작?????�어??",
      tip: "금고 ?�이지?�서 ?�씨?�카지??충전?�기?��? ?�르�??�동?????�어??",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    2: {
      title: "?�켓 ?�인(?�으�?체험 ?�켓)",
      desc: "게임?�는 ?�켓???�요?�니?? ?�켓??0?�이�?체험 ?�켓(TRIAL_TOKEN)?�로 먼�? ?�작?????�어??",
      tip: "?�켓 0?�면 ?�체???�켓 3??받기???�내가 ?????�어??",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      ),
    },
    3: {
      title: "체험(?�는 ?�반) 게임 1???�레??,
      desc: "버튼 ??번이�?바로 ?�작?�니?? 결과??즉시 ?�시?�요.",
      tip: "체험?� 룰렛??[체험] ??��??TRIAL_TOKEN?�로 ?�레?�할 ???�어??",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    4: {
      title: "미션 ???�이?????�점 ??교환�?,
      desc: "미션???�면 ?�이?��? ?�습?�다. ?�이?�로 ?�점?�서 교환권을 ?�고, ?�벤?�리?�서 ?�용?�면 ?�켓/?��? ?�겨??",
      tip: "?�이??미션) ??교환�??�점) ???�용(?�벤?�리) ?�서�?기억?�세??",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    5: {
      title: "?�벨/금고?�서 ?�적 ?�인",
      desc: "?�벨�?금고?�서 ?�늘 ?�적????반영?�는지 ?�인?�세??",
      tip: "?�적???�상?�면 ?�영?�에�??�면 캡처�?문의??주세??",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
    },
  } as const;

  const current = data[step as keyof typeof data];
  if (!current) return null;

  return (
    <div>
      <h3 className="mb-2 text-lg font-bold text-[#282d1a]">{current.title}</h3>
      <p className="mb-3 text-gray-600">{current.desc}</p>
      <div className="flex items-center rounded-lg bg-[rgb(210,210,210)] p-3">
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#d2fd9c] text-[#394508]">
          {current.icon}
        </div>
        <span className="text-sm text-gray-700">{current.tip}</span>
      </div>
    </div>
  );
};

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    {
      question: "?�씨 ?�동(?�용 기록 반영)?� ?�디???�나??",
      answer: "금고 ?�이지?�서 ?�씨?�카지??충전?�기??버튼???�르�??�씨 ?�이?�로 ?�동?????�습?�다. ?�용 ???�시 ???�으�??�아?�면 반영?????�어??",
    },
    {
      question: "?�립???�벨?�인?�는 ?�떻�??�인?�나??",
      answer: "?�벨버튼?�서 ?�립???�벨?�인?��? ?��? 보상???�인?????�습?�다. ?�벨�??�립률과 ?�음 ?�벨까�? ?�요???�인?�도 ?�인 가?�합?�다.",
    },
    {
      question: "?�켓??0?�인??게임??�??�요.",
      answer: "?�켓??0?�이�??�체???�켓(TRIAL_TOKEN)?�을 받을 ???�는 ?�내가 ?????�습?�다. 체험 ?�켓?�로 [체험] ??�� 먼�? ?�레?�하�? 미션/?�점/?�벤?�리�??�어가 보세??",
    },
    {
      question: "?� 배�??��? ?�떻�?참여?�나??",
      answer: "?� 배�???메뉴?�서 미스?�리 ?�배정??참여?????�습?�다. 최�? 5명까지 ???�?�로 참여 가?�하�? 주간 ??��???�라 ?�??모두?�게 보상??지급됩?�다.",
    },
    {
      question: "금고머니???�떻�??�환?�나??",
      answer: "?�금�??�비?�에??금고 머니 ?�환 �?출금 ?�청???????�습?�다. 최소 ?�환 가??머니??10,000P?�며, ?�청 ??1???�에 처리?�니??",
    },
  ];

  return (
    <section className="bg-[rgb(210,210,210)] px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">?��?�?/span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">?�주 묻는 질문</h2>
        </div>
        {faqs.map((faq, index) => (
          <div key={faq.question} className="mb-4 overflow-hidden rounded-lg border border-gray-100 bg-white">
            <button
              className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <span className="font-bold">{faq.question}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 transition-transform ${openIndex === index ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {openIndex === index && (
              <div className="border-t border-gray-100 bg-white p-4 text-gray-600">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const GuidePage: React.FC = () => {
  return (
    <GamePageShell title="?�씨지�?가?�드" subtitle="1분만???�작">
      <div className="flex flex-col gap-12 text-gray-800">
        <Header />
        <IntroSection />
        <CoreActionSection />
        <GamesSection />
        <NewFeaturesSection />
        <TeamBattleSection />
        <MyVaultSection />
        <PointSystemSection />
        <QuickGuideSection />
        <FAQSection />
      </div>
    </GamePageShell>
  );
};

export default GuidePage;
