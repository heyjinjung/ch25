import React, { useState } from "react";
import { Ticket, History } from "lucide-react";
import GameTokenGrantPage from "./GameTokenGrantPage";
import GameTokenLogsPage from "./GameTokenLogsPage";

const TicketManagerPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"grant" | "logs">("grant");

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#91F402]">티켓 통합 관리</h2>
                    <p className="text-sm text-gray-400">
                        사용자에게 티켓/코인을 지급하거나, 사용 내역을 조회하고 회수할 수 있습니다.
                    </p>
                </div>
            </header>

            <div className="border-b border-[#333333]">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("grant")}
                        className={`
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === "grant"
                                ? "border-[#91F402] text-[#91F402]"
                                : "border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300"
                            }
            `}
                    >
                        <Ticket
                            className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === "grant" ? "text-[#91F402]" : "text-gray-400 group-hover:text-gray-300"
                                }`}
                            aria-hidden="true"
                        />
                        <span>티켓 지급 (Grant)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`
              group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === "logs"
                                ? "border-[#91F402] text-[#91F402]"
                                : "border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300"
                            }
            `}
                    >
                        <History
                            className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === "logs" ? "text-[#91F402]" : "text-gray-400 group-hover:text-gray-300"
                                }`}
                            aria-hidden="true"
                        />
                        <span>로그 및 회수 (Logs & Revoke)</span>
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === "grant" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <GameTokenGrantPage />
                    </div>
                )}
                {activeTab === "logs" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <GameTokenLogsPage />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketManagerPage;
