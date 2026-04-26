import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#faf5ff",
          100: "#f3ebff",
          200: "#e9d5ff",
          300: "#ddb5ff",
          400: "#d084f5",
          500: "#c967e8",
          600: "#b83dd1",
          700: "#983ad6",
          800: "#6b1db5",
          900: "#520a8a",
        },
        dark: {
          900: "#0B0F19",
          800: "#1a1f2e",
          700: "#2a3142",
          600: "#3a3f52",
        },
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, #FA93FA via-[#C967E8] to #983AD6)",
        "gradient-fade":
          "linear-gradient(to bottom, #010101, transparent, #010101)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(197, 103, 232, 0.5)",
        "glow-lg": "0 0 40px rgba(197, 103, 232, 0.3)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        slide: "slide 20s linear infinite",
        "slide-reverse": "slide-reverse 20s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        slide: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(calc(-100% - 1rem))" },
        },
        "slide-reverse": {
          "0%": { transform: "translateX(calc(-100% - 1rem))" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
