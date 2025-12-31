import React from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

interface GameCardProps {
    title: string;
    to: string;
    gradient: string;
    icon: string;
    isWide?: boolean;
    bgImage?: string;
}

const GameCard: React.FC<GameCardProps> = ({ title, to, gradient, icon, isWide, bgImage }) => {
    return (
        <Link
            to={to}
            className={clsx(
                "group relative overflow-hidden rounded-3xl border border-white/10 p-5 transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]",
                !bgImage && gradient,
                isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"
            )}
        >
            {bgImage && (
                <div className="absolute inset-0 z-0">
                    <img src={bgImage} alt={title} className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
            )}

            {!bgImage && (
                <div className="absolute -right-4 -top-4 text-white/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                    <span className="text-8xl font-black">{icon}</span>
                </div>
            )}

            <div className="relative z-10 flex h-full flex-col justify-end">
                <div className="self-end rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white backdrop-blur border border-white/10 shadow-lg">
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
            to: "/roulette",
            gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
            icon: "🎯",
            bgImage: "/assets/games/thumb_roulette.png"
        },
        {
            title: "DICE",
            to: "/dice",
            gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
            icon: "🎲",
            bgImage: "/assets/games/thumb_dice.png"
        },
        {
            title: "LOTTERY",
            to: "/lottery",
            gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
            icon: "🎫",
            bgImage: "/assets/games/thumb_lottery.png"
        },
        {
            title: "TEAM BATTLE",
            to: "/team-battle",
            gradient: "bg-gradient-to-br from-blue-600 to-cyan-600",
            icon: "⚔️",
            bgImage: "/assets/games/thumb_team_battle.png"
        },
        {
            title: "THE VAULT",
            to: "/vault",
            gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
            icon: "🔐",
            isWide: true,
            bgImage: "/assets/games/thumb_my_vault.png"
        },
    ];

    return (
        <div className="space-y-4 pb-20">
            <div className="grid grid-cols-2 gap-4">
                {games.map((game) => (
                    <GameCard key={game.title} {...game} />
                ))}
            </div>
        </div>
    );
};

export default GameLobbyPage;
