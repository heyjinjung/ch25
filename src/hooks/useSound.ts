import { useSoundContext } from "../contexts/SoundContext";
import { useCallback, useRef } from "react";
import { Howl } from "howler";

// Source definitions moved to SoundContext for centralization,
// using local constants for easy reference if needed.
const SOUND_SOURCES = {
  BGM: {
    MAIN: "/assets/sounds/bgm/Sketchbook 2025-12-03 LOOP.ogg",
    BATTLE: "/assets/sounds/bgm/battle_theme.wav",
    VAULT: "/assets/sounds/bgm/Sketchbook 2025-12-11_BREAKDOWN.ogg",
    LOTTERY: "/assets/sounds/bgm/Red Curtain.ogg",
    ROULETTE: "/assets/sounds/bgm/Sketchbook 2025-12-03 LOOP.ogg",
  },
  SFX: {
    TRANSITION: "/assets/sounds/sfx/page_turn.mp3",
    TAB_TOUCH: "/assets/sounds/sfx/page_turn.mp3",
    DICE_SHAKE: "/assets/sounds/sfx/dice-shake-3.ogg",
    DICE_THROW: "/assets/sounds/sfx/dice-throw-3.ogg",
    DICE_REVEAL: "/assets/sounds/sfx/Dice_Reveal.ogg",
    ROULETTE_STOP: "/assets/sounds/sfx/Ball_Drop_Clack.ogg",
    ROULETTE_LOSE: "/assets/sounds/sfx/fail03.ogg",
    DICE_LOSE: "/assets/sounds/sfx/fail03.ogg",
    // 복권(로또) 효과음: 플레이 버튼~결과 모달까지
    LOTTO_PLAY: "/assets/sounds/sfx/Lotto_Ball_Roll.ogg",
    // 룰렛 효과음: 플레이 버튼~결과 모달까지
    ROULETTE_PLAY: "/assets/sounds/sfx/rou-roll.mp3",
    // 당첨 효과음
    WIN_SMALL: "/assets/sounds/sfx/Small_Win.ogg",
    WIN_BIG: "/assets/sounds/sfx/Big_Win.ogg",
    VAULT_JINGLE: "/assets/sounds/sfx/valut.mp3",
    LOTTO_WIN: "/assets/sounds/sfx/Ball_Drop_Clack.ogg",
  },
};

