import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import RielCaminos from "@/components/home/RielCaminos";

/**
 * "Más diseños para tu negocio".
 *
 * Separa conceptualmente los cuatro caminos que ya existen en
 * el catálogo. Cada uno lleva a una ruta real con su filtro;
 * NO se crea ninguna categoría nueva ni se convierte una
 * categoría en producto.
 *
 * Se enseñan los cuatro siempre: un camino sin contenido sigue
 * llevando a su sección, que es donde aparecerá lo que se
 * publique. Van en un riel que avanza solo (RielCaminos), con
 * tarjetas de marca como el CTA del pie (BB7 en globals.css).
 */

const CAMINOS = [
  {
    titulo: "Colecciones",
    texto: "Conjuntos completos de una temática, por un precio único.",
    href: "/colecciones-comerciales",
  },
  {
    titulo: "General",
    texto: "Piezas para comunicar con una marca detrás.",
    href: "/tienda?categoria=corporativos",
  },
  {
    titulo: "Social media",
    texto: "Publicaciones, historias y plantillas para redes.",
    href: "/tienda?categoria=social-media",
  },
  {
    titulo: "Packs",
    texto: "Varios recursos agrupados, más baratos que por separado.",
    href: "/packs",
  },
];

export default function MasDisenos() {
  return (
    <section>
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-fade-up max-w-2xl">
          <h2 className="rk-title text-[1.75rem] sm:text-4xl">
            Más diseños para tu negocio
          </h2>

          <p className="mt-3 text-[15px] leading-7 text-ink/60">
            Cuatro maneras de encontrar lo que necesitas, según cómo
            prefieras buscarlo.
          </p>
        </div>

        <RielCaminos>
          {CAMINOS.map(({ titulo, texto, href }, indice) => (
            <li key={href} className="snap-start shrink-0">
              <Link
                href={href}
                className={`rk-camino rk-camino-${indice + 1} rk-press group`}
              >
                <Image
                  src="/marketing/cohete.svg"
                  alt=""
                  aria-hidden
                  width={260}
                  height={260}
                  unoptimized
                  className="rk-camino-cohete"
                />

                <span aria-hidden className="rk-camino-brillo" />

                <div className="rk-camino-txt">
                  <h3 className="rk-camino-t">{titulo}</h3>

                  <p className="rk-camino-x">{texto}</p>

                  <span className="rk-camino-pill">
                    Explorar
                    <ArrowRight size={14} aria-hidden />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </RielCaminos>
      </div>
    </section>
  );
}
