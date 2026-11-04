/**
 * Relleno MANUAL de `Product.miniaturaBloqueada`.
 *
 * Para los recursos que ya eran «solo para registrados»
 * (previewLibre = false) y no tienen miniatura —los anteriores a que
 * se generase al guardar—, la genera desde su portada con la misma
 * función que usa la aplicación (src/lib/miniatura-bloqueada.ts) y
 * la guarda. No toca ningún otro campo ni ningún otro recurso.
 *
 * No se ejecuta solo: no está en package.json, ni en el build, ni en
 * el deploy. Es idempotente: un recurso que ya tiene miniatura se
 * salta.
 *
 * USO (desde la raíz del repositorio)
 *
 *   Prueba, no escribe nada (lista lo que haría):
 *     npx tsx scripts/rellenar-miniaturas-bloqueadas.ts
 *
 *   Escribir. Hay que repetir el host de la base de destino, que el
 *   modo prueba imprime, para no escribir en otra por error:
 *     npx tsx scripts/rellenar-miniaturas-bloqueadas.ts --ejecutar --host=<host>
 *
 * La base es la de DATABASE_URL (Prisma lee `.env` si la variable no
 * está ya definida). El script imprime solo el host, nunca la URL.
 */

import { prisma } from "../src/lib/prisma";
import { asegurarMiniaturasBloqueadas } from "../src/lib/miniatura-bloqueada";

function hostDeLaBase(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "(desconocido)";
  } catch {
    return "(DATABASE_URL no es una URL)";
  }
}

async function main() {
  const ejecutar = process.argv.includes("--ejecutar");
  const hostPedido = process.argv
    .find((a) => a.startsWith("--host="))
    ?.slice("--host=".length);

  const pendientes = await prisma.product.findMany({
    where: { previewLibre: false, miniaturaBloqueada: null },
    select: { id: true, slug: true, coverUrl: true },
    orderBy: { createdAt: "asc" },
  });

  // Con DATABASE_URL ya cargada por Prisma, el host es el real.
  const host = hostDeLaBase();

  console.log(`Base de datos: ${host}`);
  console.log(
    `Recursos solo para registrados sin miniatura: ${pendientes.length}`
  );
  for (const r of pendientes) {
    console.log(`  · ${r.slug}${r.coverUrl ? "" : "  (sin portada: se usará la primera imagen)"}`);
  }

  if (!ejecutar) {
    console.log(
      `\nModo prueba: no se ha escrito nada. Para generarlas:\n` +
        `  npx tsx scripts/rellenar-miniaturas-bloqueadas.ts --ejecutar --host=${host}`
    );
    return;
  }

  if (host.startsWith("(") || hostPedido !== host) {
    console.error(
      `\n--host no coincide con la base de DATABASE_URL (${host}). No se escribe nada.`
    );
    process.exitCode = 1;
    return;
  }

  const generadas = await asegurarMiniaturasBloqueadas(
    pendientes.map((r) => r.id)
  );

  console.log(
    `\nGeneradas: ${generadas} de ${pendientes.length}.` +
      (generadas < pendientes.length
        ? " Las que faltan no tienen portada accesible: seguirán con el fondo neutro."
        : "")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
