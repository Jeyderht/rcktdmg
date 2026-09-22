/**
 * Migración de archivos locales a Vercel Blob.
 *
 *   node scripts/migrar-storage.mjs            -> DRY RUN (no escribe nada)
 *   node scripts/migrar-storage.mjs --ejecutar -> sube y actualiza URLs
 *
 * Reglas:
 *
 *  - Nunca borra un archivo local.
 *  - Solo actualiza la base de datos DESPUÉS de confirmar la
 *    subida de ese archivo concreto.
 *  - Si un archivo falla, se registra y se continúa con el
 *    siguiente; su registro queda intacto.
 *  - Los archivos vendibles van al almacén privado y las
 *    imágenes al público. Nunca se mezclan.
 *  - No imprime tokens.
 */

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const EJECUTAR = process.argv.includes("--ejecutar");
const RAIZ = process.cwd();

/*
  .env y .env.local se cargan a mano: este script corre fuera
  de Next, que en la aplicación ya lo hace por nosotros.

  Prioridad, de mayor a menor:
    1. el entorno real del proceso
    2. .env.local
    3. .env

  Los tokens de Blob viven en .env.local, así que leer solo
  .env dejaba al script sin credenciales.
*/
const definidasEnArchivo = new Set();

for (const archivo of [".env", ".env.local"]) {
  const ruta = path.join(RAIZ, archivo);

  if (!fs.existsSync(ruta)) continue;

  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;

    const clave = m[1];
    let valor = m[2].trim();

    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }

    // Lo que ya venía del shell no se pisa; entre archivos,
    // .env.local sí puede sobrescribir a .env.
    if (
      process.env[clave] !== undefined &&
      !definidasEnArchivo.has(clave)
    ) {
      continue;
    }

    process.env[clave] = valor;
    definidasEnArchivo.add(clave);
  }
}

/*
  Credenciales comprobadas antes de tocar nada.

  Solo aplica a la ejecución real: el dry run sigue siendo útil
  sin tokens, porque no sube ningún archivo.
*/
if (EJECUTAR) {
  const faltantes = [
    "BLOB_READ_WRITE_TOKEN",
    "BLOB_FILES_READ_WRITE_TOKEN",
  ].filter((nombre) => !process.env[nombre]);

  if (faltantes.length > 0) {
    console.error(
      "\nNo se puede migrar: faltan credenciales de Vercel Blob."
    );

    for (const nombre of faltantes) {
      console.error("  " + nombre + ": AUSENTE");
    }

    console.error("\nDefínelas en .env.local y vuelve a intentarlo.");
    console.error(
      "No se ha subido ningún archivo ni se ha tocado la base de datos.\n"
    );

    process.exit(2);
  }
}

