/**
 * V2 Haptic Feedback Utility
 *
 * Telegram Mini App 환경에서는 햅틱 피드백을 제공합니다.
 * Web 환경에서는 Vibration API를 fallback으로 사용합니다.
 */

type HapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
type NotificationType = "error" | "success" | "warning";

/**
 * 햅틱 임팩트 피드백을 트리거합니다.
 */
export const triggerHaptic = (style: HapticStyle = "medium") => {
  try {
    // Telegram WebApp 햅틱 지원
    const telegram = (window as any).Telegram;
    if (telegram?.WebApp?.HapticFeedback) {
      telegram.WebApp.HapticFeedback.impactOccurred(style);
      return;
    }

    // Fallback: Vibration API
    if ("vibrate" in navigator) {
      const vibrationMap: Record<HapticStyle, number> = {
        light: 10,
        medium: 20,
        heavy: 40,
        rigid: 15,
        soft: 8,
      };
      navigator.vibrate(vibrationMap[style]);
    }
  } catch (error) {
    console.warn("[Haptic] Failed to trigger haptic feedback:", error);
  }
};

/**
 * 알림 햅틱 피드백을 트리거합니다.
 */
export const triggerNotification = (type: NotificationType) => {
  try {
    // Telegram WebApp 햅틱 지원
    const telegram = (window as any).Telegram;
    if (telegram?.WebApp?.HapticFeedback) {
      telegram.WebApp.HapticFeedback.notificationOccurred(type);
      return;
    }

    // Fallback: Vibration API
    if ("vibrate" in navigator) {
      const vibrationMap: Record<NotificationType, number[]> = {
        error: [50, 50, 50],
        success: [30, 50, 30],
        warning: [40, 40],
      };
      navigator.vibrate(vibrationMap[type]);
    }
  } catch (error) {
    console.warn("[Haptic] Failed to trigger notification haptic:", error);
  }
};

/**
 * 선택 변경 햅틱 피드백을 트리거합니다. (가벼운 클릭)
 */
export const triggerSelectionChanged = () => {
  try {
    // Telegram WebApp 햅틱 지원
    const telegram = (window as any).Telegram;
    if (telegram?.WebApp?.HapticFeedback) {
      telegram.WebApp.HapticFeedback.selectionChanged();
      return;
    }

    // Fallback: Vibration API
    if ("vibrate" in navigator) {
      navigator.vibrate(5);
    }
  } catch (error) {
    console.warn("[Haptic] Failed to trigger selection haptic:", error);
  }
};

/**
 * 커스텀 진동 패턴을 트리거합니다.
 */
export const triggerVibration = (pattern: number | number[]) => {
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn("[Haptic] Failed to trigger vibration:", error);
  }
};
