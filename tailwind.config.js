/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // This line tells Tailwind to scan all JS/JSX/TS/TSX files in your src directory
  ],
  theme: {
    extend: {}, // You can customize Tailwind's default theme here (e.g., add custom colors, fonts, spacing)
  },
  plugins: [], // You can add Tailwind plugins here
}