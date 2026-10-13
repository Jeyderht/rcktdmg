"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "rcktdmg-theme";

/**
 * Script que se ejecuta ANTES del primer pintado para aplicar
 * el tema guardado. Sin esto, la página parpadearía en claro
 * antes de pasar a oscuro.
 *
 * Se inyecta como string en <head> desde el layout.
 */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var pref = stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = pref === "system" ? (systemDark ? "dark" : "light") : pref;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

type ThemeContextValue = {
  /** Lo que el usuario eligió: light, dark o system. */
  preference: ThemePreference;
  /** El tema realmente aplicado: light o dark. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** true cuando ya se leyó la preferencia en el cliente. */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>("system");

  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [ready, setReady] = useState(false);

  // Lee la preferencia guardada al montar.
  useEffect(() => {
    let stored: string | null = null;

    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }

    const initial: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    setPreferenceState(initial);
    setResolved(resolveTheme(initial));
    setReady(true);
  }, []);

  // Si la preferencia es "system", sigue los cambios del SO.
  useEffect(() => {
    if (preference !== "system") {
      return;
    }

    const query = window.matchMedia("(prefers-color-scheme: dark)");

    function onChange(event: MediaQueryListEvent) {
      const next: ResolvedTheme = event.matches ? "dark" : "light";

      setResolved(next);
      applyTheme(next);
    }

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  // Aplica el tema resuelto al documento.
  useEffect(() => {
    if (!ready) {
      return;
    }

    applyTheme(resolved);
  }, [resolved, ready]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);

      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Modo privado o almacenamiento bloqueado: el tema
        // sigue funcionando en esta sesión.
      }

      const nextResolved = resolveTheme(next);

      setResolved(nextResolved);
      applyTheme(nextResolved);
    },
    []
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference, ready }),
    [preference, resolved, setPreference, ready]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme debe usarse dentro de <ThemeProvider>."
    );
  }

  return context;
}
