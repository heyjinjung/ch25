/**
 * V2 Haptic Feedback Utility
 *
 * Telegram Mini App ?˜ê²½?ì„œ ?…í‹± ?¼ë“œë°±ì„ ?œê³µ?©ë‹ˆ??
 * Web ?˜ê²½?ì„œ??Vibration APIë¥?fallback?¼ë¡œ ?¬ìš©?©ë‹ˆ??
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

/**
 * ?…í‹± ?„íŒ©???¼ë“œë°±ì„ ?¸ë¦¬ê±°í•©?ˆë‹¤.
 */
export const triggerHaptic = (style: HapticStyle = 'medium') => {
  try {
    // Telegram WebApp ?…í‹± ?¬ìš©
    const telegram = (window as any).Telegram;
    if (telegram?.WebApp?.HapticFeedback) {
      telegram.WebApp.HapticFeedback.impactOccurred(style);
      return;
    }

    // Fallback: Vibration API
    if ('vibrate' in navigator) {
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
    console.warn('[Haptic] Failed to trigger haptic feedback:', error);
  }
};

/**
 * ?Œë¦¼ ?…í‹± ?¼ë“œë°±ì„ ?¸ë¦¬ê±°í•©?ˆë‹¤.
 */
export const triggerNotification = (type: NotificationType) => {
  try {
    // Telegram WebApp ?…í‹± ?¬ìš©
    const telegram = (window as any).Telegram;
    if (telegram?.WebApp?.HapticFeedback) {
      telegram.WebApp.HapticFeedback.notificationOccurred(type);
      return;
    }

    // Fallback: Vibration API
    if ('vibrate' in navigator) {
      const vibrationMap: Record<NotificationType, number[]> = {
        error: [50, 50, 50],
        success: [30, 50, 30],
        warning: [40, 40],
      };
      navigator.vibrate(vibrationMap[type]);
    }
  } catch (error) {
    console.warn('[Haptic] Failed to trigger notification haptic:', error);
  }
};

/**
 * ? íƒ ë³€ê²??…í‹± ?¼ë“œë°±ì„ ?¸ë¦¬ê±°í•©?ˆë‹¤. (ê°€ë²¼ìš´ ???Œë¦¬)
 */
export const triggerSelectionChanged = () => {
  try {
    // Telegram WebApp ?…í‹± ?¬ìš©
    const telegram = (window as any).Telegram;
    if (telegram?.WebApp?.HapticFeedback) {
      telegram.WebApp.HapticFeedback.selectionChanged();
      return;
    }

    // Fallback: Vibration API
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  } catch (error) {
    console.warn('[Haptic] Failed to trigger selection haptic:', error);
  }
};

/**
 * ì»¤ìŠ¤?€ ì§„ë™ ?¨í„´???¸ë¦¬ê±°í•©?ˆë‹¤.
 */
export const triggerVibration = (pattern: number | number[]) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.warn('[Haptic] Failed to trigger vibration:', error);
  }
};
