import React from "react";
import { VaultDashboardMetrics } from "../components/vault/VaultDashboardMetrics";
import { VaultRequestManager } from "../components/vault/VaultRequestManager";
import { VaultTopEarners } from "../components/vault/VaultTopEarners";
import { VaultControlPanel } from "../components/vault/VaultControlPanel";

const VaultAdminPage: React.FC = () => {
    // Global refresh key to trigger data re-fetching in all sub-components
    const [refreshKey, setRefreshKey] = React.useState(0);

    const triggerRefresh = () => {
        setRefreshKey(prev => prev + 1);
        console.log("Global Vault Refresh Triggered:", refreshKey + 1);
    };

    const handleGoldenHourToggle = (enabled: boolean) => {
        // This callback is triggered by the Metrics component
        console.log("Golden Hour Toggled:", enabled);
        triggerRefresh(); // Refresh metrics and status
    };

    return (
        <div className="admin-page-container space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
                        금고 ?�산 관�?<span className="text-admin-brand/40">Vault</span>
                    </h1>
                </div>
            </header>

            {/* Row 1: Metrics Ticker */}
            <section className="-mx-1">
                <VaultDashboardMetrics
                    key={`metrics-${refreshKey}`}
                    onGoldenHourToggle={handleGoldenHourToggle}
                />
            </section>

            {/* Row 2: Main Operations Grid */}
            <section className="grid grid-cols-12 gap-6 h-[600px]">
                {/* Left: Request Manager (Main) */}
                <div className="col-span-12 lg:col-span-8 flex flex-col h-full">
                    <div className="flex-1 bg-admin-card border border-admin-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-5 py-3 border-b border-admin-border/50 flex items-center justify-between bg-zinc-900/50">
                            <h2 className="text-lg font-bold text-white">출금 ?�청 처리</h2>
                            <span className="text-xs text-zinc-500">?�시�??�청 ?�기열</span>
                        </div>
                        <div className="flex-1 overflow-hidden p-0">
                            <VaultRequestManager refreshKey={refreshKey} />
                        </div>
                    </div>
                </div>

                {/* Right: Monitoring & Risk */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
                    {/* Top Earners */}
                    <div className="flex-1 bg-admin-card border border-admin-border/50 rounded-xl overflow-hidden flex flex-col">
                        <div className="px-5 py-3 border-b border-admin-border/50 flex items-center justify-between bg-zinc-900/50">
                            <h2 className="text-lg font-bold text-white">?�산 리스??모니?�링</h2>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-0">
                            <VaultTopEarners refreshKey={refreshKey} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Row 3: Settings & Logs */}
            <section className="pt-2">
                <div className="bg-admin-card border border-admin-border/50 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-admin-border/50 bg-zinc-900/50">
                        <h2 className="text-lg font-bold text-white">?�정 �?로그</h2>
                    </div>
                    <div className="p-0">
                        <VaultControlPanel onBalanceUpdate={triggerRefresh} />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default VaultAdminPage;
