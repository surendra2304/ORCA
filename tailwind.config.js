/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          bg: '#f0f4f5',
          card: '#e5edef',
          sub: '#c8dcdb',
          header: '#134e5e',
          primary: '#2a8a89',
          hover: '#38a3a5',
          text: '#0f2a30',
        },
      },
    },
  },
  plugins: [],
}
