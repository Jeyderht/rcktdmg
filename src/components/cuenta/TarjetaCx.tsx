import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { medidaCx, type CategoriaRecurso } from "@/components/cuenta/medidaCx";

/**
 * Tarjeta de imagen de los inicios (rk-cx-card): portada, título,
 * línea de metadatos y pie con una acción.
 *
 * La portada se ve COMPLETA. El marco toma la proporción del recurso
 * con la misma regla que la tarjeta de la tienda (9:16 en Eventos,
 * 4:5 en Corporativos y General, o las medidas reales si las guarda)
 * y la imagen va en `contain` sobre la superficie, sin recortar el
 * flyer. Con medida libre (Social Media, Plantillas) el marco es el
 * de la propia imagen. La etiqueta «categoría · medida» va encima,
 * abajo a la izquierda.
 *
 * Portada y título forman un solo enlace (al destino de siempre);
 * la acción del pie va aparte, así nunca hay un enlace dentro de
 * otro.
 */
export default function TarjetaCx({
  href,
  imagen,
  alt,
  titulo,
  meta,
  inicial,
  pie,
  accion,
  esquina,
  categoria,
}: {
  href: string;
  imagen: string | null;
  alt: string;
  titulo: string;
  meta?: string;
  /** Letra del avatar del creador, si se conoce. */
  inicial?: string;
  pie?: ReactNode;
  accion?: ReactNode;
  /** Insignia sobre la imagen (puesto, estado…). */
  esquina?: ReactNode;
  /** Categoría del recurso: decide marco y etiqueta. */
  categoria?: CategoriaRecurso;
}) {
  const m = categoria ? medidaCx(categoria) : null;
  const libre = !m?.proporcion;

  return (
    <article className="rk-cx-card">
      <Link href={href} className="rk-cx-card-enlace">
        <span
          className={`rk-cx-im${imagen && libre ? " rk-cx-im-libre" : ""}`}
          style={m?.proporcion ? { aspectRatio: m.proporcion } : undefined}
        >
          {imagen ? (
            libre ? (
              <Image
                src={imagen}
                alt={alt}
                width={0}
                height={0}
                sizes="(max-width: 640px) 45vw, 240px"
                className="rk-cx-im-natural"
              />
            ) : (
              <Image src={imagen} alt={alt} fill className="object-contain" sizes="(max-width: 640px) 45vw, 240px" />
            )
          ) : (
            <span className="rk-cx-im-vacia" aria-hidden>
              RcktX
            </span>
          )}
          {m && (
            <span className="rk-cx-md">
              <b>{m.nombre}</b> · {m.medida}
            </span>
          )}
          {esquina}
        </span>

        <span className="rk-cx-bd">
          <b>{titulo}</b>
          {meta && (
            <span className="rk-cx-cr">
              {inicial && <i aria-hidden>{inicial}</i>}
              {meta}
            </span>
          )}
        </span>
      </Link>

      {(pie || accion) && (
        <div className="rk-cx-ft">
          <span>{pie}</span>
          {accion}
        </div>
      )}
    </article>
  );
}
