import React, { useState } from "react";
import { Settings, Layout, Wallet } from "lucide-react";
import VaultRulesEditor from "./VaultRulesEditor";
import VaultUiEditor from "./VaultUiEditor";
import { VaultBalanceAdjuster } from "./VaultBalanceAdjuster";

interface VaultControlPanelProps {
    onBalanceUpdate?: () => void;
}

export const VaultControlPanel: React.FC<VaultControlPanelProps> = ({ onBalanceUpdate }) => {
    const [activeTab, setActiveTab] = useState<"CONFIG" | "UI" | "BALANCE">("CONFIG");

    return (
        <div className="flex flex-col h-full">
            {/* Tabs Header */}
            <div className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900/30 px-2 pt-2">
                <button
                    onClick={() => setActiveTab("CONFIG")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-all border-x border-t ${activeTab === "CONFIG"
                        ? "bg-admin-bg border-zinc-800 text-admin-brand"
                        : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                >
                    <Settings className="h-3.5 w-3.5" />
                    규칙 설정 (Rules)
                </button>
                <button
                    onClick={() => setActiveTab("UI")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-all border-x border-t ${activeTab === "UI"
                        ? "bg-admin-bg border-zinc-800 text-purple-400"
                        : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                >
                    <Layout className="h-3.5 w-3.5" />
                    UI 설정 (Display)
                </button>
                <button
                    onClick={() => setActiveTab("BALANCE")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-all border-x border-t ${activeTab === "BALANCE"
                        ? "bg-admin-bg border-zinc-800 text-emerald-400"
                        : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                >
                    <Wallet className="h-3.5 w-3.5" />
                    잔액 강제 수정
                </button>
            </div>

            {/* Content Area */}
            <div className="p-0 min-h-[400px] bg-admin-bg">
                {activeTab === "CONFIG" && (
                    <div className="p-4">
                        <VaultRulesEditor />
                    </div>
                )}
                {activeTab === "UI" && (
                    <div className="p-4">
                        <VaultUiEditor />
                    </div>
                )}
                {activeTab === "BALANCE" && (
                    <div className="p-0">
                        <VaultBalanceAdjuster onUpdateSuccess={onBalanceUpdate} />
                    </div>
                )}

            </div>
        </div>
    );
};
