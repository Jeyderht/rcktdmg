import Link from "next/link";
import { ArrowRight, Briefcase, Layers, Library, Share2 } from "lucide-react";

/**
 * "Más diseños para tu negocio".
 *
 * Separa conceptualmente los cuatro caminos que ya existen en
 * el catálogo. Cada uno lleva a una ruta real con su filtro;
 * NO se crea ninguna categoría nueva ni se convierte una
 * categoría en producto.
 *
 * Los recuentos son reales y llegan del servidor. Un camino
 * sin nada detrás no se pinta: enviar a alguien a una lista
 * vacía es peor que no ofrecerle el enlace.
 */

export type ConteosDisenos = {
  colecciones: number;
  corporativos: number;
  socialMedia: number;
  packs: number;
};

export default function MasDisenos({
  conteos,
}: {
  conteos: ConteosDisenos;
}) {
  const CAMINOS = [
    {
      titulo: "Colecciones",
      texto: "Conjuntos completos de una temática, por un precio único.",
      href: "/colecciones-comerciales",
      icono: Library,
      cuantos: conteos.colecciones,
      unidad: ["colección", "colecciones"],
    },
    {
      titulo: "General",
      texto: "Piezas para comunicar con una marca detrás.",
      href: "/tienda?categoria=corporativos",
      icono: Briefcase,
      cuantos: conteos.corporativos,
      unidad: ["recurso", "recursos"],
    },
    {
      titulo: "Social media",
      texto: "Publicaciones, historias y plantillas para redes.",
      href: "/tienda?categoria=social-media",
      icono: Share2,
      cuantos: conteos.socialMedia,
      unidad: ["recurso", "recursos"],
    },
    {
      titulo: "Packs",
      texto: "Varios recursos agrupados, más baratos que por separado.",
      href: "/packs",
      icono: Layers,
      cuantos: conteos.packs,
      unidad: ["pack", "packs"],
    },
  ];

  /*
    Los caminos se enseñan TODOS, tengan contenido o no.

    Antes se filtraban los vacíos y, si se vaciaban todos, la
    sección entera desaparecía. El efecto era que alguien podía
    concluir que RcktX no vende colecciones, cuando lo que
    pasa es que aún no hay ninguna publicada. Un camino sin
    contenido lo dice y sigue llevando a su sección, que es
    donde aparecerá lo que se publique.
  */

  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up max-w-2xl">
          <p className="rk-kicker">Para tu negocio</p>

          <h2 className="rk-title mt-3 text-[1.75rem] sm:text-4xl">
            Más diseños para tu negocio
          </h2>

          <p className="mt-3 text-[15px] leading-7 text-ink/60">
            Cuatro maneras de encontrar lo que necesitas, según cómo
            prefieras buscarlo.
          </p>
        </div>

        <div className="rk-fade-up rk-enter-1 mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAMINOS.map(({ titulo, texto, href, icono: Icono, cuantos, unidad }) => (
            <Link
              key={href}
              href={href}
              className="rk-press group rk-tile flex min-h-[10rem] flex-col justify-between p-5"
            >
              <Icono
                size={22}
                aria-hidden
                strokeWidth={1.5}
                className="text-ink/45 transition-colors group-hover:text-ink"
              />

              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight">
                  {titulo}

                  <ArrowRight
                    size={15}
                    aria-hidden
                    className="shrink-0 transition-transform duration-normal ease-rk group-hover:translate-x-1"
                  />
                </h3>

                <p className="mt-1 text-[13px] leading-6 text-ink/60">
                  {texto}
                </p>

                <p className="mt-2 text-[12px] tabular-nums text-ink/45">
                  {cuantos > 0
                    ? `${cuantos} ${cuantos === 1 ? unidad[0] : unidad[1]}`
                    : "Próximamente"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
