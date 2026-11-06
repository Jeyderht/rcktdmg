/**
 * Miniatura de un recurso «solo para registrados».
 *
 * Es lo único que ve de su imagen un visitante sin sesión
 * (vista-recurso.ts). Se genera EN EL SERVIDOR a partir de la
 * portada y se guarda en `Product.miniaturaBloqueada` como data URI:
 * no tiene URL ni archivo en el almacén, así que no hay ruta desde
 * la que pedir algo más grande.
 *
 * POR QUÉ NO SE PUEDE RECUPERAR LA PORTADA
 *
 * La imagen se reduce a 16 px de ancho y después se desenfoca con
 * sigma 5 sobre esa misma imagen diminuta: casi un tercio de su
 * ancho. En las tarjetas (98-114 px) equivale a un radio de unos
 * 30-36 px. Solo quedan manchas de color, sin texto legible ni figuras:
 * unos pocos cientos de bytes en los que ya no existe la información
 * de la portada. No es un
 * desenfoque CSS sobre la imagen real (ese se quita con las
 * herramientas del navegador): los píxeles reales nunca salen del
 * servidor. En pantalla se estira con `image-rendering: pixelated`
 * (.rk-bloqueo-mini), de ahí el aspecto pixelado.
 *
 * DE DÓNDE SE LEE LA PORTADA
 *
 * Solo de los dos sitios donde la aplicación guarda imágenes
 * públicas: el almacén público de Vercel Blob o la carpeta
 * `public/` en local. Cualquier otra URL se ignora, para que esto no
 * sirva para pedir direcciones arbitrarias desde el servidor.
 *
 * Si algo falla (portada inaccesible, formato raro), devuelve null y
 * el recurso se sigue enseñando con el fondo neutro: un fallo aquí
 * nunca impide guardar ni cambiar la vista previa.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { prisma } from "@/lib/prisma";
import { HOST_BLOB_PUBLICO } from "@/lib/storage/blob";
import { PREFIJO_MINIATURA, esMiniaturaValida } from "@/lib/vista-recurso";

/** Ancho de la miniatura, en píxeles. */
const ANCHO = 16;
/** Tope de alto, por si una portada fuese muy alargada. */
const ALTO_MAXIMO = 32;
/** Desenfoque (sigma) aplicado sobre la imagen ya reducida. */
const DESENFOQUE = 5;
/** Portadas más pesadas que esto no se procesan. */
const TOPE_BYTES = 25 * 1024 * 1024;
const TIEMPO_MAXIMO_MS = 10_000;

/* ══════════════ LECTURA DE LA PORTADA ══════════════ */

async function leerDeBlobPublico(url: URL): Promise<Buffer | null> {
  if (url.protocol !== "https:") return null;
  if (!url.hostname.endsWith(`.${HOST_BLOB_PUBLICO}`)) return null;

  const respuesta = await fetch(url, {
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    redirect: "error",
  });

  if (!respuesta.ok) return null;

  const declarado = Number(respuesta.headers.get("content-length") ?? 0);
  if (declarado > TOPE_BYTES) return null;

  const datos = Buffer.from(await respuesta.arrayBuffer());
  return datos.length > TOPE_BYTES ? null : datos;
}

async function leerDePublicLocal(ruta: string): Promise<Buffer | null> {
  // Solo rutas del tipo /carpeta/archivo.ext, sin subir de nivel.
  if (!/^\/[A-Za-z0-9._/-]+$/.test(ruta) || ruta.includes("..")) return null;

  const base = path.join(process.cwd(), "public");
  const destino = path.join(base, ruta);

  if (!destino.startsWith(base + path.sep)) return null;

  const datos = await readFile(destino);
  return datos.length > TOPE_BYTES ? null : datos;
}

async function leerPortada(ref: string): Promise<Buffer | null> {
  try {
    if (ref.startsWith("/")) return await leerDePublicLocal(ref);
    return await leerDeBlobPublico(new URL(ref));
  } catch {
    return null;
  }
}

/* ══════════════ GENERACIÓN ══════════════ */

/**
 * Data URI de la miniatura bloqueada a partir de los bytes de una
 * imagen, o null si no se pudo. Exportada para las pruebas.
 */
export async function miniaturaDesdeBytes(
  datos: Buffer
): Promise<string | null> {
  try {
    for (const calidad of [45, 30, 20]) {
      const salida = await sharp(datos, { limitInputPixels: 40_000_000 })
        .rotate()
        .flatten({ background: "#808080" })
        .resize({
          width: ANCHO,
          height: ALTO_MAXIMO,
          fit: "inside",
          kernel: "cubic",
        })
        .blur(DESENFOQUE)
        .webp({ quality: calidad, effort: 6 })
        .toBuffer();

      const uri = `${PREFIJO_MINIATURA}${salida.toString("base64")}`;

      // La misma comprobación que se hace antes de enviarla.
      if (esMiniaturaValida(uri)) return uri;
    }

    return null;
  } catch {
    return null;
  }
}

/** Miniatura bloqueada de una portada (URL o ruta local), o null. */
export async function generarMiniaturaBloqueada(
  ref: string | null | undefined
): Promise<string | null> {
  if (!ref) return null;

  const datos = await leerPortada(ref);
  return datos ? miniaturaDesdeBytes(datos) : null;
}

/* ══════════════ RELLENO EN LA BASE ══════════════ */

const EN_PARALELO = 4;

/**
 * Para cada recurso indicado que sea «solo para registrados» y no
 * tenga una miniatura vigente (vacía o de un desenfoque anterior),
 * la genera desde su portada (o, sin portada, desde su primera
 * imagen, igual que la ficha) y la guarda.
 *
 * Solo escribe `miniaturaBloqueada`, y solo si no ha cambiado desde
 * que se leyó y el recurso sigue bloqueado. Devuelve cuántas
 * se generaron. No lanza: un recurso que falla se queda con el fondo
 * neutro y no afecta a los demás.
 */
export async function asegurarMiniaturasBloqueadas(
  ids: string[]
): Promise<number> {
  if (ids.length === 0) return 0;

  const bloqueados = await prisma.product.findMany({
    where: { id: { in: ids }, previewLibre: false },
    select: {
      id: true,
      coverUrl: true,
      miniaturaBloqueada: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const pendientes = bloqueados.filter(
    (r) => !esMiniaturaValida(r.miniaturaBloqueada)
  );

  let generadas = 0;

  for (let i = 0; i < pendientes.length; i += EN_PARALELO) {
    const tanda = pendientes.slice(i, i + EN_PARALELO);

    const resultados = await Promise.all(
      tanda.map(async (recurso) => {
        try {
          const miniatura = await generarMiniaturaBloqueada(
            recurso.coverUrl ?? recurso.images[0]?.url ?? null
          );
          if (!miniatura) return 0;

          const { count } = await prisma.product.updateMany({
            where: {
              id: recurso.id,
              previewLibre: false,
              miniaturaBloqueada: recurso.miniaturaBloqueada,
            },
            data: { miniaturaBloqueada: miniatura },
          });

          return count;
        } catch (error) {
          console.error("miniatura bloqueada:", recurso.id, error);
          return 0;
        }
      })
    );

    generadas += resultados.reduce((a, b) => a + b, 0);
  }

  return generadas;
}
