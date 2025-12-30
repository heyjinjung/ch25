import { useSoundContext } from "../contexts/SoundContext";
import { useCallback, useRef } from "react";
import { Howl } from "howler";

// Source definitions moved to SoundContext for centralization, 
// using local constants for easy reference if needed.
const SOUND_SOURCES = {
    BGM: {
        MAIN: "/assets/sounds/bgm/Red Curtain.ogg",
        BATTLE: "/assets/sounds/bgm/battle_theme.wav",
    },
    SFX: {
        TRANSITION: "/assets/sounds/sfx/page_turn.mp3",
        TOAST: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        DICE_SHAKE: "/assets/sounds/sfx/dice-shake-3.ogg",
        DICE_THROW: "/assets/sounds/sfx/dice-throw-3.ogg",
        TAB_TOUCH: "/assets/sounds/sfx/page_turn.mp3",
        LOTTERY_SCRATCH: "/assets/sounds/sfx/lottery_reveal.wav",
        ROULETTE_SPIN: "/assets/sounds/sfx/roulette_spin.wav",
        ENTER_GAME: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
    },
};

export const useSound = () => {
    const { playSfx, playBgm, stopBgm, toggleMute, isMuted, isReady } = useSoundContext();

    // Refs for stop control of looping sounds
    const rouletteSpinRef = useRef<Howl | null>(null);
    const lotteryScratchRef = useRef<Howl | null>(null);

    const playClick = useCallback(() => {
        // can be used for generic UI clicks
    }, []);

    const playPageTransition = useCallback(() => playSfx(SOUND_SOURCES.SFX.TRANSITION, { volume: 0.4 }), [playSfx]);
    const playToast = useCallback(() => playSfx(SOUND_SOURCES.SFX.TOAST, { volume: 0.7 }), [playSfx]);

    const playDiceShake = useCallback(() => playSfx(SOUND_SOURCES.SFX.DICE_SHAKE, { volume: 0.8 }), [playSfx]);
    const playDiceThrow = useCallback(() => playSfx(SOUND_SOURCES.SFX.DICE_THROW, { volume: 1.0 }), [playSfx]);
    const playTabTouch = useCallback(() => playSfx(SOUND_SOURCES.SFX.TAB_TOUCH, { volume: 1.0 }), [playSfx]);

    const playLotteryScratch = useCallback(() => {
        if (lotteryScratchRef.current) {
            lotteryScratchRef.current.stop();
        }
        lotteryScratchRef.current = playSfx(SOUND_SOURCES.SFX.LOTTERY_SCRATCH, { volume: 0.8 });
    }, [playSfx]);

    const stopLotteryScratch = useCallback(() => {
        if (lotteryScratchRef.current) {
            lotteryScratchRef.current.fade(0.8, 0, 500);
            setTimeout(() => {
                lotteryScratchRef.current?.stop();
                lotteryScratchRef.current = null;
            }, 500);
        }
    }, []);

    const playRouletteSpin = useCallback(() => {
        if (rouletteSpinRef.current) {
            rouletteSpinRef.current.stop();
        }
        rouletteSpinRef.current = playSfx(SOUND_SOURCES.SFX.ROULETTE_SPIN, { volume: 0.8 });
    }, [playSfx]);

    const stopRouletteSpin = useCallback(() => {
        if (rouletteSpinRef.current) {
            rouletteSpinRef.current.fade(0.8, 0, 500);
            setTimeout(() => {
                rouletteSpinRef.current?.stop();
                rouletteSpinRef.current = null;
            }, 500);
        }
    }, []);

    const startMainBgm = useCallback(() => playBgm(SOUND_SOURCES.BGM.MAIN), [playBgm]);
    const startBattleBgm = useCallback(() => playBgm(SOUND_SOURCES.BGM.BATTLE), [playBgm]);

    const playEnterGame = useCallback(() => playSfx(SOUND_SOURCES.SFX.ENTER_GAME, { volume: 0.6 }), [playSfx]);

    return {
        playClick,
        playPageTransition,
        playToast,
        playDiceShake,
        playDiceThrow,
        playTabTouch,
        playLotteryScratch,
        stopLotteryScratch,
        playRouletteSpin,
        stopRouletteSpin,
        startMainBgm,
        startBattleBgm,
        stopBgm,
        toggleMute,
        isMuted,
        isReady,
        playSfx,
        playEnterGame,
    };
};
