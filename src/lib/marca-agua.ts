/**
 * Copia pública de una imagen de recurso, con la marca de agua
 * dentro de los píxeles.
 *
 * La marca va en la imagen que se sirve y no en una capa de CSS
 * o HTML: lo que se descarga desde la tienda —con «Guardar
 * imagen», desde el código de la página o desde la URL— ya la
 * lleva. El original queda en el almacén privado y solo lo ven
 * quien compró el recurso, su creador y la administración.
 *
 * El diseño es una sola marca centrada, no un patrón repetido:
 *
 *   - Dos líneas blancas en X, de esquina a esquina, que se
 *     cortan en el borde del círculo. Líneas y aro tienen el
 *     mismo grosor: se leen como un solo trazo.
 *   - Un círculo en el centro con su aro: dentro, la propia imagen
 *     desenfocada, sin velo.
 *   - Líneas y aro al 14 % de opacidad; el isotipo en blanco,
 *     centrado, al 30 %. Sin sombras, brillos ni degradados.
 *
 * Todas las medidas son proporciones del ancho de la copia, así
 * que la marca se ve igual en un flyer vertical que en uno
 * cuadrado.
 *
 * Solo se usa en el servidor: sharp lleva binarios nativos.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp, { type Metadata, type OutputInfo } from "sharp";

/** Ancho máximo de la copia pública; las más pequeñas no se agrandan. */
export const ANCHO_COPIA = 1080;

const CALIDAD_JPEG = 72;

/*
  Tope de píxeles de la imagen de entrada. Un PNG gigante se
  descomprime entero en memoria antes de reducirse; con esto
  sharp lo rechaza en vez de agotar la memoria de la función.
  60 megapíxeles sobran para cualquier flyer real (8000 × 7500).
*/
const MAX_PIXELES_ENTRADA = 60_000_000;

/* Proporciones del diseño aprobado, sobre el ancho de la copia. */
const MARCA = {
  /** Grosor del trazo: líneas en X y aro, el mismo. */
  trazo: 0.007,
  trazoMinimo: 1,
  /** Diámetro del círculo central. */
  circulo: 0.26,
  /** Desenfoque gaussiano de la imagen dentro del círculo (sigma). */
  desenfoque: 0.01,
  /** Opacidad del trazo (líneas y aro). */
  opacidadTrazo: 0.14,
  /** Isotipo: tamaño sobre el diámetro del círculo y opacidad. */
  isotipo: 0.48,
  opacidadIsotipo: 0.3,
} as const;

/**
 * La imagen no se puede convertir: es demasiado grande o no es
 * una imagen legible. Su mensaje está pensado para enseñarlo tal
 * cual a quien la subió.
 */
export class ImagenNoProcesable extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ImagenNoProcesable";
  }
}

const MENSAJE_GRANDE =
  "La imagen es demasiado grande: como máximo 60 megapíxeles (por ejemplo, 6000 × 10000 px).";
const MENSAJE_ILEGIBLE =
  "No se pudo leer la imagen. Usa un archivo JPG, PNG o WEBP válido.";

let isotipo: Promise<string> | null = null;

/** Isotipo blanco en PNG, como data URI para el SVG de la marca. */
function isotipoBase64() {
  isotipo ??= readFile(
    path.join(process.cwd(), "public", "marca-agua", "isotipo.png")
  ).then((png) => `data:image/png;base64,${png.toString("base64")}`);

  return isotipo;
}

export type CopiaConMarca = {
  data: Buffer;
  width: number;
  height: number;
  contentType: "image/jpeg";
};

/**
 * Genera la copia pública con marca de una imagen.
 *
 * Sale en JPEG (calidad 72), con la orientación ya aplicada,
 * sin metadatos (sharp no copia EXIF si no se le pide) y con
 * las transparencias sobre blanco. JPEG y no WebP porque esta
 * copia también es la og:image, y no todas las redes leen WebP.
 *
 * Lanza ImagenNoProcesable si la imagen supera el tope de
 * píxeles o no se puede leer.
 */
