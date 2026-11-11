/** @type {import('tailwindcss').Config} */
const brandScale = {
  50: 'rgb(var(--brand-50) / <alpha-value>)',
  100: 'rgb(var(--brand-100) / <alpha-value>)',
  200: 'rgb(var(--brand-200) / <alpha-value>)',
  300: 'rgb(var(--brand-300) / <alpha-value>)',
  400: 'rgb(var(--brand-400) / <alpha-value>)',
  500: 'rgb(var(--brand-500) / <alpha-value>)',
  600: 'rgb(var(--brand-600) / <alpha-value>)',
  700: 'rgb(var(--brand-700) / <alpha-value>)',
  800: 'rgb(var(--brand-800) / <alpha-value>)',
  900: 'rgb(var(--brand-900) / <alpha-value>)',
  950: 'rgb(var(--brand-950) / <alpha-value>)',
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef4fb',
          100: '#d9e7f6',
          200: '#b9d2ed',
          300: '#8bb4df',
          400: '#568ecd',
          500: '#3270b8',
          600: '#24589b',
          700: '#1e477d',
          800: '#173a63',
          900: '#112c4b',
          950: '#0a1c33',
        },
        brand: brandScale,
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 28, 51, 0.04), 0 8px 24px -12px rgba(16, 28, 51, 0.12)',
        lift: '0 12px 32px -12px rgba(16, 28, 51, 0.22)',
        glow: '0 0 0 1px rgb(var(--brand-400) / 0.18), 0 18px 45px -22px rgb(var(--brand-500) / 0.65)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'page-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.995)', filter: 'blur(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -16px, 0) scale(1.04)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '35%': { transform: 'translateY(-3px) scale(1.06)' },
          '65%': { transform: 'translateY(1px) scale(0.98)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'ping-soft': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        'fade-in': 'fade-in .3s ease-out both',
        'slide-in': 'slide-in .25s ease-out both',
        'page-in': 'page-in .45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in .28s cubic-bezier(0.22, 1, 0.36, 1) both',
        'float-slow': 'float-slow 10s ease-in-out infinite',
        'bounce-soft': 'bounce-soft .45s ease',
        'gradient-pan': 'gradient-pan 9s ease infinite',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
