/**
 * Relleno MANUAL de la marca de agua (paso 6 del PR de marca de agua).
 *
 * Para cada imagen de recurso de antes de la marca (portada, vista
 * previa y galería que no apuntan a una copia):
 *
 *   1. guarda el original en el almacén PRIVADO y una copia con marca
 *      en el PÚBLICO, con la misma función que las subidas nuevas;
 *   2. cambia la URL en la base para que apunte a la copia.
 *
 * NO SOBRESCRIBE NI BORRA NADA del almacén: la imagen antigua sigue
 * donde estaba, y también su URL pública, sin marca, para quien ya la
 * conozca. Borrarlas es un paso aparte que este script no hace.
 *
 * No toca el slider (`sliderUrl`), ni las portadas propias de packs y
 * colecciones, ni las medidas guardadas (la copia conserva la forma).
 *
 * No se ejecuta solo: no está en package.json, ni en el build, ni en
 * el deploy. Es repetible: lo que ya apunta a una copia se salta.
 *
 * USO (desde la raíz del repositorio)
 *
 *   Prueba: no escribe nada. Descarga cada imagen, genera su copia en
 *   memoria y mide lo que ocuparía:
 *     npx tsx scripts/rellenar-marca-agua.ts
 *
 *   Ejecutar. Hay que repetir el host que imprime la prueba. Pide
 *   DATABASE_URL, STORAGE_DRIVER=blob y los dos tokens de Blob:
 *     npx tsx scripts/rellenar-marca-agua.ts --ejecutar --host=<host>
 *   Deja scripts/relleno-marca-agua-<fecha>.json con cada URL antigua
 *   y su copia.
 *
 *   Revertir: vuelve a poner en la base las URLs antiguas de ese
 *   registro, solo donde sigan apuntando a la copia que puso el relleno.
 *   Las copias y originales creados se quedan en el almacén.
 *     npx tsx scripts/rellenar-marca-agua.ts --revertir=<registro.json> --host=<host>
 *
 * Imprime solo el host de la base, nunca su URL ni los tokens.
 */

import { writeFileSync, readFileSync } from "node:fs";

import { prisma } from "../src/lib/prisma";
import { generarCopiaConMarca } from "../src/lib/marca-agua";
import { leerPortada } from "../src/lib/miniatura-bloqueada";
import {
  planificarRelleno,
  type ImagenPendiente,
  type UsoImagen,
} from "../src/lib/relleno-marca-agua";
import { driverActual } from "../src/lib/storage";
import { guardarImagenDeRecurso } from "../src/lib/storage/imagenes-recurso";

const EN_PARALELO = 4;

type EntradaRegistro = { antigua: string; copia: string; usos: UsoImagen[] };

function hostDeLaBase(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "(desconocido)";
  } catch {
    return "(DATABASE_URL no es una URL)";
  }
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Reparte el trabajo en tandas para no saturar ni la red ni la CPU. */
async function enTandas<T>(lista: T[], accion: (item: T) => Promise<void>) {
  for (let i = 0; i < lista.length; i += EN_PARALELO) {
    await Promise.all(lista.slice(i, i + EN_PARALELO).map(accion));
  }
}

async function cambiarUrl(uso: UsoImagen, desde: string, hasta: string) {
  if (uso.tipo === "galeria") {
    return prisma.productImage.updateMany({
      where: { id: uso.imageId, url: desde },
      data: { url: hasta },
    });
  }

  const campo = uso.tipo === "portada" ? "coverUrl" : "previewUrl";

  return prisma.product.updateMany({
    where: { id: uso.productId, [campo]: desde },
    data: { [campo]: hasta },
  });
}

async function plan() {
  const filas = await prisma.product.findMany({
    select: {
      id: true,
      coverUrl: true,
      previewUrl: true,
      images: { select: { id: true, url: true } },
    },
  });

  return { total: filas.length, ...planificarRelleno(filas) };
}

