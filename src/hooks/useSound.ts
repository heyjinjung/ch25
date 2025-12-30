import { useSoundContext } from "../contexts/SoundContext";
import { useCallback } from "react";

export const SOUND_ASSETS = {
    BGM: {
        MAIN: "/assets/sounds/bgm/Red Curtain.ogg",
        BATTLE: "/assets/sounds/bgm/battle_theme.wav",
    },
    SFX: {
        CLICK: "/assets/sounds/sfx/MESSAGE-B_Accept.wav", // Changed to Message sound as requested
        TRANSITION: "/assets/sounds/sfx/page_turn.mp3", // Changed to Page Turn sound as requested
        ENTER_GAME: "/assets/sounds/sfx/MESSAGE-B_Accept.wav", // Changed to Message sound
        TOAST: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        DICE_SHAKE: "/assets/sounds/sfx/dice-shake-3.ogg",
        DICE_THROW: "/assets/sounds/sfx/dice-throw-3.ogg",
        TAB_TOUCH: "/assets/sounds/sfx/page_turn.mp3",
        LOTTERY_SCRATCH: "/assets/sounds/sfx/lottery_reveal.wav",
        ROULETTE_SPIN: "/assets/sounds/sfx/roulette_spin.wav",
    },
};

export const useSound = () => {
    const { playSfx, playBgm, stopBgm, toggleMute, isMuted } = useSoundContext();

    const playClick = useCallback(() => { /* Silent */ }, []);
    const playPageTransition = useCallback(() => playSfx(SOUND_ASSETS.SFX.TRANSITION, { volume: 0.4 }), [playSfx]);
    const playToast = useCallback(() => playSfx(SOUND_ASSETS.SFX.TOAST, { volume: 0.7 }), [playSfx]);
    const playEnterGame = useCallback(() => { /* Silent */ }, []);
    const playDiceShake = useCallback(() => playSfx(SOUND_ASSETS.SFX.DICE_SHAKE, { volume: 0.8 }), [playSfx]);
    const playDiceThrow = useCallback(() => playSfx(SOUND_ASSETS.SFX.DICE_THROW, { volume: 1.0 }), [playSfx]);
    const playTabTouch = useCallback(() => playSfx(SOUND_ASSETS.SFX.TAB_TOUCH, { volume: 1.0 }), [playSfx]);
    const playLotteryScratch = useCallback(() => playSfx(SOUND_ASSETS.SFX.LOTTERY_SCRATCH, { volume: 0.8 }), [playSfx]);
    const playRouletteSpin = useCallback(() => playSfx(SOUND_ASSETS.SFX.ROULETTE_SPIN, { volume: 0.8 }), [playSfx]);

    const startMainBgm = useCallback(() => playBgm(SOUND_ASSETS.BGM.MAIN), [playBgm]);
    const startBattleBgm = useCallback(() => playBgm(SOUND_ASSETS.BGM.BATTLE), [playBgm]);

    return {
        playClick,
        playPageTransition,
        playToast,
        playEnterGame,
        playDiceShake,
        playDiceThrow,
        playTabTouch,
        playLotteryScratch,
        playRouletteSpin,
        startMainBgm,
        startBattleBgm,
        stopBgm,
        toggleMute,
        isMuted,
        playSfx, // Expose raw for custom usage
    };
};
