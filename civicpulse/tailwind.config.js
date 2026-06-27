/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        civic: {
          blue: '#1E3A5F',
          green: '#2ECC71',
          amber: '#F39C12',
          light: '#EBF4FF',
          muted: '#64748B',
        },
      },
    },
  },
  plugins: [],
}
