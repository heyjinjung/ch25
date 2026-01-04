import React, { useState } from 'react';
import { nudgeRiskGroup } from '../../api/adminDashboardApi';
import { BadgeCheck } from 'lucide-react';

interface Props {
    riskCount: number;
    streakRiskCount: number;
}

export const RiskMonitorCard: React.FC<Props> = ({ riskCount, streakRiskCount }) => {
    const [loading, setLoading] = useState(false);
    const [nudged, setNudged] = useState<number | null>(null);

    const handleNudge = async () => {
        if (!confirm(`Send Nudge to ${streakRiskCount} at-risk users?`)) return;
        setLoading(true);
        try {
            const res = await nudgeRiskGroup();
            setNudged(res.nudged_count);
        } catch (e) {
            alert("Failed to send nudge");
        } finally {
            setLoading(false);
        }
    };

    const isRisk = streakRiskCount > 0;

    return (
        <div className={`p-6 rounded-lg border ${isRisk ? 'border-red-500/50 bg-red-950/10' : 'border-green-500/50 bg-green-950/10'} shadow-sm`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium">Streak Risk (Hot/Legend)</h3>
                    <p className={`text-3xl font-bold mt-1 ${isRisk ? 'text-red-400' : 'text-green-400'}`}>
                        {streakRiskCount}
                    </p>
                </div>
                {isRisk && (
                    <button
                        onClick={handleNudge}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Sending...' : 'Send Nudge'}
                    </button>
                )}
            </div>

            <p className="mt-4 text-sm text-gray-500">
                Total Retention Risk (Yesterday Active → Today Inactive): <span className="text-gray-300 font-medium">{riskCount}</span>
            </p>

            {nudged !== null && (
                <div className="mt-4 p-3 bg-teal-900/20 border border-teal-500/30 rounded flex items-center gap-2 text-teal-400 text-sm">
                    <BadgeCheck size={16} />
                    <span>Successfully notified {nudged} users via Telegram/Push.</span>
                </div>
            )}
        </div>
    );
};
