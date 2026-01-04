import React from 'react';

interface Props {
    missionPercent: number;
    vaultPayoutRatio: number | null;
    totalVaultPaid: number;
    totalDeposit: number;
}

export const SettlementCard: React.FC<Props> = ({ missionPercent, vaultPayoutRatio, totalVaultPaid, totalDeposit }) => {
    const ratio = vaultPayoutRatio ?? 0;
    const isDeficit = ratio > 30.0;

    return (
        <div className={`p-6 rounded-lg border ${isDeficit ? 'border-red-500/50' : 'border-blue-500/50'} bg-[#111111] shadow-sm`}>
            <h3 className="text-gray-400 text-sm font-medium">Vault Payout Ratio (Yesterday)</h3>
            <div className="flex items-baseline space-x-2 mt-1">
                <span className={`text-3xl font-bold ${isDeficit ? 'text-red-400' : 'text-blue-400'}`}>
                    {vaultPayoutRatio !== null ? `${vaultPayoutRatio.toFixed(1)}%` : "N/A"}
                </span>
                <span className="text-xs text-gray-500">Target: &lt; 30%</span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
                <div
                    className={`h-2 rounded-full ${isDeficit ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-500">Paid (Locked)</p>
                    <p className="font-bold text-gray-200">{totalVaultPaid.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500">Deposit (Est)</p>
                    <p className="font-bold text-gray-200">{totalDeposit.toLocaleString()}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-xs text-gray-400">Mission Completion Avg</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-semibold text-gray-200">{missionPercent.toFixed(1)}%</span>
                    {missionPercent < 30 && (
                        <span className="text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-800">
                            Too Hard (&lt;30%)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
