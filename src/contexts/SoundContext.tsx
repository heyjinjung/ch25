import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Howl, Howler } from "howler";

type SoundContextType = {
    isMuted: boolean;
    toggleMute: () => void;
    bgmVolume: number;
    setBgmVolume: (vol: number) => void;
    sfxVolume: number;
    setSfxVolume: (vol: number) => void;
    playSfx: (src: string, options?: { volume?: number; speed?: number }) => Howl | null;
    stopSfx: (howl: Howl | null) => void;
    playBgm: (src: string) => void;
    stopBgm: () => void;
    unlockAudio: () => void;
    isReady: boolean;
    retryQueueCount: number;
    lastError: string | null;
};

const SOUND_ASSETS = {
    BGM: {
        MAIN: "/assets/sounds/bgm/Red Curtain.ogg",
        BATTLE: "/assets/sounds/bgm/battle_theme.wav",
    },
    SFX: {
        CLICK: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        TRANSITION: "/assets/sounds/sfx/page_turn.mp3",
        TOAST: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        DICE_SHAKE: "/assets/sounds/sfx/dice-shake-3.ogg",
        DICE_THROW: "/assets/sounds/sfx/dice-throw-3.ogg",
        TAB_TOUCH: "/assets/sounds/sfx/page_turn.mp3",
        LOTTERY_SCRATCH: "/assets/sounds/sfx/lottery_reveal.wav",
        ROULETTE_SPIN: "/assets/sounds/sfx/roulette_spin.wav",
    },
};

const SoundContext = createContext<SoundContextType | null>(null);

const recordE2eSoundEvent = (event: { kind: "sfx" | "bgm"; src: string; options?: unknown }) => {
    if (typeof window === "undefined") return;
    const win = window as any;
    if (!win.Cypress) return;

    if (!Array.isArray(win.__e2eSoundEvents)) {
        win.__e2eSoundEvents = [];
    }
    win.__e2eSoundEvents.push({ ...event, ts: Date.now() });
};

export const useSoundContext = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error("useSoundContext must be used within a SoundProvider");
    }
    return context;
};



