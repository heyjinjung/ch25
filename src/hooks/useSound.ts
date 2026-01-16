import { useSoundContext } from "../contexts/SoundContext";
import { useCallback, useRef } from "react";
import { Howl } from "howler";

// Source definitions moved to SoundContext for centralization, 
// using local constants for easy reference if needed.
const SOUND_SOURCES = {
    BGM: {
        MAIN: "/assets/sounds/bgm/battle_theme.wav",
        BATTLE: "/assets/sounds/bgm/battle_theme.wav",
    },
    SFX: {
        TRANSITION: "/assets/sounds/sfx/page_turn.mp3",
        // TOAST: "/assets/sounds/sfx/MESSAGE-B_Accept.wav", // Deleted
        DICE_SHAKE: "/assets/sounds/sfx/dice-shake-3.ogg",
        DICE_THROW: "/assets/sounds/sfx/dice-throw-3.ogg",
        DICE_REVEAL: "/assets/sounds/sfx/Dice_Reveal.ogg",
        TAB_TOUCH: "/assets/sounds/sfx/page_turn.mp3",
        LOTTERY_ROLL: "/assets/sounds/sfx/Lotto_Ball_Roll.ogg",
        LOTTERY_WIN: "/assets/sounds/sfx/Lotto_Win.ogg",
        ROULETTE_STOP: "/assets/sounds/sfx/Ball_Drop_Clack.ogg",
        SMALL_WIN: "/assets/sounds/sfx/Small_Win.ogg",
        BIG_WIN: "/assets/sounds/sfx/Big_Win.ogg",
        VAULT_JINGLE: "/assets/sounds/sfx/Vault_Jingle.ogg",
        ROULETTE_LOSE: "/assets/sounds/sfx/roulette_lose.wav",
        DICE_LOSE: "/assets/sounds/sfx/dice_lose.ogg",
        // ENTER_GAME: "/assets/sounds/sfx/MESSAGE-B_Accept.wav", // Deleted
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
    const playToast = useCallback(() => {
        // playSfx(SOUND_SOURCES.SFX.TOAST, { volume: 0.7 })
    }, [playSfx]);

    const playDiceShake = useCallback(() => playSfx(SOUND_SOURCES.SFX.DICE_SHAKE, { volume: 0.8 }), [playSfx]);
    const playDiceThrow = useCallback(() => playSfx(SOUND_SOURCES.SFX.DICE_THROW, { volume: 1.0 }), [playSfx]);
    const playDiceReveal = useCallback(() => playSfx(SOUND_SOURCES.SFX.DICE_REVEAL, { volume: 0.9 }), [playSfx]);
    const playTabTouch = useCallback(() => playSfx(SOUND_SOURCES.SFX.TAB_TOUCH, { volume: 1.0 }), [playSfx]);

    const playLotteryScratch = useCallback(() => {
        if (lotteryScratchRef.current) {
            lotteryScratchRef.current.stop();
        }
        lotteryScratchRef.current = playSfx(SOUND_SOURCES.SFX.LOTTERY_ROLL, { volume: 1.0, loop: true });
    }, [playSfx]);

    const stopLotteryScratch = useCallback(() => {
        if (lotteryScratchRef.current) {
            lotteryScratchRef.current.fade(1.0, 0, 300);
            setTimeout(() => {
                lotteryScratchRef.current?.stop();
                lotteryScratchRef.current = null;
            }, 300);
        }
    }, []);

    const playLotteryWin = useCallback(() => playSfx(SOUND_SOURCES.SFX.LOTTERY_WIN, { volume: 1.0 }), [playSfx]);

    const playRouletteStop = useCallback(() => playSfx(SOUND_SOURCES.SFX.ROULETTE_STOP, { volume: 0.9 }), [playSfx]);
    const playSmallWin = useCallback(() => playSfx(SOUND_SOURCES.SFX.SMALL_WIN, { volume: 0.8 }), [playSfx]);
    const playBigWin = useCallback(() => playSfx(SOUND_SOURCES.SFX.BIG_WIN, { volume: 1.0 }), [playSfx]);
    const playVaultJingle = useCallback(() => playSfx(SOUND_SOURCES.SFX.VAULT_JINGLE, { volume: 0.8 }), [playSfx]);
    const playRouletteLose = useCallback(() => playSfx(SOUND_SOURCES.SFX.ROULETTE_LOSE, { volume: 0.8 }), [playSfx]);
    const playDiceLose = useCallback(() => playSfx(SOUND_SOURCES.SFX.DICE_LOSE, { volume: 0.8 }), [playSfx]);

    const playRouletteSpin = useCallback(() => {
        // if (rouletteSpinRef.current) {
        //     rouletteSpinRef.current.stop();
        // }
        // rouletteSpinRef.current = playSfx(SOUND_SOURCES.SFX.ROULETTE_SPIN, { volume: 0.8 });
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

    const startMainBgm = useCallback(() => {
        playBgm([
            "/assets/sounds/bgm/Sketchbook 2025-12-11_INTRO.ogg",
            "/assets/sounds/bgm/Sketchbook 2025-12-11_VERSE.ogg",
            "/assets/sounds/bgm/Sketchbook 2025-12-11_NEURO.ogg",
            "/assets/sounds/bgm/Sketchbook 2025-12-11_BREAKDOWN.ogg"
        ]);
    }, [playBgm]);
    const startBattleBgm = useCallback(() => playBgm(SOUND_SOURCES.BGM.BATTLE), [playBgm]);

    const playEnterGame = useCallback(() => {
        // playSfx(SOUND_SOURCES.SFX.ENTER_GAME, { volume: 0.6 })
    }, [playSfx]);

    return {
        playClick,
        playPageTransition,
        playToast,
        playDiceShake,
        playDiceThrow,
        playTabTouch,
        playLotteryScratch,
        stopLotteryScratch,
        playLotteryWin,
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
        playRouletteStop,
        playSmallWin,
        playBigWin,
        playVaultJingle,
        playRouletteLose,
        playDiceLose,
        playDiceReveal,
    };
};
