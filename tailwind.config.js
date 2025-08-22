/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#181818",
        panel: "#212121",
        ink: "#e6e6e6",
        muted: "#a3a3a3",
        line: "#2c2c2c",
        accent: "#3b82f6",
      }
    },
  },
  plugins: [],
}
