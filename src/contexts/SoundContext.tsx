import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Howl, Howler } from "howler";

type SoundContextType = {
    isMuted: boolean;
    toggleMute: () => void;
    playBgm: (src: string) => void;
    stopBgm: () => void;
    playSfx: (src: string, options?: { volume?: number; loop?: boolean }) => Howl | null;
    stopSfx: (howl: Howl | null) => void;
    unlockAudio: () => void;
};

const SoundContext = createContext<SoundContextType | null>(null);

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMuted, setIsMuted] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("sound_muted") === "true";
        }
        return false;
    });

    const bgmRef = useRef<Howl | null>(null);
    const currentBgmSrcRef = useRef<string | null>(null);

    useEffect(() => {
        Howler.mute(isMuted);
        localStorage.setItem("sound_muted", String(isMuted));
    }, [isMuted]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => !prev);
    }, []);

    const unlockAudio = useCallback(() => {
        if (Howler.ctx && Howler.ctx.state === "suspended") {
            Howler.ctx.resume();
        }
    }, []);

    const playBgm = useCallback((src: string) => {
        if (currentBgmSrcRef.current === src && bgmRef.current?.playing()) return;

        if (bgmRef.current) {
            bgmRef.current.fade(0.5, 0, 1000);
            setTimeout(() => {
                bgmRef.current?.stop();
                bgmRef.current?.unload();
            }, 1000);
        }

        const sound = new Howl({
            src: [src],
            html5: true,
            loop: true,
            volume: 0.5,
            autoplay: true,
        });

        bgmRef.current = sound;
        currentBgmSrcRef.current = src;
        sound.fade(0, 0.5, 1000);
    }, []);

    const stopBgm = useCallback(() => {
        if (bgmRef.current) {
            bgmRef.current.fade(0.5, 0, 1000);
            setTimeout(() => {
                bgmRef.current?.stop();
                bgmRef.current?.unload();
                bgmRef.current = null;
                currentBgmSrcRef.current = null;
            }, 1000);
        }
    }, []);

    const playSfx = useCallback((src: string, options?: { volume?: number; loop?: boolean }) => {
        const sound = new Howl({
            src: [src],
            volume: options?.volume ?? 1.0,
            loop: options?.loop ?? false,
        });
        sound.play();
        return sound;
    }, []);

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

    return (
        <SoundContext.Provider value={{ isMuted, toggleMute, playBgm, stopBgm, playSfx, stopSfx, unlockAudio }}>
            {children}
        </SoundContext.Provider>
    );
};

export const useSoundContext = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error("useSoundContext must be used within a SoundProvider");
    }
    return context;
};
