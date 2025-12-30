import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Howl, Howler } from "howler";

type SoundContextType = {
    isMuted: boolean;
    toggleMute: () => void;
    bgmVolume: number;
    setBgmVolume: (vol: number) => void;
    sfxVolume: number;
    setSfxVolume: (vol: number) => void;
    playSfx: (src: string, options?: { volume?: number; speed?: number }) => void;
    playBgm: (src: string) => void;
    stopBgm: () => void;
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
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem("sound_muted");
        return saved ? JSON.parse(saved) : false;
    });

    const [bgmVolume, setBgmVolumeState] = useState(0.5);
    const [sfxVolume, setSfxVolumeState] = useState(0.5);

    const bgmRef = useRef<Howl | null>(null);
    const currentBgmSrc = useRef<string | null>(null);

    // Sync global mute state
    useEffect(() => {
        Howler.mute(isMuted);
        localStorage.setItem("sound_muted", JSON.stringify(isMuted));
    }, [isMuted]);

    // Global Unlock Listener
    useEffect(() => {
        const unlockAudio = () => {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume().then(() => {
                    console.log("Audio Context Resumed");
                    // If BGM is supposed to be playing but isn't effectively running, retry
                    if (bgmRef.current && !bgmRef.current.playing() && !isMuted) {
                        bgmRef.current.play();
                    }
                });
            }
            const silent = new Howl({ src: ['data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'], html5: false });
            silent.play();
        };

        const events = ['click', 'touchstart', 'keydown'];
        const handler = () => {
            unlockAudio();
            events.forEach(e => document.removeEventListener(e, handler));
        };

        events.forEach(e => document.addEventListener(e, handler));
        return () => events.forEach(e => document.removeEventListener(e, handler));
    }, [isMuted]);

    const toggleMute = React.useCallback(() => setIsMuted((prev: boolean) => !prev), []);
    const setBgmVolume = React.useCallback((vol: number) => setBgmVolumeState(vol), []);
    const setSfxVolume = React.useCallback((vol: number) => setSfxVolumeState(vol), []);

    const playSfx = React.useCallback((src: string, options?: { volume?: number; speed?: number }) => {
        // SFX check isMuted dynamically via Ref or just rely on global Howler.mute which we sync
        // But we explicitly check state here for fine control
        if (isMuted) return;

        const sound = new Howl({
            src: [src],
            volume: (options?.volume ?? 1.0) * sfxVolume,
            rate: options?.speed ?? 1.0,
            html5: false,
        });
        sound.play();
    }, [sfxVolume]);

    const playBgm = React.useCallback((src: string) => {
        // Reuse existing instance if same source
        if (currentBgmSrc.current === src && bgmRef.current) {
            if (!bgmRef.current.playing()) {
                bgmRef.current.play();
                bgmRef.current.fade(0, bgmVolume, 1000);
            }
            return;
        }

        // Cleanup old
        if (bgmRef.current) {
            const oldBgm = bgmRef.current;
            oldBgm.fade(oldBgm.volume(), 0, 500);
            setTimeout(() => {
                oldBgm.stop();
                oldBgm.unload(); // Critical: Free HTML5 Audio Pool
            }, 500);
        }

        const sound = new Howl({
            src: [src],
            html5: true, // Streaming
            loop: true,
            volume: 0,
            onload: () => {
                sound.fade(0, bgmVolume, 1000);
            }
        });

        bgmRef.current = sound;
        currentBgmSrc.current = src;
        sound.play();
    }, [bgmVolume]);

    const stopBgm = React.useCallback(() => {
        if (bgmRef.current) {
            const oldBgm = bgmRef.current;
            oldBgm.fade(oldBgm.volume(), 0, 500);
            setTimeout(() => {
                oldBgm.stop();
                oldBgm.unload();
                if (bgmRef.current === oldBgm) { // Ensure we don't nullify if replaced
                    bgmRef.current = null;
                    currentBgmSrc.current = null;
                }
            }, 500);
        }
    }, []);

    // Update running BGM volume if slider moves
    useEffect(() => {
        if (bgmRef.current && bgmRef.current.playing()) {
            bgmRef.current.volume(bgmVolume);
        }
    }, [bgmVolume]);

    // Memoize the context value to prevent consumer re-renders
    const contextValue = React.useMemo(() => ({
        isMuted,
        toggleMute,
        bgmVolume,
        setBgmVolume,
        sfxVolume,
        setSfxVolume,
        playSfx,
        playBgm,
        stopBgm,
    }), [isMuted, toggleMute, bgmVolume, setBgmVolume, sfxVolume, setSfxVolume, playSfx, playBgm, stopBgm]);

    return (
        <SoundContext.Provider value={contextValue}>
            {children}
        </SoundContext.Provider>
    );
};
