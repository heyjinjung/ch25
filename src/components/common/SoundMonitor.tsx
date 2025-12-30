import React, { useEffect, useState } from 'react';
import { useSoundContext } from '../../contexts/SoundContext';
import { Howler } from 'howler';

/**
 * Diagnostic component to monitor AudioContext state and Retry Queue.
 * Visible only in development mode.
 */
const SoundMonitor: React.FC = () => {
    const { isReady, isMuted, retryQueueCount, lastError } = useSoundContext();
    const [ctxState, setCtxState] = useState<string>(Howler.ctx?.state || 'unknown');

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;

        const interval = setInterval(() => {
            if (Howler.ctx) {
                setCtxState(Howler.ctx.state);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (process.env.NODE_ENV !== 'development') return null;

    return (
        <div className="fixed bottom-20 left-4 z-[9999] pointer-events-none">
            <div className="bg-black/80 border border-white/20 rounded-lg p-2 backdrop-blur-md shadow-xl flex flex-col gap-1 text-[10px] font-mono whitespace-nowrap">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">AudioCtx:</span>
                    <span className={ctxState === 'running' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}>
                        {ctxState.toUpperCase()}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Ready/Muted:</span>
                    <span className="text-white">
                        {isReady ? 'YES' : 'NO'} / {isMuted ? 'ON' : 'OFF'}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Retry Queue:</span>
                    <span className={retryQueueCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-600'}>
                        {retryQueueCount}
                    </span>
                </div>
                {lastError && (
                    <div className="text-rose-500 max-w-[150px] overflow-hidden text-ellipsis italic border-t border-white/10 mt-1 pt-1">
                        ERR: {lastError}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SoundMonitor;
