import React, { useState } from "react";
import { motion } from "framer-motion";
import GamePageShell from "../components/game/GamePageShell";

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-[#282d1a] px-4 py-4 text-white md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d2fd9c]">
            <span className="text-xl font-bold text-[#394508]">J</span>
          </div>
          <h1 className="text-xl font-bold md:text-2xl">CC카지노 이벤트</h1>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <button className="hidden rounded-full bg-[#d2fd9c] px-3 py-2 text-[#394508] transition hover:bg-opacity-90 md:block">
            내 보상 확인하기
          </button>
          <button className="rounded-full border border-[#d2fd9c] bg-[#394508] px-4 py-2 text-white transition hover:bg-opacity-90">
            지금 시작하기
          </button>
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
            게임+팀배틀+금고로
            <br />
            매일 보상혜택 챙기세요
          </h2>
          <p className="mb-6 text-lg font-medium">
            플레이→결과확인→레벨보상으로 누적
          </p>
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508]">결과 즉시</span>
            <span className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508]">레벨 보상누적</span>
            <span className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508]">팀배틀</span>
          </div>
          <p className="mb-6 text-sm text-gray-300">처음이세요? '3분가이드'보고 바로 시작하세요.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-[#d2fd9c] px-6 py-3 text-base font-bold text-[#394508] transition hover:bg-opacity-90">
              지금 시작하기
            </button>
            <button className="rounded-full border border-white px-6 py-3 text-base font-bold text-white transition hover:bg-white hover:bg-opacity-10">
              3분 가이드 보기
            </button>
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
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">초보자 가이드</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">딱 3단계면 됩니다</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border-l-4 border-[#394508] bg-gray-50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl font-bold text-[rgb(104,255,132)]">
                1
              </div>
              <h3 className="text-xl font-bold text-[#282d1a]">티켓 확인</h3>
            </div>
            <p className="mb-4 text-gray-700">게임 플레이에 필요한 티켓을 확인하세요. 씨씨카지노를 이용하면 티켓이 발생됩니다.</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#394508]">TIP</span>: 각 게임화면에서 보유 티켓을 확인할 수 있어요.
              </p>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-[#394508] bg-gray-50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl font-bold text-[rgb(82,255,133)]">
                2
              </div>
              <h3 className="text-xl font-bold text-[#282d1a]">게임 플레이</h3>
            </div>
            <p className="mb-4 text-gray-700">버튼 한 번으로 바로 시작하고 결과는 즉시 확인할 수 있어요. 원하는 게임을 선택하세요.</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#394508]">TIP</span>:주사위는 레벨경험치만 쌓여요.
              </p>
            </div>
          </div>
          <div className="rounded-xl border-l-4 border-[#394508] bg-gray-50 p-6">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-black text-xl font-bold text-[rgb(82,255,133)]">
                3
              </div>
              <h3 className="text-xl font-bold text-[#282d1a]">보상 확인</h3>
            </div>
            <p className="mb-4 text-gray-700">게임 결과로 얻은 포인트가 레벨에 반영되고, 레벨별 특별 보상을 받을 수 있어요.</p>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm text-gray-600">
                <span className="font-bold text-[#394508]">TIP</span>: 레벨에서 누적 레벨포인트와 보상레벨을 확인하세요.
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
};

const GameCard: React.FC<GameCardProps> = ({ title, description, beginnerTip, icon, color }) => {
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
      <button className="w-full rounded-lg bg-[rgb(38,103,44)] py-3 text-center font-bold text-white transition hover:bg-opacity-90">
        플레이하기
      </button>
    </motion.div>
  );
};

const GamesSection: React.FC = () => {
  const games: GameCardProps[] = [
    {
      title: "룰렛",
      description: "룰렛돌려 랜덤보상을 즉시획득",
      beginnerTip: "매일 보상이 바뀝니다",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="white">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      ),
      color: "bg-[#394508]",
    },
    {
      title: "주사위 배틀",
      description: "주사위 결과로 승/무/패 결정, 승리시 추가 20xp보상",
      beginnerTip: "팀배틀 전에 사용, 경험치 쌓는 용도.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="white">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
      color: "bg-[#282d1a]",
    },
    {
      title: "복권",
      description: "긁거나 뽑아서 매일 달라지는 당첨상품/보상포인트 확인",
      beginnerTip: "당첨 결과는 즉시 공개",
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
    },
  ];

  return (
    <section id="games" className="bg-gray-50 px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">게임 소개</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">씨씨지민 코드만 가능한 보상</h2>
          <p className="mt-2 mx-auto max-w-2xl text-gray-600">티켓만 있으면 바로 플레이 가능한 게임들로 포인트를 모으세요.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.title} {...game} />
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-[#d2fd9c] bg-[#f3f7eb] p-6 shadow-sm">
          <h3 className="mb-3 text-lg font-bold text-[#394508]">티켓이 없으면 어떻게 하나요?</h3>
          <p className="mb-4 text-gray-800">씨씨사이트에서 서비스를 이용하면 티켓을 획득할 수 있습니다.</p>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-[#394508] px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90 focus:ring-2 focus:ring-[#394508] focus:ring-offset-2">
              티켓 안내 보기
            </button>
            <button className="rounded-full border border-[#394508] px-4 py-2 text-sm font-bold text-[#394508] transition hover:border-[#d2fd9c] hover:bg-[#d2fd9c] hover:text-[#394508] focus:ring-2 focus:ring-[#d2fd9c] focus:ring-offset-2">
              운영자에게 문의하기
            </button>
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
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">새로운 시스템</span>
          <h2 className="mt-1 mb-4 text-2xl font-bold text-[#282d1a] md:text-3xl">팀 배틀전</h2>
          <p className="mb-6 text-gray-700">우리 팀이 이길수록 보상이 커집니다. 내 플레이가 팀 점수에 기여돼요.</p>
          <ul className="mb-6 space-y-3">
            {[
              "내가 플레이하면 팀 점수가 오릅니다.",
              "상대 팀과 점수 차가 벌어지면 알림/배너로 알려줍니다.",
              "시즌제 랭킹 초기화, 최대 5명까지 한 팀 가능",
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
            <button className="rounded-full bg-[#394508] px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90">
              팀배틀 보러가기
            </button>
            <button className="rounded-full border border-[#394508] px-4 py-2 text-sm font-bold text-[#394508] transition hover:bg-[#394508] hover:bg-opacity-5">
              현재 순위 새로고침
            </button>
          </div>
        </div>
        <div className="flex w-full justify-center md:w-1/2">
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#394508] text-xl font-bold text-white md:h-28 md:w-28">A팀</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#5d5d5d] text-xl font-bold text-white md:h-28 md:w-28">B팀</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-xl font-bold text-white md:h-28 md:w-28">C팀</div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#394508] text-xl font-bold text-[#394508] md:h-28 md:w-28">D팀</div>
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
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">추가 동기부여</span>
          <h2 className="mt-1 mb-4 text-2xl font-bold text-[#282d1a] md:text-3xl">내 금고</h2>
          <p className="mb-6 text-gray-700">씨씨카지노 이용시 해금됩니다.</p>
          <div className="mb-6 space-y-4">
            {[
              "플레이와 이벤트 참여로 금고머니가 누적됩니다.",
              "금고 화면에서 누적 상태를 한눈에 확인할 수 있어요.",
              "해금조건이 필요한 경우, 안내에 따라 진행.",
            ].map((text) => (
              <div key={text} className="rounded-lg bg-white p-4 shadow-sm">
                <p className="text-gray-700">
                  <span className="font-bold text-[#394508]">✓</span> {text}
                </p>
              </div>
            ))}
          </div>
          <button className="rounded-full bg-[#282d1a] px-6 py-3 text-lg font-bold text-white transition hover:bg-opacity-90">예시 내금고 확인</button>
        </div>
        <div className="flex w-full justify-center md:w-1/2">
          <div className="relative w-full max-w-sm">
            <div className="rounded-2xl border border-[#d2fd9c] bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#282d1a]">내 금고머니</h3>
                <div className="rounded-full bg-[#d2fd9c] px-3 py-1 text-sm font-bold text-[#394508] shadow">Lv.5</div>
              </div>
              <div className="mb-6 rounded-xl bg-[#f3f7eb] p-4">
                <div className="mb-1 text-sm text-[#394508]">총 보유머니</div>
                <div className="text-3xl font-bold text-[#282d1a]">12,500원</div>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-[#f3f7eb] p-3">
                  <div className="mb-1 text-xs text-[#394508]">이번 주 적립</div>
                  <div className="text-xl font-bold text-[#282d1a]">2,340원</div>
                </div>
                <div className="rounded-xl bg-[#f3f7eb] p-3">
                  <div className="mb-1 text-xs text-[#394508]">다음 레벨까지</div>
                  <div className="text-xl font-bold text-[#282d1a]">4,500원</div>
                </div>
              </div>
              <button className="w-full rounded-xl bg-[#394508] py-3 text-center font-bold text-white transition hover:bg-opacity-90 focus:ring-2 focus:ring-[#394508] focus:ring-offset-2">
                씨씨로 전환하기
              </button>
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
          <span className="text-sm font-bold uppercase tracking-wider text-[#d2fd9c]">보상 시스템</span>
          <h2 className="mt-1 text-2xl font-bold md:text-3xl">포인트는 이렇게 쌓입니다</h2>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {["씨씨카지노이용", "포인트 적립", "레벨상승 & 보상"].map((title, index) => (
            <div key={title} className="rounded-xl bg-[rgb(0,0,0)] bg-opacity-10 p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d2fd9c] text-2xl font-bold text-[#394508]">
                {index + 1}
              </div>
              <h3 className="mb-2 text-xl font-bold">{title}</h3>
              <p className="text-gray-300">
                {index === 0 && "씨씨카지노를 이용하면 이용 금액에 따라 자동으로 포인트가 적립됩니다."}
                {index === 1 && "이벤트 시스템에서 레벨포인트가 적립되며, 게임 플레이로 추가 레벨포인트를 획득할 수 있습니다."}
                {index === 2 && "쌓인 레벨포인트는 레벨(시즌패스) 진행에 사용되며, 레벨이 오르면 특별 보상을 받을 수 있습니다."}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white bg-opacity-10 p-6 md:p-8">
          <h3 className="mb-6 text-xl font-bold">자주 묻는 레벨포인트 질문</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-[rgb(5,39,16)] bg-opacity-10 p-4">
              <h4 className="mb-2 font-bold text-[#d2fd9c]">레벨포인트란?</h4>
              <p className="text-sm text-gray-300">레벨 진행도에 반영되는 값입니다. 게임 플레이와 씨씨사이트 이용으로 쌓입니다.</p>
            </div>
            <div className="rounded-lg bg-[rgb(5,39,16)] bg-opacity-10 p-4">
              <h4 className="mb-2 font-bold text-[#d2fd9c]">레벨 보상이란?</h4>
              <p className="text-sm text-gray-300">레벨 달성 시 받을 수 있는 특별 혜택입니다. 레벨이 높을수록 더 좋은 보상을 받습니다.</p>
            </div>
            <div className="rounded-lg bg-[rgb(5,39,16)] bg-opacity-10 p-4">
              <h4 className="mb-2 font-bold text-[#d2fd9c]">팀배틀 점수란?</h4>
              <p className="text-sm text-gray-300">레벨포인트 기반으로 산정되는 팀 경쟁용 점수입니다. 내 활동이 팀 전체의 순위에 기여합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const QuickGuideSection: React.FC = () => {
  return (
    <section className="bg-white px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">빠른 시작</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">3분 따라하기</h2>
          <p className="mt-2 mx-auto max-w-2xl text-gray-600">처음 오신 분들을 위한 단계별 가이드입니다. 순서대로 따라 하시면 됩니다.</p>
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
          <button className="rounded-full bg-[#394508] px-8 py-3 text-lg font-bold text-white transition hover:bg-opacity-90">
            지금 시작하기
          </button>
        </div>
      </div>
    </section>
  );
};

const StepContent: React.FC<{ step: number }> = ({ step }) => {
  const data = {
    1: {
      title: "로그인 후 티켓 확인",
      desc: "각 게임은 티켓이 필요할 수 있어요. 화면 상단/게임 정보에서 잔여 티켓을 확인하세요.",
      tip: "티켓이 없을 경우, 씨씨카지노 이용 시 자동으로 티켓이 지급됩니다.",
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
      title: "게임 1판 플레이",
      desc: "버튼 한 번이면 바로 시작됩니다. 결과는 즉시 표시돼요.",
      tip: "룰렛, 주사위, 복권 중 아무 게임이나 선택하세요.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      ),
    },
    3: {
      title: "결과 확인 후 '다시 하기'로 빠르게 반복",
      desc: "결과를 봤다면 같은 자리에서 바로 '다시 하기'로 다음 판을 진행하세요.",
      tip: "빠르게 플레이할수록 더 많은 레벨포인트를 모을 수 있습니다.",
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
      title: "레벨포인트/레벨 보상 확인",
      desc: "플레이로 쌓인 레벨포인트가 레벨 진행에 반영되고, 레벨 보상을 받을 수 있어요.",
      tip: "레벨에서 레벨포인트와 레벨을 확인하세요.",
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
      title: "팀배틀 참여 & 누적 상태 확인",
      desc: "팀배틀에 참여하고 내 금고에서 누적 상태를 한눈에 확인하세요.",
      tip: "우리 팀이 지고 있다면 지금 참여로 반전을 만들수 있습니다.",
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
      question: "적립된 레벨포인트는 어떻게 확인하나요?",
      answer: "레벨버튼에서 적립된 레벨포인트와 남은 보상을 확인할 수 있습니다. 레벨별 적립률과 다음 레벨까지 필요한 포인트도 확인 가능합니다.",
    },
    {
      question: "팀 배틀전은 어떻게 참여하나요?",
      answer: "팀 배틀전 메뉴에서 미스터리 팀배정에 참여할 수 있습니다. 최대 5명까지 한 팀으로 참여 가능하며, 주간 랭킹에 따라 팀원 모두에게 보상이 지급됩니다.",
    },
    {
      question: "금고머니는 어떻게 전환하나요?",
      answer: "내금고 서비스에서 금고 머니 전환 및 출금 신청을 할 수 있습니다. 최소 전환 가능 머니는 10,000P이며, 신청 후 1일 내에 처리됩니다.",
    },
  ];

  return (
    <section className="bg-[rgb(210,210,210)] px-4 py-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-[#394508]">도움말</span>
          <h2 className="mt-1 text-2xl font-bold text-[#282d1a] md:text-3xl">자주 묻는 질문</h2>
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
    <GamePageShell title="홈페이지 가이드" subtitle="3분 만에 시작하는 온보딩">
      <div className="flex flex-col gap-12 text-gray-800">
        <Header />
        <IntroSection />
        <CoreActionSection />
        <GamesSection />
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
