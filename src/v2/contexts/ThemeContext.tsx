import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * V2 Theme System
 *
 * 설날, 프리미엄, 기본 테마 등 다양한 테마를 동적으로 전환할 수 있는 시스템
 */

export type ThemeType = 'default' | 'lunar-new-year' | 'premium' | 'halloween' | 'christmas';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  win: string;
  lose: string;
  draw: string;
}

export interface ThemeAssets {
  diceIcon: string;
  background?: string;
  particleType: 'default' | 'fireworks' | 'lantern' | 'snow' | 'sparkle';
  couponImage?: string;
}

export interface ThemeSounds {
  roll: string;
  win: string;
  lose: string;
  draw: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  assets: ThemeAssets;
  sounds: ThemeSounds;
  animations: {
    diceRollDuration: number;
    shakeIntensity: number;
    particleCount: number;
  };
}

// ============================================================================
// Theme Configurations
// ============================================================================

const DEFAULT_THEME: ThemeConfig = {
  name: '기본 테마',
  colors: {
    primary: '#30FF75',
    secondary: '#00D4AA',
    accent: '#FFD700',
    background: '#000000',
    text: '#FFFFFF',
    win: '#30FF75',
    lose: '#FF4444',
    draw: '#FFA500',
  },
  assets: {
    diceIcon: '/assets/icon_dice_silver.png',
    particleType: 'default',
  },
  sounds: {
    roll: '/sounds/dice-roll.mp3',
    win: '/sounds/win.mp3',
    lose: '/sounds/lose.mp3',
    draw: '/sounds/draw.mp3',
  },
  animations: {
    diceRollDuration: 2000,
    shakeIntensity: 10,
    particleCount: 30,
  },
};

const LUNAR_NEW_YEAR_THEME: ThemeConfig = {
  name: '설날 테마',
  colors: {
    primary: '#FF4444',
    secondary: '#FFD700',
    accent: '#FF6B6B',
    background: '#1A0000',
    text: '#FFFFFF',
    win: '#FFD700',
    lose: '#FF4444',
    draw: '#FFA500',
  },
  assets: {
    diceIcon: '/assets/icon_dice_lunar.png', // 플레이스홀더
    background: '/assets/bg_lunar_new_year.jpg', // 플레이스홀더
    particleType: 'lantern',
    couponImage: '/assets/coupon_lunar.png', // 플레이스홀더
  },
  sounds: {
    roll: '/sounds/kkwaenggwari.mp3',
    win: '/sounds/lunar-win.mp3',
    lose: '/sounds/lunar-lose.mp3',
    draw: '/sounds/lunar-draw.mp3',
  },
  animations: {
    diceRollDuration: 2500,
    shakeIntensity: 15,
    particleCount: 50,
  },
};

const PREMIUM_THEME: ThemeConfig = {
  name: '프리미엄 테마',
  colors: {
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FFEB3B',
    background: '#0A0A0A',
    text: '#FFFFFF',
    win: '#FFD700',
    lose: '#FF6B6B',
    draw: '#00BFFF',
  },
  assets: {
    diceIcon: '/assets/icon_dice_gold.png', // 플레이스홀더
    background: '/assets/bg_premium.jpg', // 플레이스홀더
    particleType: 'sparkle',
  },
  sounds: {
    roll: '/sounds/premium-roll.mp3',
    win: '/sounds/premium-win.mp3',
    lose: '/sounds/premium-lose.mp3',
    draw: '/sounds/premium-draw.mp3',
  },
  animations: {
    diceRollDuration: 3000,
    shakeIntensity: 20,
    particleCount: 60,
  },
};

const THEMES: Record<ThemeType, ThemeConfig> = {
  default: DEFAULT_THEME,
  'lunar-new-year': LUNAR_NEW_YEAR_THEME,
  premium: PREMIUM_THEME,
  halloween: DEFAULT_THEME, // TODO: 할로윈 테마 추가
  christmas: DEFAULT_THEME, // TODO: 크리스마스 테마 추가
};

// ============================================================================
// Theme Context
// ============================================================================

interface ThemeContextType {
  theme: ThemeConfig;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeType, setThemeType] = useState<ThemeType>('default');

  const theme = THEMES[themeType];

  return (
    <ThemeContext.Provider value={{ theme, themeType, setTheme: setThemeType }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export default ThemeContext;
