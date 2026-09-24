/**
 * Dimensiones reales de una imagen, leídas de su cabecera.
 *
 * Sin dependencias nuevas y a propósito: para averiguar dos
 * números no hace falta traer una librería de procesamiento de
 * imágenes con binarios nativos. Los cuatro formatos que la
 * aplicación acepta declaran su tamaño en los primeros bytes,
 * y eso es exactamente lo que se lee aquí.
 *
 * Si el formato no se reconoce o el archivo está truncado
 * devuelve null. NUNCA devuelve un valor supuesto: es mejor no
 * saber el tamaño que afirmar uno falso, porque de estos
 * números depende qué recursos entran en la sección de
 * Corporativos.
 */

export type Dimensiones = { width: number; height: number };

/** Formato 1080 × 1350, el vertical 4:5 que usa Corporativos. */
export const ANCHO_CORPORATIVO = 1080;
export const ALTO_CORPORATIVO = 1350;

export function esFormatoCorporativo(
  width: number | null | undefined,
  height: number | null | undefined
): boolean {
  return width === ANCHO_CORPORATIVO && height === ALTO_CORPORATIVO;
}

/* ══════════════ LECTURA ══════════════ */

function leerPng(b: Buffer): Dimensiones | null {
  // 89 50 4E 47 0D 0A 1A 0A, y el IHDR justo después.
  if (b.length < 24) return null;

  if (b.readUInt32BE(0) !== 0x89504e47) return null;

  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function leerGif(b: Buffer): Dimensiones | null {
  if (b.length < 10) return null;

  if (b.toString("ascii", 0, 3) !== "GIF") return null;

  // Little-endian, justo tras la firma y la versión.
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

/**
 * JPEG.
 *
 * El tamaño vive en el marcador SOF, que puede estar bastante
 * adentro: hay que recorrer los segmentos saltando cada uno
 * por su longitud declarada hasta dar con él.
 */
function leerJpeg(b: Buffer): Dimensiones | null {
  if (b.length < 4) return null;

  if (b.readUInt16BE(0) !== 0xffd8) return null;

  let i = 2;

  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i += 1;
      continue;
    }

    const marcador = b[i + 1];

    // SOF0..SOF15, menos los marcadores que no llevan tamaño.
    const esSof =
      marcador >= 0xc0 &&
      marcador <= 0xcf &&
      marcador !== 0xc4 &&
      marcador !== 0xc8 &&
      marcador !== 0xcc;

    if (esSof) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }

    const largo = b.readUInt16BE(i + 2);

    if (largo < 2) return null;

    i += 2 + largo;
  }

  return null;
}

/**
 * WebP.
 *
 * Tres variantes con cabeceras distintas: la simple (VP8), la
 * sin pérdida (VP8L) y la extendida (VP8X). Cada una guarda el
 * tamaño en un sitio diferente.
 */
function leerWebp(b: Buffer): Dimensiones | null {
  if (b.length < 30) return null;

  if (
    b.toString("ascii", 0, 4) !== "RIFF" ||
    b.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const tipo = b.toString("ascii", 12, 16);

  if (tipo === "VP8 ") {
    // 14 bits por eje, tras el código de sincronía.
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  }

  if (tipo === "VP8L") {
    const bits = b.readUInt32LE(21);

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (tipo === "VP8X") {
    // 24 bits por eje, menos uno, en little-endian.
    const ancho = b[24] | (b[25] << 8) | (b[26] << 16);
    const alto = b[27] | (b[28] << 8) | (b[29] << 16);

    return { width: ancho + 1, height: alto + 1 };
  }

  return null;
}

/**
 * Dimensiones de una imagen a partir de sus bytes.
 *
 * Basta con el principio del archivo; no hace falta tenerlo
 * entero en memoria salvo para JPEGs con metadatos muy largos.
 */
export function dimensionesDe(datos: Buffer): Dimensiones | null {
  const medida =
    leerPng(datos) ??
    leerJpeg(datos) ??
    leerWebp(datos) ??
    leerGif(datos);

  if (!medida) return null;

  // Un cero o un número absurdo significa que se leyó mal.
  const valido = (n: number) =>
    Number.isInteger(n) && n > 0 && n < 100000;

  return valido(medida.width) && valido(medida.height) ? medida : null;
}

/**
 * Dimensiones de una imagen que ya está publicada.
 *
 * Solo pide los primeros 128 KB con una petición de rango:
 * con eso basta para cualquier cabecera y evita descargar
 * imágenes enteras. Si el servidor ignora el rango, se corta
 * lo que llegue.
 */
export async function dimensionesDesdeUrl(
  url: string
): Promise<Dimensiones | null> {
  try {
    const respuesta = await fetch(url, {
      headers: { Range: "bytes=0-131071" },
    });

    if (!respuesta.ok && respuesta.status !== 206) return null;

    const datos = Buffer.from(await respuesta.arrayBuffer());

    return dimensionesDe(datos);
  } catch {
    return null;
  }
}
