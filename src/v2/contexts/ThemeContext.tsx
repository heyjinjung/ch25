import { createContext, useContext, useState, ReactNode } from 'react';

/**
 * V2 Theme System
 *
 * ?§ÎÇ†, ?ÑÎ¶¨ÎØ∏ÏóÑ, Í∏∞Î≥∏ ?åÎßà ???§Ïñë???åÎßàÎ•??ôÏ†Å?ºÎ°ú ?ÑÌôò?????àÎäî ?úÏä§?? */

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
  name: 'Í∏∞Î≥∏ ?åÎßà',
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
  name: '?§ÎÇ† ?åÎßà',
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
    diceIcon: '/assets/icon_dice_lunar.png', // ?åÎ†à?¥Ïä§?Ä??    background: '/assets/bg_lunar_new_year.jpg', // ?åÎ†à?¥Ïä§?Ä??    particleType: 'lantern',
    couponImage: '/assets/coupon_lunar.png', // ?åÎ†à?¥Ïä§?Ä??  },
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
  name: '?ÑÎ¶¨ÎØ∏ÏóÑ ?åÎßà',
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
    diceIcon: '/assets/icon_dice_gold.png', // ?åÎ†à?¥Ïä§?Ä??    background: '/assets/bg_premium.jpg', // ?åÎ†à?¥Ïä§?Ä??    particleType: 'sparkle',
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
  halloween: DEFAULT_THEME, // TODO: ?†Î°ú???åÎßà Ï∂îÍ?
  christmas: DEFAULT_THEME, // TODO: ?¨Î¶¨?§Îßà???åÎßà Ï∂îÍ?
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
