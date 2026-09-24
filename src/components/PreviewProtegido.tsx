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
 * `contener` decide si la imagen se enseña ENTERA dentro del
 * marco (object-contain) o si lo rellena recortando
 * (object-cover). Nunca se estira.
 *
 * El contenedor DEBE tener tamaño propio: la imagen usa
 * `fill` y sin altura en el padre se pinta a 0 × 0.
 */
export default function PreviewProtegido({
  src,
  alt,
  sizes,
  priority = false,
  contener = false,
  className = "",
  esquina = "abajo-derecha",
}: {
  src: string;
  alt: string;
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

  return (
    <>
      {/*
        SIEMPRE `fill`, y el recorte lo decide `contener`.

        Antes había una segunda rama que usaba `width`/`height`
        cuando se conocían las dimensiones. El problema estaba
        en el caso contrario: sin dimensiones se caía a `fill`,
        y si el contenedor no tenía altura propia la imagen se
        pintaba a 0 × 0 —cargada, pero invisible—. Eso es lo que
        dejaba las stories en negro.

        Con una sola rama la regla es clara: quien monta este
        componente da un contenedor con tamaño. Ya no hay un
        camino que funcione y otro que no según qué datos haya
        en la base.
      */}
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`${contener ? "object-contain" : "object-cover"} ${className}`}
      />

      {/*
        La marca va en un span aparte y no dentro de la imagen:
        así no participa del recorte ni se deforma con ella.
        `aria-hidden` porque no aporta nada a quien usa lector
        de pantalla; el alt ya dice qué es la imagen.

        Los colores NO usan los tokens del tema. La marca va
        siempre sobre una imagen, que es igual en claro y en
        oscuro; con `text-surface` acababa siendo texto casi
        negro sobre una pastilla oscura en tema oscuro, o sea
        invisible. Blanco sobre negro translúcido, siempre.
      */}
      <span
        aria-hidden
        className={`pointer-events-none absolute ${posicion} select-none rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-[2px] sm:text-[10px]`}
      >
        RCKTDMG
      </span>
    </>
  );
}
