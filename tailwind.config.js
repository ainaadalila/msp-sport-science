/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F56A00',
          dark: '#D45A00',
          tint: 'rgba(245,106,0,0.12)',
        },
        success: '#3A9E6A',
        danger: '#D44040',
        info: '#3A7EC8',
        muted: '#888888',
        medium: '#444444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
