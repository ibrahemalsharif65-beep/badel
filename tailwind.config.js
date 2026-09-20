/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0E1119',
        surface: '#161A26',
        raised: '#1D2232',
        line: '#272D40',
        ink: '#EDEFF7',
        mute: '#8E96AE',
        gold: { DEFAULT: '#FFB84A', deep: '#E99A1F', ink: '#1E1300' },
        mint: '#52D1B0',
        ps: '#5B96FF',
        xbox: '#63CC63',
        danger: '#FF6B6B',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', '"Noto Sans Arabic"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { card: '1.25rem' },
      keyframes: {
        sheetUp: { from: { transform: 'translateY(24px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'sheet-up': 'sheetUp .22s cubic-bezier(.2,.8,.2,1)',
        fade: 'fade .18s ease-out',
      },
    },
  },
  plugins: [],
}
