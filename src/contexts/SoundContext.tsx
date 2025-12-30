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
};

const SoundContext = createContext<SoundContextType | null>(null);

export const useSoundContext = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error("useSoundContext must be used within a SoundProvider");
    }
    return context;
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("sound_muted") === "true";
        }
        return false;
    });
    const [bgmVolume, setBgmVolumeState] = useState(0.5);
    const [sfxVolume, setSfxVolumeState] = useState(0.5);
    const bgmRef = useRef<Howl | null>(null);
    const currentBgmSrcRef = useRef<string | null>(null);

    const unlockAudio = useCallback(() => {
        if (Howler.ctx && Howler.ctx.state === "suspended") {
            Howler.ctx.resume();
        }
    }, []);

    useEffect(() => {
        Howler.mute(isMuted);
        localStorage.setItem("sound_muted", JSON.stringify(isMuted));
    }, [isMuted]);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);
    const setBgmVolume = useCallback((vol: number) => setBgmVolumeState(vol), []);
    const setSfxVolume = useCallback((vol: number) => setSfxVolumeState(vol), []);

    const playBgm = useCallback((src: string) => {
        if (currentBgmSrcRef.current === src && bgmRef.current?.playing()) return;
        if (bgmRef.current) {
            bgmRef.current.fade(bgmVolume, 0, 1000);
            setTimeout(() => {
                bgmRef.current?.stop();
                bgmRef.current?.unload();
                bgmRef.current = null;
                currentBgmSrcRef.current = null;
            }, 1000);
        }
        const sound = new Howl({ src: [src], html5: true, loop: true, volume: bgmVolume, autoplay: true });
        bgmRef.current = sound;
        currentBgmSrcRef.current = src;
        sound.fade(0, bgmVolume, 1000);
    }, [bgmVolume]);

    const stopBgm = useCallback(() => {
        if (bgmRef.current) {
            bgmRef.current.fade(bgmVolume, 0, 1000);
            setTimeout(() => {
                bgmRef.current?.stop();
                bgmRef.current?.unload();
                bgmRef.current = null;
                currentBgmSrcRef.current = null;
            }, 1000);
        }
    }, [bgmVolume]);

    const playSfx = useCallback((src: string, options?: { volume?: number; speed?: number }) => {
        if (isMuted) return null;
        const sound = new Howl({
            src: [src],
            volume: (options?.volume ?? 1.0) * sfxVolume,
            rate: options?.speed ?? 1.0,
            html5: false,
        });
        sound.play();
        return sound;
    }, [isMuted, sfxVolume]);

    const stopSfx = useCallback((howl: Howl | null) => {
        if (howl) {
            howl.stop();
            howl.unload();
        }
    }, []);

    // Global Unlock Listener
    useEffect(() => {
        const unlock = () => {
            unlockAudio();
            window.removeEventListener("click", unlock);
            window.removeEventListener("touchstart", unlock);
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
    }), [isMuted, bgmVolume, sfxVolume, toggleMute, setBgmVolume, setSfxVolume, playSfx, stopSfx, playBgm, stopBgm, unlockAudio]);

    return (
        <SoundContext.Provider value={contextValue}>
            {children}
        </SoundContext.Provider>
    );
};
