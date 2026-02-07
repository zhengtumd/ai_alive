/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 末日科幻主题色
        apocalypse: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        cyberpunk: {
          50: '#fef7ff',
          100: '#fcefff',
          200: '#f8d7fe',
          300: '#f3b0fd',
          400: '#ea8afb',
          500: '#dd58f8',
          600: '#c93de6',
          700: '#a52ec1',
          800: '#86279e',
          900: '#6f217f',
        },
        wasteland: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        }
      },
      fontFamily: {
        'cyber': ['Orbitron', 'monospace'],
        'tech': ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'hologram': 'hologram 4s ease-in-out infinite',
        'data-stream': 'data-stream 6s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'hologram': {
          '0%, 100%': { opacity: '0.8', filter: 'hue-rotate(0deg)' },
          '50%': { opacity: '1', filter: 'hue-rotate(180deg)' },
        },
        'data-stream': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      backgroundImage: {
        'circuit-pattern': 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
        'grid-pattern': 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}