export async function generarCopiaConMarca(
  original: Buffer
): Promise<CopiaConMarca> {
  // 0. Solo la cabecera, sin descomprimir: tamaño y formato legibles.
  let medida: Metadata;

  try {
    medida = await sharp(original).metadata();
  } catch {
    throw new ImagenNoProcesable(MENSAJE_ILEGIBLE);
  }

  if (!medida.width || !medida.height) {
    throw new ImagenNoProcesable(MENSAJE_ILEGIBLE);
  }

  if (medida.width * medida.height > MAX_PIXELES_ENTRADA) {
    throw new ImagenNoProcesable(MENSAJE_GRANDE);
  }

  // 1. Base: girada según su EXIF, a lo sumo ANCHO_COPIA de ancho.
  let base: Buffer;
  let info: OutputInfo;

  try {
    ({ data: base, info } = await sharp(original, {
      // Respaldo del tope: si la cabecera mintiera, sharp se niega.
      limitInputPixels: MAX_PIXELES_ENTRADA,
    })
      .rotate()
      .resize({ width: ANCHO_COPIA, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .toColourspace("srgb")
      .png()
      .toBuffer({ resolveWithObject: true }));
  } catch (error) {
    throw new ImagenNoProcesable(
      error instanceof Error && /pixel limit/i.test(error.message)
        ? MENSAJE_GRANDE
        : MENSAJE_ILEGIBLE
    );
  }

  const ancho = info.width;
  const alto = info.height;

  const trazo = Math.max(MARCA.trazoMinimo, ancho * MARCA.trazo);

  // En una imagen muy apaisada el círculo no puede ser más alto que ella.
  const diametro = Math.round(
    Math.min(ancho * MARCA.circulo, alto - 2 * trazo)
  );
  const radio = diametro / 2;
  const cx = ancho / 2;
  const cy = alto / 2;
  const izquierda = Math.round(cx - radio);
  const arriba = Math.round(cy - radio);

  // 2. Disco: la propia imagen desenfocada, recortada en círculo.
  const mascaraCirculo = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${diametro}" height="${diametro}">` +
      `<circle cx="${radio}" cy="${radio}" r="${radio}" fill="#fff"/></svg>`
  );

  const disco = await sharp(base)
    .extract({ left: izquierda, top: arriba, width: diametro, height: diametro })
    .blur(Math.max(0.3, ancho * MARCA.desenfoque))
    .composite([{ input: mascaraCirculo, blend: "dest-in" }])
    .png()
    .toBuffer();

  // 3. Líneas y aro al 14 %, e isotipo al 30 %: solo blanco.
  const lado = diametro * MARCA.isotipo;

  const marca = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">` +
      "<defs>" +
      // Las líneas se cortan en el borde exterior del círculo.
      `<mask id="fuera" maskUnits="userSpaceOnUse" x="0" y="0" width="${ancho}" height="${alto}">` +
      `<rect width="${ancho}" height="${alto}" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${radio}" fill="#000"/>` +
      "</mask>" +
      "</defs>" +
      // Líneas y aro en un solo grupo: donde se tocan no se suma.
      `<g opacity="${MARCA.opacidadTrazo}">` +
      `<g mask="url(#fuera)" stroke="#fff" stroke-width="${trazo}">` +
      `<line x1="0" y1="0" x2="${ancho}" y2="${alto}"/>` +
      `<line x1="${ancho}" y1="0" x2="0" y2="${alto}"/>` +
      "</g>" +
      // El aro, por dentro del círculo: su borde exterior es donde se cortan las líneas.
      `<circle cx="${cx}" cy="${cy}" r="${radio - trazo / 2}" fill="none" stroke="#fff" stroke-width="${trazo}"/>` +
      "</g>" +
      `<image opacity="${MARCA.opacidadIsotipo}" href="${await isotipoBase64()}" x="${cx - lado / 2}" y="${cy - lado / 2}" width="${lado}" height="${lado}"/>` +
      "</svg>"
  );

  // 4. Todo junto, en JPEG y sin metadatos.
  const data = await sharp(base)
    .composite([
      { input: disco, left: izquierda, top: arriba },
      { input: marca, left: 0, top: 0 },
    ])
    .jpeg({ quality: CALIDAD_JPEG, mozjpeg: true })
    .toBuffer();

  return { data, width: ancho, height: alto, contentType: "image/jpeg" };
}
