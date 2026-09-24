/**
 * Backfill de dimensiones de imagen.
 *
 * Lee el tamaño REAL de las portadas y de las imágenes de
 * galería que ya estaban publicadas antes de que existieran
 * las columnas, y lo guarda.
 *
 * PARA EJECUTAR EN LOCAL:
 *
 *   npx tsx prisma/backfill-dimensiones.ts
 *
 * NO SE EJECUTA EN PRODUCCIÓN. Aquí solo se leen cabeceras y
 * se escriben dos enteros, pero la regla del proyecto es que
 * ningún backfill toca la base de producción sin que se
 * apruebe antes.
 *
 * Es IDEMPOTENTE: solo mira las filas que todavía no tienen
 * dimensiones, así que se puede repetir sin efecto. Si una
 * imagen no se puede leer —enlace roto, formato desconocido—
 * se queda en NULL y se informa. Nunca se rellena con un
 * tamaño supuesto.
 */
import { PrismaClient } from "@prisma/client";

import { dimensionesDesdeUrl } from "../src/lib/dimensiones";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfill de dimensiones\n");

  /* ── PORTADAS ── */

  const productos = await prisma.product.findMany({
    where: {
      coverUrl: { not: null },
      OR: [{ coverWidth: null }, { coverHeight: null }],
    },
    select: { id: true, name: true, coverUrl: true },
  });

  console.log(`Portadas por medir: ${productos.length}`);

  let portadasOk = 0;
  let portadasFallidas = 0;

  for (const producto of productos) {
    const medida = await dimensionesDesdeUrl(producto.coverUrl!);

    if (!medida) {
      portadasFallidas += 1;
      console.log(`  · sin leer   ${producto.name}`);
      continue;
    }

    await prisma.product.update({
      where: { id: producto.id },
      data: { coverWidth: medida.width, coverHeight: medida.height },
    });

    portadasOk += 1;

    console.log(
      `  · ${String(medida.width)}x${medida.height}`.padEnd(16) +
        producto.name
    );
  }

  /* ── IMÁGENES DE GALERÍA ── */

  const imagenes = await prisma.productImage.findMany({
    where: { OR: [{ imageWidth: null }, { imageHeight: null }] },
    select: { id: true, url: true, product: { select: { name: true } } },
  });

  console.log(`\nImágenes de galería por medir: ${imagenes.length}`);

  let imagenesOk = 0;
  let imagenesFallidas = 0;

  for (const imagen of imagenes) {
    const medida = await dimensionesDesdeUrl(imagen.url);

    if (!medida) {
      imagenesFallidas += 1;
      console.log(`  · sin leer   ${imagen.product.name}`);
      continue;
    }

    await prisma.productImage.update({
      where: { id: imagen.id },
      data: { imageWidth: medida.width, imageHeight: medida.height },
    });

    imagenesOk += 1;

    console.log(
      `  · ${String(medida.width)}x${medida.height}`.padEnd(16) +
        imagen.product.name
    );
  }

  console.log(
    `\nResumen · portadas: ${portadasOk} medidas, ${portadasFallidas} sin leer` +
      ` · galería: ${imagenesOk} medidas, ${imagenesFallidas} sin leer`
  );

  console.log(
    "Las que no se pudieron leer quedan en NULL a propósito."
  );
}

main()
  .catch((error) => {
    console.error("El backfill falló:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
