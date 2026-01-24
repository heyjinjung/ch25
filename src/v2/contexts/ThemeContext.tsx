import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * V2 Theme System
 *
 * 매직, 프리미엄, 기본 테마 등 다양한 테마를 동적으로 전환할 수 있는 시스템입니다.
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
  bgImage?: string;
  diceIcon?: string;
  couponImage?: string;
  particleType: 'none' | 'snow' | 'sparkle' | 'lantern';
}

export interface ThemeSounds {
  roll: string;
  win: string;
  lose: string;
  draw: string;
}

export interface ThemeAnimations {
  diceRollDuration: number;
  shakeIntensity: number;
  particleCount: number;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  assets: ThemeAssets;
  sounds: ThemeSounds;
  animations: ThemeAnimations;
}

// ============================================================================
// Default Theme
// ============================================================================

const DEFAULT_THEME: ThemeConfig = {
  name: '기본 테마',
  colors: {
    primary: '#4F46E5', // Indigo 600
    secondary: '#00D4AA',
    accent: '#FACC15',
    background: '#0A0A0A',
    text: '#FFFFFF',
    win: '#10B981',
    lose: '#EF4444',
    draw: '#FFA500',
  },
  assets: {
    diceIcon: '/assets/icon_dice_silver.png',
    particleType: 'none',
  },
  sounds: {
    roll: '/sounds/roll.mp3',
    win: '/sounds/win.mp3',
    lose: '/sounds/lose.mp3',
    draw: '/sounds/draw.mp3',
  },
  animations: {
    diceRollDuration: 2000,
    shakeIntensity: 10,
    particleCount: 50,
  },
};

// ============================================================================
// Premium Theme
// ============================================================================

const PREMIUM_THEME: ThemeConfig = {
  name: '프리미엄 골드',
  colors: {
    primary: '#D4AF37', // Gold
    secondary: '#1A1A1A',
    accent: '#FFFFFF',
    background: '#121212',
    text: '#E5C100',
    win: '#FFD700',
    lose: '#FF4444',
    draw: '#FFFFFF',
  },
  assets: {
    bgImage: '/assets/bg_premium.jpg',
    diceIcon: '/assets/icon_dice_gold.png',
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
    particleCount: 80,
  },
};

// ============================================================================
// Lunar New Year Theme (Event)
// ============================================================================

const LUNAR_NEW_YEAR_THEME: ThemeConfig = {
  name: '설날 대축제',
  colors: {
    primary: '#C41E3A', // Cardinal Red
    secondary: '#FFD700', // Gold
    accent: '#FFD700',
    background: '#1A0000',
    text: '#FFFFFF',
    win: '#FFD700',
    lose: '#4A0000',
    draw: '#FFFFFF',
  },
  assets: {
    couponImage: '/assets/coupon_lunar.png',
    particleType: 'lantern',
  },
  sounds: {
    roll: '/sounds/lunar-roll.mp3',
    win: '/sounds/lunar-win.mp3',
    lose: '/sounds/lunar-lose.mp3',
    draw: '/sounds/lunar-draw.mp3',
  },
  animations: {
    diceRollDuration: 2500,
    shakeIntensity: 15,
    particleCount: 60,
  },
};

const THEMES: Record<ThemeType, ThemeConfig> = {
  default: DEFAULT_THEME,
  'lunar-new-year': LUNAR_NEW_YEAR_THEME,
  premium: PREMIUM_THEME,
  halloween: DEFAULT_THEME, // TODO
  christmas: DEFAULT_THEME, // TODO
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
