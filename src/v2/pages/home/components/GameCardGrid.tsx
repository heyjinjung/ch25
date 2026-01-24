// src/pages/home/components/GameCardGrid.tsx
// Í≤åÏûÑ Ïπ¥Îìú Í∑∏Î¶¨??(2??x 3??
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
import teamBattleFixed from "../../../assets/svg/11.svg";
import teamBattleMain from "../../../assets/svg/12.svg";

// Í≤åÏûÑ ?∞Ïù¥??
const GAMES: ComponentProps<typeof GameCard>[] = [
  {
    id: "roulette",
    title: "Î£∞Î†õÍ≤ΩÌíà",
    icon: "?é∞",
    gradientClass: "bg-transparent",
    href: "/game/roulette",
    layers: {
      main: rouletteMain,
      fixed: rouletteFixed,
      effect: rouletteEffect,
      mainMotion: "none",
      effectMotion: "expand",
    },
  },
  {
    id: "dice",
    title: "Ï£ºÏÇ¨?ÑÍ≤å??,
    icon: "?é≤",
    gradientClass: "bg-transparent",
    href: "/game/dice",
    layers: {
      main: diceMain,
      fixed: diceFixed,
      effect: diceEffect,
      mainMotion: "none",
      effectMotion: "floatX",
    },
  },
  {
    id: "lottery",
    title: "Î≥µÍ∂å",
    icon: "?éüÔ∏?,
    gradientClass: "bg-transparent",
    badge: "HOT",
    badgeClass: "bg-[#C41E3A]",
    badgePosition: "top-right",
    href: "/game/lottery",
    layers: {
      main: lotteryMain,
      fixed: lotteryFixed,
      effect: lotteryEffect,
      mainMotion: "bounce",
      effectMotion: "sparkle",
    },
  },
  {
    id: "team-battle",
    title: "?ÄÎ∞∞Ì?",
    icon: "?§ù",
    gradientClass: "bg-transparent",
    badge: "NEW",
    badgeClass: "bg-[#22C55E]",
    href: "/team-battle",
    layers: {
      main: teamBattleMain,
      fixed: teamBattleFixed,
      fixedScale: 1.3,
      mainMotion: "floatX",
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
