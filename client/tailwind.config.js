/** @type {import('tailwindcss').Config} */
export default {
  // Class-based dark mode so our no-flash inline script controls the theme by toggling
  // the `dark` class on <html>.
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      transitionProperty: {
        theme: "background-color, border-color, color, fill, stroke",
      },
    },
  },
  plugins: [],
};
