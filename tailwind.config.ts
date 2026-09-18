import type { Config } from "tailwindcss";

/** Token de color en formato "R G B" con soporte de opacidad. */
const token = (name: string) => `rgb(var(--rk-${name}) / <alpha-value>)`;

const config: Config = {
  // El tema se controla con [data-theme] en <html>, no con
  // la media query: así funcionan light, dark y system.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
      },

      colors: {
        background: token("background"),
        surface: token("surface"),
        elevated: token("surface-elevated"),
        card: token("card"),
        line: token("border"),
        muted: token("muted"),
        ink: token("ink"),
        foreground: token("foreground"),
        primary: token("primary"),
        onprimary: token("on-primary"),
        accent: token("accent"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
      },

      // Bordes muy redondeados, escala propia.
      borderRadius: {
        xl2: "1.25rem",
        "2xl2": "1.5rem",
        "3xl2": "1.75rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      boxShadow: {
        rk: "var(--rk-shadow)",
        "rk-sm": "var(--rk-shadow-sm)",
        "rk-lg": "var(--rk-shadow-lg)",
        "rk-float": "var(--rk-shadow-float)",
      },

      transitionTimingFunction: {
        rk: "cubic-bezier(0.32, 0.72, 0, 1)",
      },

      aspectRatio: {
        product: "9 / 16",
      },

      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },

      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.32,0.72,0,1) both",
        "scale-in": "scale-in 0.35s cubic-bezier(0.32,0.72,0,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