export const useSound = () => {
  const { playSfx, playBgm, stopBgm, toggleMute, isMuted, isReady } =
    useSoundContext();

  // Refs for stop control of looping sounds (룰렛 효과음만 루프 제어)
  const rouletteSpinRef = useRef<Howl | null>(null);
  const lottoPlayRef = useRef<Howl | null>(null);
  const roulettePlayRef = useRef<Howl | null>(null);

  const playClick = useCallback(() => {
    // can be used for generic UI clicks
  }, []);

  const playPageTransition = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.TRANSITION, { volume: 0.4 }),
    [playSfx],
  );
  const playToast = useCallback(() => {
    // playSfx(SOUND_SOURCES.SFX.TOAST, { volume: 0.7 })
  }, [playSfx]);

  const playDiceShake = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.DICE_SHAKE, { volume: 0.8 }),
    [playSfx],
  );
  const playDiceThrow = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.DICE_THROW, { volume: 1.0 }),
    [playSfx],
  );
  const playDiceReveal = useCallback(() => {
    // Disabled as per user request
  }, []);
  const playTabTouch = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.TAB_TOUCH, { volume: 1.0 }),
    [playSfx],
  );

  // 복권(로또) 플레이 효과음: 플레이 버튼~결과 모달까지
  const playLottoPlay = useCallback(() => {
    if (lottoPlayRef.current) {
      lottoPlayRef.current.stop();
      lottoPlayRef.current = null;
    }
    lottoPlayRef.current = playSfx(SOUND_SOURCES.SFX.LOTTO_PLAY, {
      volume: 1.0,
      loop: true,
    });
    return lottoPlayRef.current;
  }, [playSfx]);
  const stopLottoPlay = useCallback(() => {
    const howl = lottoPlayRef.current;
    if (!howl) return;
    howl.fade(howl.volume(), 0, 250);
    setTimeout(() => {
      howl.stop();
      lottoPlayRef.current = null;
    }, 260);
  }, []);

  // 룰렛 플레이 효과음: 플레이 버튼~결과 모달까지
  const playRoulettePlay = useCallback(() => {
    if (roulettePlayRef.current) {
      roulettePlayRef.current.stop();
      roulettePlayRef.current = null;
    }
    roulettePlayRef.current = playSfx(SOUND_SOURCES.SFX.ROULETTE_PLAY, {
      volume: 1.0,
      loop: true,
    });
    return roulettePlayRef.current;
  }, [playSfx]);
  const stopRoulettePlay = useCallback(() => {
    const howl = roulettePlayRef.current;
    if (!howl) return;
    howl.fade(howl.volume(), 0, 250);
    setTimeout(() => {
      howl.stop();
      roulettePlayRef.current = null;
    }, 260);
  }, []);

  const playRouletteStop = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.ROULETTE_STOP, { volume: 0.9 }),
    [playSfx],
  );
  // 소/대규모 당첨, 금고 징글 등 불필요 효과음 제거
  const playRouletteLose = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.ROULETTE_LOSE, { volume: 0.8 }),
    [playSfx],
  );
  const playDiceLose = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.DICE_LOSE, { volume: 0.8 }),
    [playSfx],
  );

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
    playBgm("/assets/sounds/bgm/Sketchbook 2025-12-03 LOOP.ogg");
  }, [playBgm]);
  const startBattleBgm = useCallback(
    () => playBgm(SOUND_SOURCES.BGM.BATTLE),
    [playBgm],
  );
  const startVaultBgm = useCallback(
    () => playBgm(SOUND_SOURCES.BGM.VAULT),
    [playBgm],
  );
  const startLotteryBgm = useCallback(
    () => playBgm(SOUND_SOURCES.BGM.LOTTERY),
    [playBgm],
  );
  const startRouletteBgm = useCallback(
    () => playBgm(SOUND_SOURCES.BGM.ROULETTE),
    [playBgm],
  );

  // 당첨 효과음
  const playSmallWin = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.WIN_SMALL, { volume: 0.8 }),
    [playSfx],
  );
  const playBigWin = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.WIN_BIG, { volume: 0.9 }),
    [playSfx],
  );
  const playVaultJingle = useCallback(
    () => playSfx(SOUND_SOURCES.SFX.VAULT_JINGLE, { volume: 0.7 }),
    [playSfx],
  );

  // 햅틱 피드백 (모바일 진동)
  const triggerHapticLight = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      // 일반 결과: 짧고 가벼운 진동 (15ms)
      navigator.vibrate(15);
    }
  }, []);

  const triggerHapticMedium = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      // 중간 강도: 살짝 긴 진동 (30ms)
      navigator.vibrate(30);
    }
  }, []);

  const triggerHapticStrong = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      // 골든아워: 강한 패턴 진동 (진동-멈춤-진동)
      navigator.vibrate([40, 30, 60]);
    }
  }, []);

  const triggerHapticSuccess = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      // 승리: 축하 패턴 (짧은 더블 탭)
      navigator.vibrate([20, 50, 20]);
    }
  }, []);

  const triggerHapticFail = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      // 패배: 아쉬운 느낌의 단일 진동
      navigator.vibrate(50);
    }
  }, []);

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
    playLottoPlay,
    stopLottoPlay,
    playRoulettePlay,
    stopRoulettePlay,
    playRouletteSpin,
    stopRouletteSpin,
    startMainBgm,
    startBattleBgm,
    startVaultBgm,
    startLotteryBgm,
    startRouletteBgm,
    stopBgm,
    toggleMute,
    isMuted,
    isReady,
    playSfx,
    playEnterGame,
    playRouletteStop,
    playRouletteLose,
    playDiceLose,
    playDiceReveal,
    playSmallWin,
    playBigWin,
    playVaultJingle,
    // 햅틱 피드백
    triggerHapticLight,
    triggerHapticMedium,
    triggerHapticStrong,
    triggerHapticSuccess,
    triggerHapticFail,
  };
};
