import Image from "next/image";

/**
 * Imagen pública con marca de agua.
 *
 * QUÉ ES Y QUÉ NO ES
 *
 * Es una capa sobre la imagen que se MUESTRA, no una
 * modificación del archivo. El original no se toca, el archivo
 * privado no se toca, y quien compra descarga exactamente lo
 * que compró: la descarga pasa por /api/downloads/[id] y sirve
 * el archivo tal cual.
 *
 * No pretende impedir una captura de pantalla —nada en el
 * navegador puede—, sino dejar claro de dónde sale la pieza
 * cuando circula por ahí.
 *
 * DISEÑO
 *
 * Una sola marca pequeña en una esquina, en el blanco y negro
 * del sitio y con opacidad baja. Nada de mosaicos diagonales
 * que tapan el trabajo que se intenta vender: el objetivo es
 * firmar la imagen, no arruinarla.
 *
 * PROPORCIÓN
 *
 * Con `ancho` y `alto` reales la imagen se enseña ENTERA, con
 * su forma. Sin ellos se recorta al marco, que es como se
 * comportaba antes. Nunca se estira.
 */
export default function PreviewProtegido({
  src,
  alt,
  ancho,
  alto,
  sizes,
  priority = false,
  contener = false,
  className = "",
  esquina = "abajo-derecha",
}: {
  src: string;
  alt: string;
  /** Ancho real en píxeles, si se conoce. */
  ancho?: number | null;
  /** Alto real en píxeles, si se conoce. */
  alto?: number | null;
  sizes?: string;
  priority?: boolean;
  /** true para ver la imagen completa; false para recortarla al marco. */
  contener?: boolean;
  className?: string;
  esquina?: "abajo-derecha" | "abajo-izquierda" | "arriba-derecha";
}) {
  const posicion = {
    "abajo-derecha": "bottom-2 right-2",
    "abajo-izquierda": "bottom-2 left-2",
    "arriba-derecha": "top-2 right-2",
  }[esquina];

  const conMedidas = Boolean(ancho && alto);

  return (
    <>
      {conMedidas && contener ? (
        <Image
          src={src}
          alt={alt}
          width={ancho as number}
          height={alto as number}
          priority={priority}
          sizes={sizes}
          className={`h-full w-full object-contain ${className}`}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={`${contener ? "object-contain" : "object-cover"} ${className}`}
        />
      )}

      {/*
        La marca va en un span aparte y no dentro de la imagen:
        así no participa del recorte ni se deforma con ella.
        `aria-hidden` porque no aporta nada a quien usa lector
        de pantalla; el alt ya dice qué es la imagen.
      */}
      <span
        aria-hidden
        className={`pointer-events-none absolute ${posicion} select-none rounded-full bg-ink/35 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-surface/85 backdrop-blur-[2px] sm:text-[10px]`}
      >
        RCKTDMG
      </span>
    </>
  );
}
