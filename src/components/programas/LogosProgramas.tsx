/**
 * Isotipos de los programas con los que se abren los archivos.
 * Los usan el Ecosistema del inicio y las carpetas de categorías.
 */

export type Programa = "ps" | "figma" | "canva";

export const NOMBRE_PROGRAMA: Record<Programa, string> = {
  ps: "Photoshop",
  figma: "Figma",
  canva: "Canva",
};

export function LogoFigma({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 57" aria-hidden className={className}>
      <path fill="#1ABCFE" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" />
      <path fill="#0ACF83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" />
      <path fill="#FF7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" />
      <path fill="#F24E1E" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" />
      <path fill="#A259FF" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" />
    </svg>
  );
}

/** Isotipo de un programa, para meter dentro de un círculo. */
export function IsotipoPrograma({ programa }: { programa: Programa }) {
  if (programa === "figma") return <LogoFigma className="rk-prog-figma" />;

  return (
    <span className={`rk-prog-sigla is-${programa}`}>
      {programa === "ps" ? "Ps" : "Cv"}
    </span>
  );
}
