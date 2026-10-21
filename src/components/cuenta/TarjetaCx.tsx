import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Tarjeta de imagen de los inicios (rk-cx-card): portada grande
 * 16/11, título, línea de metadatos y pie con una acción.
 *
 * Portada y título forman un solo enlace (al destino de siempre);
 * la acción del pie va aparte, así nunca hay un enlace dentro de
 * otro. «Vista rápida» es solo un rótulo visual al pasar o enfocar:
 * el clic sigue llevando al mismo `href`.
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
}) {
  return (
    <article className="rk-cx-card">
      <Link href={href} className="rk-cx-card-enlace">
        <span className="rk-cx-im">
          {imagen ? (
            <Image
              src={imagen}
              alt={alt}
              fill
              className="object-cover"
              sizes="(max-width: 1000px) 50vw, 25vw"
            />
          ) : (
            <span className="rk-cx-im-vacia" aria-hidden>
              RcktX
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
