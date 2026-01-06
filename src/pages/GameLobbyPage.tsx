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
    badge?: string;
}

const GameCard: React.FC<GameCardProps> = ({ title, to, gradient, icon, isWide, bgImage, badge }) => {
    return (
        <Link
            to={to}
            className={clsx(
                "group relative overflow-hidden rounded-[24px] border border-white/10 p-4 transition-all",
                !bgImage && gradient,
                isWide ? "col-span-2 aspect-[2/1]" : "col-span-1 aspect-square"
            )}
        >
            {bgImage && (
                <div className="absolute inset-0 z-0">
                    <img src={bgImage} alt={title} className="h-full w-full object-cover opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                </div>
            )}

            <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex justify-between items-start">
                    {badge && (
                        <span className="absolute top-0 right-0 rounded-bl-xl bg-red-600 px-3 py-1 text-[10px] font-black text-white shadow-sm z-20">{badge}</span>
                    )}
                    {!bgImage && <span className="text-3xl">{icon}</span>}
                </div>

                <div className="mt-auto">
                    {/* Title removed per user request */}
                    <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white backdrop-blur border border-white/10">
                        지금 플레이
                    </div>
                </div>
            </div>
        </Link>
    );
};



const GameLobbyPage: React.FC = () => {
    // Scroll to top on mount to fix refresh issue
    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const games = [
        {
            title: "ROULETTE",
            to: "/roulette",
            gradient: "bg-gradient-to-br from-purple-600 to-indigo-600",
            icon: "🎯",
            bgImage: "/assets/games/thumb_roulette_v2.png",
            badge: "HOT"
        },
        {
            title: "DICE",
            to: "/dice",
            gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
            icon: "🎲",
            bgImage: "/assets/games/thumb_dice_v2.png",
        },
        {
            title: "LOTTERY",
            to: "/lottery",
            gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
            icon: "🎫",
            bgImage: "/assets/games/thumb_lottery_v2.png"
        },
        {
            title: "TEAM BATTLE",
            to: "/team-battle",
            gradient: "bg-gradient-to-br from-blue-600 to-cyan-600",
            icon: "⚔️",
            bgImage: "/assets/games/thumb_team_battle_v2.png",
            badge: "NEW"
        },

    ];

    return (
        <section className="space-y-6 pb-4">
            {/* Games Grid - 2 columns */}
            <div className="grid grid-cols-2 gap-3 px-1">
                {games.map((game) => (
                    <GameCard key={game.title} {...game} />
                ))}
            </div>
        </section>
    );
};

export default GameLobbyPage;
