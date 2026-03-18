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
        "fade-up": "fadeUp .85s ease both",
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
        dark: {
          colors: {
            primary: {
              50:  "#172554",
              100: "#1e3a8a",
              200: "#1d4ed8",
              300: "#2563eb",
              400: "#3b82f6",
              500: "#60a5fa",
              600: "#93c5fd",
              700: "#bfdbfe",
              800: "#dbeafe",
              900: "#eff6ff",
              DEFAULT: "#60a5fa",
              foreground: "#ffffff",
            },
            background: { DEFAULT: "#09090b" },
            content1:   { DEFAULT: "#18181b" },
            content2:   { DEFAULT: "#27272a" },
            content3:   { DEFAULT: "#3f3f46" },
            content4:   { DEFAULT: "#52525b" },
            foreground:  { DEFAULT: "#f4f4f5" },
            divider:     { DEFAULT: "#3f3f46" },
            default: {
              DEFAULT: "#27272a",
              foreground: "#f4f4f5",
            },
          },
        },
      },
    }),
  ],
};
