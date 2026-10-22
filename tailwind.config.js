/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          900: '#06130e',
          800: '#0b231a',
          700: '#113527',
          600: '#174735',
          border: '#1f5540'
        },
        gold: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04'
        }
      }
    },
  },
  plugins: [],
}