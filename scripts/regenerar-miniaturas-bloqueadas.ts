/**
 * Regeneración MANUAL de `Product.miniaturaBloqueada`.
 *
 * Para los recursos «solo para registrados» cuya miniatura se generó
 * con un desenfoque anterior: la rehace desde su portada con la misma
 * función que usa la aplicación (src/lib/miniatura-bloqueada.ts). Esas
 * miniaturas ya no se envían a nadie (vista-recurso.ts las rechaza y
 * se ve el degradado); esto hace que vuelva a verse la portada
 * desenfocada. Los que aún no tienen miniatura son cosa de
 * rellenar-miniaturas-bloqueadas.ts.
 *
 * No se ejecuta solo: no está en package.json, ni en el build, ni en
 * el deploy. Es idempotente: una miniatura vigente se salta. Si una
 * portada no se puede leer, el recurso se queda como estaba.
 *
 * USO (desde la raíz del repositorio)
 *
 *   Prueba, no escribe nada (lista lo que haría):
 *     npx tsx scripts/regenerar-miniaturas-bloqueadas.ts
 *
 *   Escribir. Hay que repetir el host de la base de destino, que el
 *   modo prueba imprime, para no escribir en otra por error:
 *     npx tsx scripts/regenerar-miniaturas-bloqueadas.ts --ejecutar --host=<host>
 *
 * La base es la de DATABASE_URL. El script imprime solo el host,
 * nunca la URL.
 */

import { prisma } from "../src/lib/prisma";
import { asegurarMiniaturasBloqueadas } from "../src/lib/miniatura-bloqueada";
import { esMiniaturaValida } from "../src/lib/vista-recurso";

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

  const conMiniatura = await prisma.product.findMany({
    where: { previewLibre: false, miniaturaBloqueada: { not: null } },
    select: { id: true, slug: true, miniaturaBloqueada: true },
    orderBy: { createdAt: "asc" },
  });

  const antiguas = conMiniatura.filter(
    (r) => !esMiniaturaValida(r.miniaturaBloqueada)
  );

  // Con DATABASE_URL ya cargada por Prisma, el host es el real.
  const host = hostDeLaBase();

  console.log(`Base de datos: ${host}`);
  console.log(
    `Solo para registrados con miniatura: ${conMiniatura.length}; ` +
      `con el desenfoque anterior: ${antiguas.length}`
  );
  for (const r of antiguas) console.log(`  · ${r.slug}`);

  if (!ejecutar) {
    console.log(
      `\nModo prueba: no se ha escrito nada. Para regenerarlas:\n` +
        `  npx tsx scripts/regenerar-miniaturas-bloqueadas.ts --ejecutar --host=${host}`
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
    antiguas.map((r) => r.id)
  );

  console.log(
    `\nRegeneradas: ${generadas} de ${antiguas.length}.` +
      (generadas < antiguas.length
        ? " Las que faltan no tienen portada accesible: seguirán con el degradado."
        : "")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
