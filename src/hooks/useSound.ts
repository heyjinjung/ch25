import { useCallback, useRef } from "react";
import { useSoundContext } from "../contexts/SoundContext";
import { Howl } from "howler";

export const SOUND_ASSETS = {
    BGM: {
        MAIN: "/assets/sounds/bgm/Red Curtain.ogg",
        BATTLE: "/assets/sounds/bgm/battle_theme.wav",
    },
    SFX: {
        CLICK: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        TRANSITION: "/assets/sounds/sfx/page_turn.mp3",
        ENTER_GAME: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        TOAST: "/assets/sounds/sfx/MESSAGE-B_Accept.wav",
        DICE_SHAKE: "/assets/sounds/sfx/dice-shake-3.ogg",
        DICE_THROW: "/assets/sounds/sfx/dice-throw-3.ogg",
        TAB_TOUCH: "/assets/sounds/sfx/page_turn.mp3",
        LOTTERY_SCRATCH: "/assets/sounds/sfx/lottery_reveal.wav",
        ROULETTE_SPIN: "/assets/sounds/sfx/roulette_spin.wav",
    },
};

export const useSound = () => {
    const { playSfx, playBgm, stopBgm, toggleMute, isMuted, stopSfx } = useSoundContext();

    const rouletteSpinRef = useRef<Howl | null>(null);
    const lotteryScratchRef = useRef<Howl | null>(null);

    const playClick = useCallback(() => playSfx(SOUND_ASSETS.SFX.CLICK, { volume: 0.5 }), [playSfx]);
    const playPageTransition = useCallback(() => playSfx(SOUND_ASSETS.SFX.TRANSITION, { volume: 0.4 }), [playSfx]);
    const playToast = useCallback(() => playSfx(SOUND_ASSETS.SFX.TOAST, { volume: 0.6 }), [playSfx]);
    const playEnterGame = useCallback(() => playSfx(SOUND_ASSETS.SFX.ENTER_GAME, { volume: 0.5 }), [playSfx]);
    const playDiceShake = useCallback(() => playSfx(SOUND_ASSETS.SFX.DICE_SHAKE, { volume: 0.8 }), [playSfx]);
    const playDiceThrow = useCallback(() => playSfx(SOUND_ASSETS.SFX.DICE_THROW, { volume: 1.0 }), [playSfx]);
    const playTabTouch = useCallback(() => playSfx(SOUND_ASSETS.SFX.TAB_TOUCH, { volume: 0.4 }), [playSfx]);

    const playLotteryScratch = useCallback(() => {
        if (lotteryScratchRef.current) stopSfx(lotteryScratchRef.current);
        lotteryScratchRef.current = playSfx(SOUND_ASSETS.SFX.LOTTERY_SCRATCH, { volume: 0.8 });
    }, [playSfx, stopSfx]);

    const stopLotteryScratch = useCallback(() => {
        if (lotteryScratchRef.current) {
            lotteryScratchRef.current.fade(0.8, 0, 500); // Fade out over 500ms
            setTimeout(() => stopSfx(lotteryScratchRef.current), 500);
            lotteryScratchRef.current = null;
        }
    }, [stopSfx]);

    const playRouletteSpin = useCallback(() => {
        if (rouletteSpinRef.current) stopSfx(rouletteSpinRef.current);
        rouletteSpinRef.current = playSfx(SOUND_ASSETS.SFX.ROULETTE_SPIN, { volume: 0.8 });
    }, [playSfx, stopSfx]);

    const stopRouletteSpin = useCallback(() => {
        if (rouletteSpinRef.current) {
            rouletteSpinRef.current.fade(0.8, 0, 500); // Fade out over 500ms
            setTimeout(() => stopSfx(rouletteSpinRef.current), 500);
            rouletteSpinRef.current = null;
        }
    }, [stopSfx]);

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
        stopLotteryScratch,
        playRouletteSpin,
        stopRouletteSpin,
        startMainBgm,
        startBattleBgm,
        stopBgm,
        toggleMute,
        isMuted,
    };
};
