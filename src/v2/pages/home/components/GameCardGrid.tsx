// src/v2/pages/home/components/GameCardGrid.tsx
// 게임 카드 그리드 (2열 x 3행)
import { GameCard } from "./GameCard";
import type { ComponentProps } from "react";

import rouletteMain from "../../../assets/svg/2.svg";
import rouletteFixed from "../../../assets/svg/3.svg";
import rouletteEffect from "../../../assets/svg/4.svg";
import diceMain from "../../../assets/svg/5.svg";
import diceFixed from "../../../assets/svg/6.svg";
import diceEffect from "../../../assets/svg/7.svg";
import lotteryMain from "../../../assets/svg/8.svg";
import lotteryFixed from "../../../assets/svg/9.svg";
import lotteryEffect from "../../../assets/svg/10.svg";

// 게임 데이터
const GAMES: ComponentProps<typeof GameCard>[] = [
  {
    id: "roulette",
    title: "룰렛경품",
    icon: "🎰",
    gradientClass: "bg-transparent",
    badge: "HOT",
    badgeClass: "bg-[#C41E3A]",
    href: "/v2/game/roulette",
    layers: {
      main: rouletteMain,
      fixed: rouletteFixed,
      effect: rouletteEffect,
      effectMotion: "fixed",
    },
    bgMain: rouletteEffect,
    bgAccent: diceEffect,
  },
  {
    id: "dice",
    title: "주사위게임",
    icon: "🎲",
    gradientClass: "bg-transparent",
    href: "/v2/game/dice",
    layers: {
      main: diceMain,
      fixed: diceFixed,
      effect: diceEffect,
      effectMotion: "fixed",
    },
    bgMain: diceEffect,
    bgAccent: lotteryEffect,
  },
  {
    id: "lottery",
    title: "복권",
    icon: "🎟️",
    gradientClass: "bg-transparent",
    href: "/v2/game/lottery",
    layers: {
      main: lotteryMain,
      fixed: lotteryFixed,
      effect: lotteryEffect,
      effectMotion: "fixed",
    },
    bgMain: lotteryEffect,
    bgAccent: rouletteEffect,
  },
  {
    id: "team-battle",
    title: "팀배틀",
    icon: "🤝",
    gradientClass: "bg-transparent",
    badge: "NEW",
    badgeClass: "bg-[#22C55E]",
    href: "/v2/team-battle",
    layers: {
      main: lotteryMain,
      fixed: "/assets/11.svg",
      effect: "/assets/12.svg",
      effectMotion: "floatX",
    },
  },
];

export function GameCardGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {GAMES.map((game) => (
        <GameCard key={game.id} {...game} />
      ))}
    </div>
  );
}
