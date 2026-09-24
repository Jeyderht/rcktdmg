import Link from "next/link";
import { ArrowRight, CalendarDays, Shapes } from "lucide-react";

/**
 * "¿Qué estás buscando?"
 *
 * Dos caminos, no dos pestañas: cada uno lleva a un listado
 * que ya existe, con su URL propia, así que se puede enlazar,
 * compartir y volver atrás. Convertirlo en pestañas habría
 * escondido ese contenido detrás de un estado del navegador.
 *
 * Los destinos son rutas reales de la tienda; no se crea
 * ninguna sección nueva ni se toca el catálogo.
 */

const OPCIONES = [
  {
    titulo: "Flyers de eventos",
    texto:
      "Fiestas, conciertos y fechas señaladas. Listos para publicar.",
    href: "/tienda?categoria=eventos",
    icono: CalendarDays,
  },
  {
    titulo: "Diseños generales",
    texto:
      "Corporativos, social media, plantillas y colecciones completas.",
    href: "/tienda",
    icono: Shapes,
  },
] as const;

export default function SelectorBusqueda() {
  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-16">
        <h2 className="rk-title text-center text-[1.75rem] sm:text-4xl">
          ¿Qué estás buscando?
        </h2>

        <div className="rk-fade-up mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
          {OPCIONES.map(({ titulo, texto, href, icono: Icono }) => (
            <Link
              key={href}
              href={href}
              className="rk-press group rk-tile flex min-h-[9rem] flex-col justify-between rounded-rk-lg p-6 transition-colors duration-normal ease-rk hover:border-ink/25 sm:min-h-[11rem] sm:p-8"
            >
              <Icono
                size={26}
                aria-hidden
                strokeWidth={1.5}
                className="text-ink/45 transition-colors group-hover:text-ink"
              />

              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
                  {titulo}

                  <ArrowRight
                    size={17}
                    aria-hidden
                    className="shrink-0 transition-transform duration-normal ease-rk group-hover:translate-x-1"
                  />
                </h3>

                <p className="mt-1.5 text-[14px] leading-6 text-ink/60">
                  {texto}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
