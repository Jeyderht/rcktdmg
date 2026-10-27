/**
 * Borra el recurso de prueba de la marca de agua y TODOS sus
 * archivos de los dos almacenes.
 *
 *   node scripts/borrar-recurso-prueba.mjs --slug <slug>            (prueba: solo lista)
 *   node scripts/borrar-recurso-prueba.mjs --slug <slug> --borrar   (borra)
 *
 * Qué hace y qué NO hace:
 *
 *  - Por defecto NO borra nada: enseña qué borraría y si cada
 *    objeto existe de verdad en el almacén.
 *  - Solo actúa sobre un recurso en BORRADOR llamado exactamente
 *    «PRUEBA». Cualquier otro se rechaza, sea cual sea el slug.
 *  - Borra la fila del recurso (sus imágenes de galería caen en
 *    cascada) y después, en los almacenes:
 *      · cada copia con marca (público, product-previews/<id>.jpg)
 *        y su original (privado, product-originals/<id>);
 *      · cualquier otra imagen suya que viva en Blob;
 *      · su archivo vendible, si se llegó a subir (privado);
 *      · las subidas temporales que hubieran quedado de su creador
 *        (privado, product-uploads/<idCreador>-…). En un uso normal
 *        no queda ninguna: la ruta las borra al convertirlas.
 *  - Guarda la lista de lo que borró en un JSON junto al script.
 *  - No imprime tokens: solo dice si están presentes.
 */

import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { del, head, list } from "@vercel/blob";

const RAIZ = process.cwd();

// Carga .env y .env.local sin sobrescribir lo que ya exista.
for (const archivo of [".env", ".env.local"]) {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) continue;

  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let valor = m[2].trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = valor;
  }
}

const NOMBRE_EXIGIDO = "PRUEBA";
const HOST_PUBLICO = "public.blob.vercel-storage.com";
const COPIA = /\/product-previews\/([0-9a-f-]{36})\.jpg$/i;

const args = process.argv.slice(2);
const slug = args[args.indexOf("--slug") + 1];
const borrar = args.includes("--borrar");

const tokenPublico = process.env.BLOB_READ_WRITE_TOKEN;
const tokenPrivado = process.env.BLOB_FILES_READ_WRITE_TOKEN;

console.log(`\nModo: ${borrar ? "BORRAR" : "PRUEBA (no se borra nada)"}`);
console.log(`  almacén público : ${tokenPublico ? "PRESENTE" : "AUSENTE"}`);
console.log(`  almacén privado : ${tokenPrivado ? "PRESENTE" : "AUSENTE"}`);

if (!args.includes("--slug") || !slug || slug.startsWith("--")) {
  console.error("\nFalta --slug <slug del recurso>.");
  process.exit(1);
}

if (!tokenPublico || !tokenPrivado) {
  console.error("\nFaltan los tokens de los dos almacenes.");
  process.exit(1);
}

const prisma = new PrismaClient();

/** ¿Existe el objeto? Para enseñarlo en la lista, nunca para decidir. */
async function existe(ref, token) {
  try {
    await head(ref, { token });
    return "sí";
  } catch {
    return "no";
  }
}

try {
  const producto = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      status: true,
      creatorId: true,
      coverUrl: true,
      previewUrl: true,
      fileUrl: true,
      images: { select: { url: true } },
    },
  });

  if (!producto) {
    console.error(`\nNo hay ningún recurso con el slug «${slug}».`);
    process.exit(1);
  }

  // Salvaguarda: solo el recurso de prueba, y solo en borrador.
  if (producto.name.trim() !== NOMBRE_EXIGIDO || producto.status !== "DRAFT") {
    console.error(
      `\nRechazado: «${producto.name}» (${producto.status}). Solo se borra un recurso en BORRADOR llamado exactamente «${NOMBRE_EXIGIDO}».`
    );
    process.exit(1);
  }

  /** Lo que se borraría: [descripción, ruta o URL, token]. */
  const objetos = [];

  const imagenes = [
    producto.coverUrl,
    producto.previewUrl,
    ...producto.images.map((i) => i.url),
  ].filter(Boolean);

  for (const url of new Set(imagenes)) {
    const copia = COPIA.exec(url);

    if (copia) {
      objetos.push(["copia con marca (público)", url, tokenPublico]);
      objetos.push([
        "su original (privado)",
        `product-originals/${copia[1]}`,
        tokenPrivado,
      ]);
    } else if (url.includes(HOST_PUBLICO)) {
      objetos.push(["imagen sin marca (público)", url, tokenPublico]);
    } else {
      console.log(`  (se omite, no es de Blob: ${url})`);
    }
  }

  if (producto.fileUrl?.includes(".blob.vercel-storage.com")) {
    objetos.push(["archivo vendible (privado)", producto.fileUrl, tokenPrivado]);
  }

  const temporales = await list({
    prefix: `product-uploads/${producto.creatorId}-`,
    token: tokenPrivado,
  });

  for (const blob of temporales.blobs) {
    objetos.push(["subida temporal sobrante (privado)", blob.pathname, tokenPrivado]);
  }

  console.log(`\nRecurso «${producto.name}» (${producto.status}) · id ${producto.id}`);
  console.log(`  fila en la base: se borra (y sus ${producto.images.length} imágenes de galería, en cascada)`);
  console.log(`\nObjetos en los almacenes (${objetos.length}):`);

  for (const [que, ref, token] of objetos) {
    console.log(`  · ${que}: ${ref}  [existe: ${await existe(ref, token)}]`);
  }

  if (!borrar) {
    console.log("\nNo se ha borrado nada. Repite con --borrar para borrar.");
    process.exit(0);
  }

  // Primero la base: si fallara, no se toca ningún archivo.
  await prisma.product.delete({ where: { id: producto.id } });
  console.log("\n✓ Fila del recurso borrada.");

  const registro = [];

  for (const [que, ref, token] of objetos) {
    try {
      await del(ref, { token });
      registro.push({ que, ref, resultado: "borrado" });
      console.log(`  ✓ ${que}: ${ref}`);
    } catch (error) {
      registro.push({ que, ref, resultado: `fallo: ${error.message}` });
      console.log(`  ✗ ${que}: ${ref} → ${error.message}`);
    }
  }

  const salida = path.join(
    RAIZ,
    "scripts",
    `borrado-prueba-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );

  fs.writeFileSync(
    salida,
    JSON.stringify({ slug, id: producto.id, objetos: registro }, null, 2)
  );

  console.log(`\nRegistro guardado en ${path.relative(RAIZ, salida)}`);
} catch (error) {
  console.error("\nError:", error instanceof Error ? error.message : error);
  console.error("No se ha completado el borrado. Revisa el mensaje antes de repetir.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
