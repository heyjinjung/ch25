import React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
// import FeatureGate from "../components/feature/FeatureGate";
import GamePageShell from "../components/game/GamePageShell";

interface GameCardProps {
    title: string;
    description: string;
    to: string;
    gradient: string;
    icon: string;
    isWide?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ title, description, to, gradient, icon, isWide }) => {
    return (
        <Link
            to={to}
            className={clsx(
                "group relative overflow-hidden rounded-3xl border border-white/10 p-5 transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
                gradient,
                isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"
            )}
        >
            {/* Background Decor */}
            <div className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                <span className="text-8xl font-black">{icon}</span>
            </div>

            <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                    <h3 className="text-xl font-black italic text-white drop-shadow-md">{title}</h3>
                    <p className="mt-1 text-xs font-medium text-white/80 line-clamp-2">{description}</p>
                </div>

                <div className="self-end rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white backdrop-blur">
                    PLAY NOW
                </div>
            </div>
        </Link>
    );
};

const GameLobbyPage: React.FC = () => {
    const games = [
        {
            title: "ROULETTE",
            description: "Spin to Win! Max 1,000,000 P",
            to: "/roulette",
            gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
            icon: "🎯",
        },
        {
            title: "DICE",
            description: "Double or Nothing",
            to: "/dice",
            gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
            icon: "🎲",
        },
        {
            title: "LOTTERY",
            description: "Scratch & Win",
            to: "/lottery",
            gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
            icon: "🎫",
        },
        {
            title: "TEAM BATTLE",
            description: "Red vs Blue",
            to: "/team-battle",
            gradient: "bg-gradient-to-br from-blue-600 to-cyan-600",
            icon: "⚔️",
        },
        {
            title: "THE VAULT",
            description: "Crack the Code. Huge Rewards.",
            to: "/vault",
            gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
            icon: "🔐",
            isWide: true,
        },
    ];

    return (
        <GamePageShell title="GAME LOBBY" subtitle="Choose Your Challenge">
            <div className="grid grid-cols-2 gap-4 pb-24">
                {games.map((game) => (
                    <GameCard key={game.title} {...game} />
                ))}
            </div>
        </GamePageShell>
    );
};

export default GameLobbyPage;
