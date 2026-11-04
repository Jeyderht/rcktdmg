import Image from "next/image";

/**
 * Fondo de un recurso «solo para registrados» visto sin sesión (y el
 * punto de partida de su desbloqueo ya con sesión).
 *
 * - Con miniatura: la portada reducida a 32 px y desenfocada en el
 *   servidor (miniatura-bloqueada.ts), estirada con
 *   `image-rendering: pixelated` (.rk-bloqueo-mini). Es un data URI
 *   de unos cientos de bytes; la imagen real no viaja.
 * - Sin miniatura (todavía no se generó): un degradado neutro con
 *   aspecto de desenfoque (.rk-bloqueo-fondo), en los tokens del
 *   tema. Nunca un recuadro vacío.
 *
 * Ocupa todo el marco (absolute inset-0): el padre pone la
 * proporción y el candado va encima.
 */
export default function FondoBloqueado({
  miniatura,
}: {
  miniatura: string | null;
}) {
  if (miniatura) {
    return (
      <Image
        src={miniatura}
        alt=""
        aria-hidden
        fill
        unoptimized
        className="rk-bloqueo-mini object-cover"
      />
    );
  }

  return <span className="rk-bloqueo-fondo" aria-hidden />;
}