async function probar(pendientes: ImagenPendiente[]) {
  let originales = 0;
  let copias = 0;
  const fallos: string[] = [];

  await enTandas(pendientes, async ({ url }) => {
    const nombre = url.split("/").pop() ?? url;

    try {
      const datos = await leerPortada(url);
      if (!datos) throw new Error("no se pudo leer");

      const copia = await generarCopiaConMarca(datos);
      originales += datos.length;
      copias += copia.data.length;
    } catch (error) {
      fallos.push(
        `${nombre}: ${error instanceof Error ? error.message : "error"}`
      );
    }
  });

  console.log(`\nSe podrían convertir: ${pendientes.length - fallos.length}`);
  console.log(`Originales al almacén privado: ${mb(originales)}`);
  console.log(`Copias con marca al almacén público: ${mb(copias)}`);
  console.log(`Espacio extra total: ${mb(originales + copias)}`);

  if (fallos.length > 0) {
    console.log(`\nNo convertibles (se quedarían como están): ${fallos.length}`);
    for (const fallo of fallos) console.log(`  · ${fallo}`);
  }
}

async function ejecutar(pendientes: ImagenPendiente[]) {
  const registro: EntradaRegistro[] = [];
  const archivo = `scripts/relleno-marca-agua-${Date.now()}.json`;
  const guardarRegistro = () =>
    writeFileSync(archivo, JSON.stringify(registro, null, 2));

  // Existe desde antes de escribir nada: es lo que permite revertir.
  guardarRegistro();

  let fallos = 0;

  await enTandas(pendientes, async ({ url, usos }) => {
    try {
      const datos = await leerPortada(url);
      if (!datos) throw new Error("no se pudo leer");

      const { url: copia } = await guardarImagenDeRecurso(datos);

      // Antes de cambiar la base: nunca queda un cambio sin registrar.
      registro.push({ antigua: url, copia, usos });
      guardarRegistro();

      for (const uso of usos) await cambiarUrl(uso, url, copia);
    } catch (error) {
      fallos += 1;
      console.error(
        `  · ${url.split("/").pop()}: ${error instanceof Error ? error.message : "error"}`
      );
    }
  });

  console.log(`\nConvertidas: ${registro.length}. Fallidas: ${fallos}.`);
  console.log(`Registro: ${archivo}`);
}

async function revertir(archivo: string) {
  const registro = JSON.parse(readFileSync(archivo, "utf8")) as EntradaRegistro[];
  let cambios = 0;

  for (const { antigua, copia, usos } of registro) {
    for (const uso of usos) {
      const { count } = await cambiarUrl(uso, copia, antigua);
      cambios += count;
    }
  }

  console.log(`Campos devueltos a la URL antigua: ${cambios}.`);
  console.log("Las copias y los originales creados siguen en el almacén.");
}

async function main() {
  const args = process.argv.slice(2);
  const valor = (nombre: string) =>
    args.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3);

  const modoEjecutar = args.includes("--ejecutar");
  const registroARevertir = valor("revertir");

  // Con DATABASE_URL ya cargada por Prisma, el host es el real.
  await prisma.$connect();
  const host = hostDeLaBase();
  const driver = driverActual();

  console.log(`Base de datos: ${host}`);
  console.log(`Almacén activo: ${driver}`);

  if (modoEjecutar || registroARevertir) {
    if (host.startsWith("(") || valor("host") !== host) {
      console.error(
        `\n--host no coincide con la base de DATABASE_URL (${host}). No se escribe nada.`
      );
      process.exitCode = 1;
      return;
    }
  }

  if (registroARevertir) {
    await revertir(registroARevertir);
    return;
  }

  const { total, pendientes, yaConMarca } = await plan();
  const contar = (tipo: UsoImagen["tipo"]) =>
    pendientes.flatMap((p) => p.usos).filter((u) => u.tipo === tipo).length;

  console.log(`Recursos en la base: ${total}`);
  console.log(`Campos que ya apuntan a una copia con marca: ${yaConMarca}`);
  console.log(
    `Pendientes: ${contar("portada")} portadas, ${contar("vistaPrevia")} vistas previas, ` +
      `${contar("galeria")} de galería (${pendientes.length} imágenes distintas)`
  );

  if (!modoEjecutar) {
    await probar(pendientes);
    console.log(
      `\nModo prueba: no se ha escrito nada. Para ejecutarlo:\n` +
        `  npx tsx scripts/rellenar-marca-agua.ts --ejecutar --host=${host}`
    );
    return;
  }

  // Una copia en disco local con la base de producción rompería la web.
  const hayRemotas = pendientes.some((p) => p.url.startsWith("http"));
  if (hayRemotas && driver !== "blob") {
    console.error(
      `\nHay imágenes en Blob y el almacén activo es «${driver}». Define STORAGE_DRIVER=blob. No se escribe nada.`
    );
    process.exitCode = 1;
    return;
  }

  await ejecutar(pendientes);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
