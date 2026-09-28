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
  const { preference, setPreference, ready } = useTheme();

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

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className="flex items-center gap-0.5 rounded-full border border-line/10 bg-ink/[0.04] p-0.5"
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
            aria-label={`Tema ${option.label.toLowerCase()}`}
            title={option.label}
            onClick={() => setPreference(option.value)}
            /*
              El botón sigue midiendo 32 px a la vista; el área
              que responde al dedo llega a 44 de alto. No se
              ensancha porque los tres segmentos están pegados
              y se robarían las pulsaciones entre ellos.
            */
            className={`rk-press rk-hit-44-y flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              active
                ? "bg-surface text-foreground shadow-rk-sm"
                : "text-muted/50 hover:text-foreground"
            }`}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
