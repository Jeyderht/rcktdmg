import {
  Image as ImageIcon,
  Layers,
  PenTool,
  Share2,
  Sparkles,
  Type,
  Video,
  Wand2,
} from "lucide-react";

/**
 * Ecosistema creativo.
 *
 * Composición radial: RCKTDMG en el centro y alrededor las
 * disciplinas que cubre el catálogo.
 *
 * SOBRE QUÉ AFIRMA
 *
 * Son campos del diseño, no integraciones. No se nombra
 * ninguna herramienta externa ni se insinúa que RCKTDMG se
 * conecte con nadie: eso sería anunciar algo que no existe.
 *
 * SOBRE CÓMO ESTÁ HECHO
 *
 * Server Component: es contenido fijo, sin estado. Las líneas
 * son un SVG detrás; los nodos, elementos posicionados. En
 * escritorio el círculo completo; en tablet se reduce; en
 * móvil se abandona la forma radial y queda una rejilla, que
 * es la única manera de que ocho etiquetas se lean a 375px.
 */

const NODOS = [
  { etiqueta: "Diseño gráfico", icono: PenTool },
  { etiqueta: "Ilustración", icono: Wand2 },
  { etiqueta: "Edición de imagen", icono: ImageIcon },
  { etiqueta: "Video", icono: Video },
  { etiqueta: "IA creativa", icono: Sparkles },
  { etiqueta: "Tipografía", icono: Type },
  { etiqueta: "Social media", icono: Share2 },
  { etiqueta: "Recursos", icono: Layers },
] as const;

/* Posición de cada nodo sobre el círculo, en porcentaje. */
const POSICIONES = NODOS.map((_, i) => {
  const angulo = (i / NODOS.length) * Math.PI * 2 - Math.PI / 2;

  return {
    x: 50 + Math.cos(angulo) * 38,
    y: 50 + Math.sin(angulo) * 38,
  };
});

export default function Ecosistema() {
  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up mx-auto max-w-2xl text-center">
          <p className="rk-kicker justify-center">El sitio</p>

          <h2 className="rk-title mt-3 text-[1.75rem] sm:text-4xl">
            Ecosistema creativo RCKTDMG
          </h2>

          <p className="mt-3 text-[15px] leading-7 text-ink/60">
            Todo lo que rodea a una pieza terminada, en un mismo sitio.
          </p>
        </div>

        {/* ══════════ RADIAL · desde 640px ══════════ */}
        <div className="rk-fade-up rk-enter-1 mt-10 hidden sm:block">
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            {/* LÍNEAS */}
            <svg
              aria-hidden
              viewBox="0 0 100 100"
              className="absolute inset-0 h-full w-full"
            >
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="rgb(var(--rk-border) / 0.25)"
                strokeWidth="0.25"
              />

              {POSICIONES.map((p, i) => (
                <line
                  key={i}
                  x1="50"
                  y1="50"
                  x2={p.x}
                  y2={p.y}
                  stroke="rgb(var(--rk-border) / 0.3)"
                  strokeWidth="0.2"
                />
              ))}
            </svg>

            {/* NÚCLEO */}
            <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full rk-nucleo sm:h-32 sm:w-32">
              <span className="text-[13px] font-bold uppercase tracking-[0.14em] sm:text-sm">
                RCKTDMG
              </span>
            </div>

            {/* NODOS */}
            {NODOS.map(({ etiqueta, icono: Icono }, i) => (
              <div
                key={etiqueta}
                className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 text-center sm:w-28"
                style={{
                  left: `${POSICIONES[i].x}%`,
                  top: `${POSICIONES[i].y}%`,
                }}
              >
                <span className="rk-tile grid h-11 w-11 place-items-center rounded-full">
                  <Icono
                    size={17}
                    aria-hidden
                    strokeWidth={1.6}
                    className="text-ink/60"
                  />
                </span>

                <span className="text-[11px] font-medium leading-tight text-ink/65 sm:text-[12px]">
                  {etiqueta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ REJILLA · hasta 640px ══════════ */}
        <div className="rk-fade-up rk-enter-1 mt-9 sm:hidden">
          <div className="rk-nucleo mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em]">
              RCKTDMG
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-2.5">
            {NODOS.map(({ etiqueta, icono: Icono }) => (
              <li
                key={etiqueta}
                className="rk-tile flex min-h-[3.25rem] items-center gap-2.5 rounded-rk-md px-3 py-2.5"
              >
                <Icono
                  size={16}
                  aria-hidden
                  strokeWidth={1.6}
                  className="shrink-0 text-ink/55"
                />

                <span className="text-[12px] font-medium leading-tight text-ink/70">
                  {etiqueta}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
