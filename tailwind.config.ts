import type { Config } from "tailwindcss";

/** Token de color en formato "R G B" con soporte de opacidad. */
const token = (name: string) => `rgb(var(--rk-${name}) / <alpha-value>)`;

const config: Config = {
  // El tema se controla con [data-theme] en <html>, no con
  // la media query: así funcionan light, dark y system.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],

  /*
   * El Design System debe estar SIEMPRE disponible, aunque
   * una utilidad todavía no se use en ningún componente:
   * Tailwind purga las clases de @layer components que no
   * encuentra en el contenido y el sistema quedaría a medias.
   */
  safelist: [
    "rk-btn",
    "rk-btn-primary",
    "rk-btn-secondary",
    "rk-btn-ghost",
    "rk-btn-ink",
    "rk-btn-paper",
    "rk-btn-line",
    "rk-btn-compact",
    "rk-touch",
    "rk-kicker",
    "rk-tile",
    "rk-rail",
    "rk-onyx",
    "rk-display",
    "rk-frame",
    "rk-hairline",
    "rk-btn-glass",
    "rk-btn-danger",
    "rk-btn-success",
    "rk-input",
    "rk-select",
    "rk-textarea",
    "rk-input-error",
    "rk-card",
    "rk-card-elevated",
    "rk-card-glass",
    "rk-card-hover",
    "rk-surface",
    "rk-glass",
    "rk-glass-strong",
    "rk-glass-on-image",
    "rk-float",
    "rk-badge",
    "rk-badge-accent",
    "rk-badge-neutral",
    "rk-badge-success",
    "rk-badge-warning",
    "rk-badge-danger",
    "rk-chip",
    "rk-chip-active",
    "rk-eyebrow",
    "rk-title",
    "rk-subtitle",
    "rk-muted",
    "rk-media",
    "rk-divider",
    "rk-divider-b",
    "rk-divider-y",
    "rk-press",
    "rk-press-sm",
    "rk-fade",
    "rk-fade-up",
    "rk-scale",
    "rk-enter",
    "rk-enter-1",
    "rk-enter-2",
    "rk-enter-3",
    "rk-enter-4",
    "rk-hover-lift",
    "rk-aspect-product",
    "rk-dock-pad",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        sora: ["var(--font-sora)", "system-ui", "sans-serif"],
        inter: ["var(--font-sora)", "system-ui", "sans-serif"],
      },

      /*
        La escala de Tailwind, un 12 % más compacta (xs se queda en
        11px, el mínimo). Cada line-height es el de Tailwind por
        defecto: solo baja el tamaño de la letra.
      */
      fontSize: {
        xs: ["0.6875rem", { lineHeight: "1rem" }],
        sm: ["0.77rem", { lineHeight: "1.25rem" }],
        base: ["0.88rem", { lineHeight: "1.5rem" }],
        lg: ["0.99rem", { lineHeight: "1.75rem" }],
        xl: ["1.1rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.32rem", { lineHeight: "2rem" }],
        "3xl": ["1.65rem", { lineHeight: "2.25rem" }],
        "4xl": ["1.98rem", { lineHeight: "2.5rem" }],
        "5xl": ["2.64rem", { lineHeight: "1" }],
        "6xl": ["3.3rem", { lineHeight: "1" }],
        "7xl": ["3.96rem", { lineHeight: "1" }],
        "8xl": ["5.28rem", { lineHeight: "1" }],
        "9xl": ["7.04rem", { lineHeight: "1" }],
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

        // Azul eléctrico: color de firma.
        accent: token("accent"),
        "accent-hover": token("accent-hover"),
        "accent-contrast": token("accent-contrast"),

        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        "danger-contrast": token("danger-contrast"),
      },

      // Escala de radios del Design System.
      borderRadius: {
        "rk-sm": "var(--rk-radius-sm)",
        "rk-md": "var(--rk-radius-md)",
        "rk-lg": "var(--rk-radius-lg)",
        "rk-xl": "var(--rk-radius-xl)",
        xl2: "1.25rem",
        "2xl2": "1.5rem",
        "3xl2": "1.75rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      boxShadow: {
        rk: "var(--rk-shadow)",
        "rk-sm": "var(--rk-shadow-sm)",
        "rk-md": "var(--rk-shadow)",
        "rk-lg": "var(--rk-shadow-lg)",
        "rk-float": "var(--rk-shadow-float)",
      },

      backdropBlur: {
        rk: "var(--rk-glass-blur)",
      },

      transitionDuration: {
        fast: "var(--rk-transition-fast)",
        normal: "var(--rk-transition-normal)",
        slow: "var(--rk-transition-slow)",
      },

      transitionTimingFunction: {
        rk: "cubic-bezier(0.32, 0.72, 0, 1)",
        "rk-soft": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      aspectRatio: {
        product: "9 / 16",
      },

      keyframes: {
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
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
        fade: "fade 0.28s cubic-bezier(0.32,0.72,0,1) both",
        // Entrada del sistema: 300 ms y la curva compartida.
        "fade-up": "fade-up 0.3s cubic-bezier(0.2,0.7,0.2,1) both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.2,0.7,0.2,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
