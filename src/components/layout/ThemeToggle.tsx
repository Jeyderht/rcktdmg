"use client";

import { KeyboardEvent } from "react";
import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/layout/ThemeProvider";

/**
 * Selector de tema: el mismo sol / luna en todo el sitio.
 *
 * Un círculo se desliza bajo el tema activo; su posición sale de
 * data-theme en el CSS (rk-theme-toggle), así que no parpadea al
 * cargar. Es un grupo de radios: Tab entra en el activo y las
 * flechas cambian de tema.
 *
 * - `compacto`: 36 px de alto, para las barras.
 * - `conSistema`: añade debajo «Usar el del dispositivo», que
 *   vuelve a seguir el tema del sistema. Solo en ajustes: es la
 *   tercera opción que tenía el selector de la cuenta.
 */
export default function ThemeToggle({
  compacto = false,
  conSistema = false,
}: {
  compacto?: boolean;
  conSistema?: boolean;
}) {
  const { preference, resolved, setPreference } = useTheme();

  const oscuro = resolved === "dark";

  function alTeclear(evento: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(evento.key)) return;

    evento.preventDefault();
    setPreference(oscuro ? "light" : "dark");

    const otro = evento.currentTarget.querySelector<HTMLButtonElement>(
      `[data-tema="${oscuro ? "light" : "dark"}"]`
    );
    otro?.focus();
  }

  const selector = (
    <div
      role="radiogroup"
      aria-label="Tema"
      onKeyDown={alTeclear}
      className={`rk-theme-toggle ${compacto ? "rk-theme-toggle-sm" : ""}`}
    >
      <span className="rk-theme-toggle-knob" aria-hidden="true" />

      <button
        type="button"
        role="radio"
        aria-checked={!oscuro}
        aria-label="Claro"
        tabIndex={oscuro ? -1 : 0}
        data-tema="light"
        onClick={() => setPreference("light")}
        className="rk-theme-toggle-opcion"
      >
        <Sun className="rk-theme-toggle-sun" aria-hidden="true" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={oscuro}
        aria-label="Oscuro"
        tabIndex={oscuro ? 0 : -1}
        data-tema="dark"
        onClick={() => setPreference("dark")}
        className="rk-theme-toggle-opcion"
      >
        <Moon className="rk-theme-toggle-moon" aria-hidden="true" />
      </button>
    </div>
  );

  if (!conSistema) return selector;

  return (
    <div className="flex flex-col items-end gap-2">
      {selector}

      <button
        type="button"
        aria-pressed={preference === "system"}
        onClick={() => setPreference("system")}
        className="rk-theme-sistema"
      >
        Usar el del dispositivo
      </button>
    </div>
  );
}
