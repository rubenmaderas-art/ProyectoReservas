/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#E5007D',
        'secondary': '#333333ff',
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
