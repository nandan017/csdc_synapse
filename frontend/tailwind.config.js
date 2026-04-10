/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        acid:    '#CFFF00',
        'acid-dim': '#a8cc00',
        dark:    '#0a0a0a',
        panel:   '#111111',
        panel2:  '#161616',
        border:  '#222222',
        border2: '#2a2a2a',
        muted:   '#555555',
        'text-dim': '#888888',
      },
      fontFamily: {
        syne:  ['Syne', 'sans-serif'],
        sans:  ['DM Sans', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
