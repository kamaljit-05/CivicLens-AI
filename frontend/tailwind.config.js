/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10233F',       // primary dark surface / headers
        blueprint: '#2C5FA8', // primary interactive accent
        signal: '#E8A33D',    // secondary accent / pending status
        concrete: '#6B7280',  // secondary text, borders
        paper: '#F8F6F1',     // warm off-white background
        approved: '#2F7D5C',  // approved status green
        rejected: '#C1432E',  // rejected/urgent status red
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