const prisma = new PrismaClient();

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function rutaLocalPublica(url) {
  // "/product-images/x.jpg" -> public/product-images/x.jpg
  return path.join(RAIZ, "public", url.replace(/^\//, ""));
}

function rutaLocalPrivada(url) {
  const nombre = decodeURIComponent(
    url
      .replace("/storage/products/", "")
      .replace("/api/download-file/", "")
  );

  if (
    !nombre ||
    nombre.includes("..") ||
    nombre.includes("/") ||
    nombre.includes("\\")
  ) {
    return null;
  }

  return path.join(RAIZ, "storage", "products", nombre);
}

const tiposPorExtension = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

async function subir(destino, rutaLocal, privado) {
  const { put } = await import("@vercel/blob");

  const token = privado
    ? process.env.BLOB_FILES_READ_WRITE_TOKEN
    : process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    throw new Error(
      privado
        ? "Falta BLOB_FILES_READ_WRITE_TOKEN"
        : "Falta BLOB_READ_WRITE_TOKEN"
    );
  }

  const extension = path.extname(rutaLocal).toLowerCase();

  const resultado = await put(destino, fs.readFileSync(rutaLocal), {
    access: privado ? "private" : "public",
    token,
    contentType: tiposPorExtension[extension],
    addRandomSuffix: false,
  });

  return resultado.url;
}

/** Una tarea = un archivo + el registro que lo referencia. */
const tareas = [];

async function reunirTareas() {
  const productos = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      fileUrl: true,
      coverUrl: true,
      previewUrl: true,
    },
  });

  for (const p of productos) {
    if (p.fileUrl && !p.fileUrl.startsWith("https://")) {
      const local = rutaLocalPrivada(p.fileUrl);

      tareas.push({
        tipo: "archivo vendible",
        privado: true,
        modelo: "product",
        id: p.id,
        campo: "fileUrl",
        urlActual: p.fileUrl,
        local,
        destino: local
          ? `products/${path.basename(local)}`
          : null,
      });
    }

    for (const campo of ["coverUrl", "previewUrl"]) {
      const url = p[campo];
      if (!url || url.startsWith("https://")) continue;

      const local = rutaLocalPublica(url);

      tareas.push({
        tipo: `imagen (${campo})`,
        privado: false,
        modelo: "product",
        id: p.id,
        campo,
        urlActual: url,
        local,
        destino: url.replace(/^\//, ""),
      });
    }
  }

  const imagenes = await prisma.productImage.findMany({
    select: { id: true, url: true },
  });

  for (const img of imagenes) {
    if (!img.url || img.url.startsWith("https://")) continue;

    tareas.push({
      tipo: "imagen de galería",
      privado: false,
      modelo: "productImage",
      id: img.id,
      campo: "url",
      urlActual: img.url,
      local: rutaLocalPublica(img.url),
      destino: img.url.replace(/^\//, ""),
    });
  }

  const usuarios = await prisma.user.findMany({
    select: { id: true, avatarUrl: true, coverUrl: true },
  });

  for (const u of usuarios) {
    for (const campo of ["avatarUrl", "coverUrl"]) {
      const url = u[campo];
      if (!url || url.startsWith("https://")) continue;

      tareas.push({
        tipo: `usuario (${campo})`,
        privado: false,
        modelo: "user",
        id: u.id,
        campo,
        urlActual: url,
        local: rutaLocalPublica(url),
        destino: url.replace(/^\//, ""),
      });
    }
  }
}

async function actualizarRegistro(tarea, urlNueva) {
  const data = { [tarea.campo]: urlNueva };

  if (tarea.modelo === "product") {
    await prisma.product.update({ where: { id: tarea.id }, data });
  } else if (tarea.modelo === "productImage") {
    await prisma.productImage.update({
      where: { id: tarea.id },
      data,
    });
  } else {
    await prisma.user.update({ where: { id: tarea.id }, data });
  }
}

async function main() {
  await reunirTareas();

  console.log(
    `\n=== MIGRACIÓN DE STORAGE — ${
      EJECUTAR ? "EJECUCIÓN REAL" : "DRY RUN (no se escribe nada)"
    } ===\n`
  );

  let totalBytes = 0;
  let ausentes = 0;
  const resumen = { ok: 0, fallos: 0, omitidos: 0 };

  for (const t of tareas) {
    const existe = t.local && fs.existsSync(t.local);
    const bytes = existe ? fs.statSync(t.local).size : 0;

    if (existe) totalBytes += bytes;
    else ausentes += 1;

    const almacen = t.privado
      ? "rcktdmg-files (privado)"
      : "rcktdmg-media (público)";

    console.log(`· ${t.tipo}  [${t.modelo}:${t.id}]`);
    console.log(`    actual : ${t.urlActual}`);
    console.log(
      `    local  : ${
        existe ? `${path.relative(RAIZ, t.local)} (${kb(bytes)})` : "NO ENCONTRADO"
      }`
    );
    console.log(`    destino: ${almacen} :: ${t.destino ?? "—"}`);

    if (!EJECUTAR) {
      console.log(
        `    nueva  : (se asignará la URL que devuelva Blob)\n`
      );
      continue;
    }

    if (!existe || !t.destino) {
      console.log(`    RESULTADO: omitido, no se toca el registro\n`);
      resumen.omitidos += 1;
      continue;
    }

    try {
      const urlNueva = await subir(t.destino, t.local, t.privado);

      // La base solo se toca con la subida ya confirmada.
      await actualizarRegistro(t, urlNueva);

      console.log(`    nueva  : ${urlNueva}`);
      console.log(`    RESULTADO: migrado\n`);
      resumen.ok += 1;
    } catch (error) {
      console.log(
        `    RESULTADO: FALLÓ (${
          error instanceof Error ? error.message : "error"
        }) — registro y archivo local intactos\n`
      );
      resumen.fallos += 1;
    }
  }

  console.log("=== RESUMEN ===");
  console.log(`  referencias a migrar : ${tareas.length}`);
  console.log(`  archivos presentes   : ${tareas.length - ausentes}`);
  console.log(`  archivos ausentes    : ${ausentes}`);
  console.log(`  tamaño total         : ${kb(totalBytes)}`);

  if (EJECUTAR) {
    console.log(
      `  migrados: ${resumen.ok} · fallos: ${resumen.fallos} · omitidos: ${resumen.omitidos}`
    );
  } else {
    console.log(
      "\n  Dry run: no se subió nada y la base de datos no se tocó."
    );
    console.log(
      "  Para ejecutar de verdad: node scripts/migrar-storage.mjs --ejecutar"
    );
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("ERROR EN LA MIGRACIÓN:", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