interface RetryItem {
    src: string;
    options?: { volume?: number; speed?: number };
}

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("sound_muted") === "true";
        }
        return false;
    });
    const [bgmVolume, setBgmVolumeState] = useState(0.5);
    const [sfxVolume, setSfxVolumeState] = useState(0.5);

    // Cloud Sync: Load initial state
    useEffect(() => {
        const tg = window.Telegram?.WebApp;
        if (tg?.CloudStorage) {
            tg.CloudStorage.getItem("sound_muted", (err: any, value: string | null) => {
                if (!err && value !== null) {
                    const cloudMuted = value === "true";
                    setIsMuted(prev => {
                        if (prev !== cloudMuted) {
                            console.log("[SOUND] Synced mute state from CloudStorage:", cloudMuted);
                            return cloudMuted;
                        }
                        return prev;
                    });
                }
            });
            tg.CloudStorage.getItem("bgm_volume", (err: any, value: string | null) => {
                if (!err && value !== null) {
                    const vol = parseFloat(value);
                    if (!isNaN(vol)) setBgmVolumeState(vol);
                }
            });
            tg.CloudStorage.getItem("sfx_volume", (err: any, value: string | null) => {
                if (!err && value !== null) {
                    const vol = parseFloat(value);
                    if (!isNaN(vol)) setSfxVolumeState(vol);
                }
            });
        }
    }, []);

    const [isReady, setIsReady] = useState(false);
    const [retryQueue, setRetryQueue] = useState<RetryItem[]>([]);
    const [lastError, setLastError] = useState<string | null>(null);

    const bgmRef = useRef<Howl | null>(null);
    const currentBgmSrcRef = useRef<string | null>(null);
    const sfxCacheRef = useRef<Record<string, Howl>>({});

    // 1. Preload all SFX
    useEffect(() => {
        console.log("[SOUND] Preloading assets...");
        let loadedCount = 0;
        const sfxList = Object.values(SOUND_ASSETS.SFX);

        sfxList.forEach(src => {
            const sound = new Howl({
                src: [src],
                preload: true,
                html5: false, // Force WebAudio for SFX
                volume: sfxVolume,
                onload: () => {
                    loadedCount++;
                    if (loadedCount === sfxList.length) {
                        console.log("[SOUND] All assets preloaded");
                        setIsReady(true);
                    }
                },
                onloaderror: (_id, error) => {
                    console.error(`[SOUND] Failed to load sound: ${src}`, error);
                    setLastError(`Load fail: ${src}`);
                    loadedCount++; // Still count it to unblock isReady
                    if (loadedCount === sfxList.length) setIsReady(true);
                }
            });
            sfxCacheRef.current[src] = sound;
        });
    }, []);

    const playSfx = useCallback((src: string, options?: { volume?: number; speed?: number }) => {
        recordE2eSoundEvent({ kind: "sfx", src, options });
        if (isMuted) return null;

        // If context is suspended, queue for retry upon user interaction
        if (Howler.ctx && Howler.ctx.state === "suspended") {
            console.warn(`[SOUND] AudioContext suspended. Queuing SFX: ${src}`);
            setRetryQueue(prev => [...prev, { src, options }]);
            return null;
        }

        // Try to get from cache first
        let sound = sfxCacheRef.current[src];

        if (!sound) {
            // Fallback for dynamically added sounds
            sound = new Howl({
                src: [src],
                html5: false,
                volume: (options?.volume ?? 1.0) * sfxVolume,
                rate: options?.speed ?? 1.0,
                onplayerror: (_id, error) => {
                    console.error(`[SOUND] Play error for: ${src}`, error);
                    setLastError(`Play fail: ${src}`);
                    // Howl instances sometimes fail if context is locked by browser
                    Howler.ctx?.resume();
                }
            });
            sfxCacheRef.current[src] = sound;
        } else {
            sound.volume((options?.volume ?? 1.0) * sfxVolume);
            sound.rate(options?.speed ?? 1.0);
        }

        try {
            sound.play();
        } catch (e) {
            console.error(`[SOUND] Exception during play: ${src}`, e);
            setRetryQueue(prev => [...prev, { src, options }]);
        }

        return sound;
    }, [isMuted, sfxVolume]);

    const flushRetryQueue = useCallback(() => {
        if (retryQueue.length === 0) return;

        console.log(`[SOUND] Flushing retry queue (${retryQueue.length} items)`);
        const items = [...retryQueue];
        setRetryQueue([]); // Clear immediately to avoid loops

        items.forEach(item => {
            playSfx(item.src, item.options);
        });
    }, [retryQueue, playSfx]);

    const unlockAudio = useCallback(() => {
        if (Howler.ctx && Howler.ctx.state === "suspended") {
            Howler.ctx.resume().then(() => {
                console.log("[SOUND] AudioContext resumed");
                flushRetryQueue();
            });
        } else {
            flushRetryQueue();
        }
    }, [flushRetryQueue]);

    useEffect(() => {
        Howler.mute(isMuted);
        localStorage.setItem("sound_muted", JSON.stringify(isMuted));
        // Cloud Sync
        window.Telegram?.WebApp?.CloudStorage?.setItem("sound_muted", JSON.stringify(isMuted));
    }, [isMuted]);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);
    const setBgmVolume = useCallback((vol: number) => {
        setBgmVolumeState(vol);
        if (bgmRef.current) bgmRef.current.volume(vol);
        // Cloud Sync
        window.Telegram?.WebApp?.CloudStorage?.setItem("bgm_volume", String(vol));
    }, []);
    const setSfxVolume = useCallback((vol: number) => {
        setSfxVolumeState(vol);
        // Cloud Sync
        window.Telegram?.WebApp?.CloudStorage?.setItem("sfx_volume", String(vol));
    }, []);

    const playBgm = useCallback((src: string) => {
        recordE2eSoundEvent({ kind: "bgm", src });
        if (currentBgmSrcRef.current === src && bgmRef.current?.playing()) return;

        if (bgmRef.current) {
            bgmRef.current.fade(bgmRef.current.volume(), 0, 1000);
            const oldBgm = bgmRef.current;
            setTimeout(() => {
                oldBgm.stop();
                oldBgm.unload();
            }, 1000);
        }

        const sound = new Howl({
            src: [src],
            html5: true, // Stream large files
            loop: true,
            volume: 0,
            autoplay: true,
            onplayerror: (_id, error) => {
                console.error(`[SOUND] BGM Play error: ${src}`, error);
                setLastError(`BGM fail: ${src}`);
            }
        });

        bgmRef.current = sound;
        currentBgmSrcRef.current = src;
        sound.fade(0, bgmVolume, 1000);
    }, [bgmVolume]);

    const stopBgm = useCallback(() => {
        if (bgmRef.current) {
            bgmRef.current.fade(bgmRef.current.volume(), 0, 1000);
            const oldBgm = bgmRef.current;
            setTimeout(() => {
                oldBgm.stop();
                oldBgm.unload();
                bgmRef.current = null;
                currentBgmSrcRef.current = null;
            }, 1000);
        }
    }, []);

    const stopSfx = useCallback((howl: Howl | null) => {
        if (howl) howl.stop();
    }, []);

    // Global Unlock Listener
    useEffect(() => {
        const unlock = () => {
            unlockAudio();
            // Don't remove listener immediately if we want continuous "nudging" 
            // but for performance one-time is usually enough for resume.
            // We'll keep it active for the session to handle potential suspensions.
        };
        window.addEventListener("click", unlock);
        window.addEventListener("touchstart", unlock);
        return () => {
            window.removeEventListener("click", unlock);
            window.removeEventListener("touchstart", unlock);
        };
    }, [unlockAudio]);

    const contextValue = React.useMemo(() => ({
        isMuted,
        toggleMute,
        bgmVolume,
        setBgmVolume,
        sfxVolume,
        setSfxVolume,
        playSfx,
        stopSfx,
        playBgm,
        stopBgm,
        unlockAudio,
        isReady,
        retryQueueCount: retryQueue.length,
        lastError
    }), [isMuted, bgmVolume, sfxVolume, toggleMute, setBgmVolume, setSfxVolume, playSfx, stopSfx, playBgm, stopBgm, unlockAudio, isReady, retryQueue.length, lastError]);

    return (
        <SoundContext.Provider value={contextValue}>
            {children}
        </SoundContext.Provider>
    );
};
