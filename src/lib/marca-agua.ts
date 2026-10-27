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
 *     cortan en el borde del círculo.
 *   - Un círculo en el centro con la propia imagen desenfocada
 *     detrás, el isotipo en blanco encima y un borde blanco.
 *   - Toda la parte blanca al 28 % de opacidad. Debajo, una
 *     sombra oscura propia (no comparte ese 28 %): un contorno
 *     suave que hace legible la marca sobre fondos blancos y que
 *     sobre fondos oscuros apenas se distingue del fondo.
 *
 * Todas las medidas son proporciones del ancho de la copia, así
 * que la marca se ve igual en un flyer vertical que en uno
 * cuadrado.
 *
 * Solo se usa en el servidor: sharp lleva binarios nativos.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

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
  /** Grosor de las líneas en X. */
  linea: 0.006,
  lineaMinima: 2,
  /** Diámetro del círculo central. */
  circulo: 0.26,
  /** Desenfoque gaussiano de la imagen dentro del círculo (sigma). */
  desenfoque: 0.014,
  /** Isotipo, sobre el diámetro del círculo. */
  isotipo: 0.58,
  /** Grosor del borde del círculo. */
  borde: 0.012,
  /** Opacidad de toda la parte blanca. */
  opacidad: 0.28,
  /** Sombra: cuánto se ensancha la silueta, su desenfoque y su opacidad. */
  sombraEnsanche: 0.0015,
  sombraDesenfoque: 0.003,
  sombraOpacidad: 0.4,
} as const;

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
 */
export async function generarCopiaConMarca(
  original: Buffer
): Promise<CopiaConMarca> {
  // 1. Base: girada según su EXIF, a lo sumo ANCHO_COPIA de ancho.
  const { data: base, info } = await sharp(original, {
    limitInputPixels: MAX_PIXELES_ENTRADA,
  })
    .rotate()
    .resize({ width: ANCHO_COPIA, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .png()
    .toBuffer({ resolveWithObject: true });

  const ancho = info.width;
  const alto = info.height;

  const linea = Math.max(MARCA.lineaMinima, ancho * MARCA.linea);
  const borde = Math.max(MARCA.lineaMinima, ancho * MARCA.borde);

  // En una imagen muy apaisada el círculo no puede ser más alto que ella.
  const diametro = Math.round(
    Math.min(ancho * MARCA.circulo, alto - 2 * borde)
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

  // 3. Líneas, borde e isotipo: primero su sombra, luego en blanco al 28 %.
  const lado = diametro * MARCA.isotipo;
  const ensanche = Math.max(1, ancho * MARCA.sombraEnsanche);
  const desenfoque = Math.max(1, ancho * MARCA.sombraDesenfoque);

  const marca = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">` +
      "<defs>" +
      // Las líneas se cortan en el borde exterior del círculo.
      `<mask id="fuera" maskUnits="userSpaceOnUse" x="0" y="0" width="${ancho}" height="${alto}">` +
      `<rect width="${ancho}" height="${alto}" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${radio}" fill="#000"/>` +
      "</mask>" +
      // Sombra: la silueta en negro, algo ensanchada y desenfocada, y
      // recortada por la propia silueta: queda solo como contorno, sin
      // oscurecer el blanco de las líneas, el aro y el cohete.
      `<filter id="sombra" filterUnits="userSpaceOnUse" x="0" y="0" width="${ancho}" height="${alto}">` +
      `<feMorphology in="SourceAlpha" operator="dilate" radius="${ensanche}"/>` +
      `<feGaussianBlur stdDeviation="${desenfoque}"/>` +
      '<feComposite in2="SourceAlpha" operator="out"/>' +
      "</filter>" +
      '<g id="formas">' +
      `<g mask="url(#fuera)" stroke="#fff" stroke-width="${linea}">` +
      `<line x1="0" y1="0" x2="${ancho}" y2="${alto}"/>` +
      `<line x1="${ancho}" y1="0" x2="0" y2="${alto}"/>` +
      "</g>" +
      `<circle cx="${cx}" cy="${cy}" r="${radio - borde / 2}" fill="none" stroke="#fff" stroke-width="${borde}"/>` +
      `<image href="${await isotipoBase64()}" x="${cx - lado / 2}" y="${cy - lado / 2}" width="${lado}" height="${lado}"/>` +
      "</g>" +
      "</defs>" +
      `<g opacity="${MARCA.sombraOpacidad}" filter="url(#sombra)"><use href="#formas"/></g>` +
      `<g opacity="${MARCA.opacidad}"><use href="#formas"/></g>` +
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
