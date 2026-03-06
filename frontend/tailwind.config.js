const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#0B74E5",
          600: "#0a64c9",
          700: "#0854ac",
          800: "#06438f",
          900: "#04326e",
        },
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-up": "fadeUp .45s ease both",
        float:     "float 3s ease-in-out infinite",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              50:  "#eff6ff",
              100: "#dbeafe",
              200: "#bfdbfe",
              300: "#93c5fd",
              400: "#60a5fa",
              500: "#0B74E5",
              600: "#0a64c9",
              700: "#0854ac",
              800: "#06438f",
              900: "#04326e",
              DEFAULT: "#0B74E5",
              foreground: "#ffffff",
            },
            background: { DEFAULT: "#f6fbff" },
            content1:   { DEFAULT: "#ffffff" },
            content2:   { DEFAULT: "#f4f8ff" },
          },
        },
      },
    }),
  ],
};
