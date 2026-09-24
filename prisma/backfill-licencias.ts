import { PrismaClient } from "@prisma/client";

// Del módulo de servidor: codigoDeLicencia usa node:crypto y
// no puede vivir en el módulo compartido con el navegador.
import { codigoDeLicencia } from "../src/lib/licencias";
import { condicionesDe } from "../src/lib/licencias-comun";

const prisma = new PrismaClient();

/**
 * Licencias de las compras anteriores a esta etapa.
 *
 * POR QUÉ EXISTE
 *
 * Las licencias empiezan a otorgarse cuando se cobra un
 * pedido. Los pedidos ya pagados antes de que existiera el
 * modelo no tienen ninguna, así que sus compradores verían su
 * apartado de licencias vacío pese a haber pagado.
 *
 * Este script las emite a partir de las líneas de pedido
 * realmente pagadas. No inventa compras: cada licencia sale de
 * un `OrderItem` que ya está en la base.
 *
 * IDEMPOTENCIA
 *
 * El código se deriva de la línea de compra y `orderItemId`
 * tiene índice único, así que `skipDuplicates` hace que
 * ejecutarlo dos veces no cree nada nuevo. Es el mismo camino
 * que usa el cobro en vivo.
 *
 * EL TIPO
 *
 * Se copia el `licenseType` que tiene HOY el recurso. Para los
 * recursos existentes es PERSONAL, que es el valor por defecto
 * y el más restrictivo: nadie declaró otra cosa cuando se
 * vendieron, y conceder más derechos de los otorgados sería
 * inventar una condición que el creador nunca aceptó.
 *
 * USO:  npx tsx prisma/backfill-licencias.ts
 */
async function main() {
  const lineas = await prisma.orderItem.findMany({
    where: { order: { status: "PAID" } },
    select: {
      id: true,
      productId: true,
      orderId: true,
      order: { select: { userId: true } },
      product: { select: { licenseType: true } },
    },
  });

  if (lineas.length === 0) {
    console.log("No hay líneas de pedido pagadas.");
    return;
  }

  const resultado = await prisma.license.createMany({
    data: lineas.map((linea) => ({
      code: codigoDeLicencia(linea.id),
      userId: linea.order.userId,
      productId: linea.productId,
      orderId: linea.orderId,
      orderItemId: linea.id,
      type: linea.product.licenseType,
      terms: condicionesDe(linea.product.licenseType),
    })),
    skipDuplicates: true,
  });

  const total = await prisma.license.count();

  const porTipo = await prisma.license.groupBy({
    by: ["type"],
    _count: { _all: true },
  });

  console.log(`líneas pagadas : ${lineas.length}`);
  console.log(`emitidas       : ${resultado.count}`);
  console.log(`ya existentes  : ${lineas.length - resultado.count}`);
  console.log(`total en tabla : ${total}`);
  console.log(
    `por tipo       : ${porTipo
      .map((t) => `${t.type}=${t._count._all}`)
      .join(" ")}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
