/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Christmas Dark Casino Theme
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        dark: {
          50: '#18181b',
          100: '#27272a',
          200: '#3f3f46',
          300: '#52525b',
          400: '#71717a',
          500: '#a1a1aa',
          600: '#d4d4d8',
          700: '#e4e4e7',
          800: '#f4f4f5',
          900: '#fafafa',
        },

        // V2 Soft Obsidian Theme
        obsidian: {
          bg: '#121214',      // Deep Calm Background
          surface: '#18181b', // Card/Container
          border: 'rgba(255, 255, 255, 0.06)', // Subtle Border
          text: '#e4e4e7',    // Zinc-200 (Eye Comfort)
          muted: '#a1a1aa',   // Zinc-400
          accent: '#10b981',  // Emerald (Trust)
          warning: '#f59e0b', // Gold (Caution)
        },
        // Admin Premium System (Obsidian + Indigo)
        admin: {
          bg: 'var(--admin-bg)',
          sidebar: 'var(--admin-sidebar)',
          card: 'var(--admin-card)',
          border: 'var(--admin-border)',
          hover: 'var(--admin-hover)',

          brand: 'var(--admin-brand)',
          accent: 'var(--admin-accent)',
          warning: 'var(--admin-warning)',
          danger: 'var(--admin-danger)',

          'text-primary': 'var(--admin-text-primary)',
          'text-secondary': 'var(--admin-text-secondary)',
          'text-muted': 'var(--admin-text-muted)',

          // Backward-compatible aliases used across admin UI
          'text-base': 'var(--admin-text-primary)',
          muted: 'var(--admin-text-muted)',
          success: 'var(--admin-accent)',
          info: 'var(--admin-brand)',
          input: 'var(--admin-sidebar)',
          'element-hover': 'var(--admin-hover)',
        },

        // CC palette (from design SVG)
        cc: {
          lime: '#D2FD9C',
          olive: '#394508',
          moss: '#282D1A',
          steel: '#5D5D5D',
          green: '#07AF4D',
          orange: '#F97935',
          teal: '#0AA787',
          black: '#000000',
          white: '#FFFFFF',
        },
      },
      backgroundImage: {
        'christmas-gradient': 'linear-gradient(135deg, #b91c1c 0%, #14532d 100%)',
        'gold-gradient': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'casino-dark': 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Admin Typography Scale (SoT)
        'admin-title': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        'admin-subtitle': ['1.25rem', { lineHeight: '1.75rem' }], // 20px
        'admin-body': ['1rem', { lineHeight: '1.5rem' }], // 16px
        'admin-meta': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        'admin-mono': ['0.9375rem', { lineHeight: '1.25rem' }], // 15px
      },
      borderRadius: {
        // Admin Radius Standard (SoT)
        'admin-lg': '0.5rem', // 8px
        'admin-xl': '0.75rem', // 12px
      },
      boxShadow: {
        // Admin Depth (SoT)
        'admin-card': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'admin-glow': '0 0 0 1px rgba(99, 102, 241, 0.15), 0 0 28px rgba(99, 102, 241, 0.22)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-fast': 'spin 0.3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'bounce-in': 'bounce-in 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.8s ease-out forwards',
        'spin-slow-reverse': 'spin-reverse 8s linear infinite',
        'shimmer-fast': 'shimmer 1.6s linear infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'shine': 'shine 4s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2.4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px #22c55e, 0 0 10px #22c55e' },
          '50%': { boxShadow: '0 0 20px #22c55e, 0 0 30px #22c55e' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-reverse': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'shine': {
          '0%': { transform: 'translateX(-200%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}
