"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import {
  ThemePreference,
  useTheme,
} from "@/components/ThemeProvider";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * Selector de tema: claro, oscuro y sistema.
 *
 * `variant="compact"` muestra un grupo segmentado de iconos
 * para el Navbar; `variant="full"` añade las etiquetas y se
 * usa en menús y páginas de cuenta.
 */
export default function ThemeToggle({
  variant = "compact",
}: {
  variant?: "compact" | "full";
}) {
  const { preference, resolved, setPreference, ready } = useTheme();

  if (variant === "full") {
    return (
      <div
        role="radiogroup"
        aria-label="Tema de la interfaz"
        className="grid grid-cols-3 gap-1.5 rounded-rk-md border border-line/10 bg-ink/[0.04] p-1.5"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = ready && preference === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPreference(option.value)}
              className={`rk-press flex flex-col items-center gap-1.5 rounded-rk-sm px-2 py-3 text-xs font-medium transition-colors ${
                active
                  ? "bg-surface text-foreground shadow-rk-sm"
                  : "text-muted/55 hover:text-foreground"
              }`}
            >
              <Icon size={17} />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  /*
    Compacto: interruptor sol / luna (rk-theme-toggle). El círculo
    se coloca solo según data-theme; aquí solo se cambia el tema.
    La opción "sistema" sigue en la variante completa.
  */
  const oscuro = resolved === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      aria-label="Modo oscuro"
      onClick={() => setPreference(oscuro ? "light" : "dark")}
      className="rk-theme-toggle rk-theme-toggle-sm"
    >
      <span className="rk-theme-toggle-knob" aria-hidden="true" />
      <Sun className="rk-theme-toggle-sun" aria-hidden="true" />
      <Moon className="rk-theme-toggle-moon" aria-hidden="true" />
    </button>
  );
}
