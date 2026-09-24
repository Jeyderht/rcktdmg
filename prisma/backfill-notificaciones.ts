import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Relleno histórico del centro de notificaciones.
 *
 * POR QUÉ EXISTE
 *
 * Hasta ahora las notificaciones no se guardaban: se deducían
 * en cada carga a partir de pedidos, productos, retiros,
 * favoritos, usuarios y seguidores. Al pasar a la tabla
 * `Notification`, los hechos anteriores a ese cambio no
 * tendrían fila y la campana aparecería vacía, perdiendo
 * avisos que hoy sí se ven.
 *
 * Este script los crea una sola vez, a partir de esos mismos
 * registros reales. No inventa nada: cada fila sale de un
 * hecho que ya está en la base.
 *
 * IDEMPOTENCIA
 *
 * Cada notificación recibe un id derivado del hecho que la
 * origina (`bf-sale-<orderItemId>`, por ejemplo) en lugar de
 * un cuid aleatorio. Como el id es la clave primaria,
 * `skipDuplicates` hace que ejecutarlo dos veces no duplique
 * nada. Las notificaciones nuevas, las que se crean cuando
 * ocurre el hecho, siguen usando cuid.
 *
 * LEÍDAS DE ENTRADA
 *
 * Se marcan como leídas. Son hechos que el usuario ya pudo
 * ver en la campana; traerlos como nuevos encendería el
 * contador con decenas de avisos viejos el primer día.
 *
 * USO:  npx tsx prisma/backfill-notificaciones.ts
 */

const LIMITE = 200;

const soles = (v: Prisma.Decimal | number) =>
  `S/ ${Number(v).toFixed(2)}`;

async function main() {
  const leidoEn = new Date();

  const filas: Prisma.NotificationCreateManyInput[] = [];

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  /* ─────────── ADMIN ─────────── */

  const enRevision = await prisma.product.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { updatedAt: "desc" },
    take: LIMITE,
    select: { id: true, name: true, updatedAt: true },
  });

  const retirosPendientes = await prisma.withdrawal.findMany({
    where: { status: "REQUESTED" },
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: { id: true, amount: true, createdAt: true },
  });

  const pedidosPagados = await prisma.order.findMany({
    where: { status: "PAID" },
    orderBy: { updatedAt: "desc" },
    take: LIMITE,
    select: { id: true, total: true, updatedAt: true },
  });

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: { id: true, name: true, role: true, createdAt: true },
  });

  for (const admin of admins) {
    for (const p of enRevision) {
      filas.push({
        id: `bf-sub-${p.id}-${admin.id}`,
        userId: admin.id,
        type: "PRODUCT_SUBMITTED",
        title: "Recurso enviado a revisión",
        body: p.name,
        href: `/admin/recursos/${p.id}`,
        createdAt: p.updatedAt,
        readAt: leidoEn,
      });
    }

    for (const r of retirosPendientes) {
      filas.push({
        id: `bf-wr-${r.id}-${admin.id}`,
        userId: admin.id,
        type: "WITHDRAWAL_REQUESTED",
        title: "Nueva solicitud de retiro",
        body: soles(r.amount),
        href: "/admin/retiros",
        createdAt: r.createdAt,
        readAt: leidoEn,
      });
    }

    for (const o of pedidosPagados) {
      filas.push({
        id: `bf-op-${o.id}-${admin.id}`,
        userId: admin.id,
        type: "ORDER_PAID",
        title: "Nuevo pedido pagado",
        body: `Un pedido de ${soles(o.total)} quedó pagado.`,
        href: "/admin",
        createdAt: o.updatedAt,
        readAt: leidoEn,
      });
    }

    for (const u of usuarios) {
      filas.push({
        id: `bf-ur-${u.id}-${admin.id}`,
        userId: admin.id,
        type: "USER_REGISTERED",
        title:
          u.role === "CREATOR"
            ? "Nuevo creador registrado"
            : "Nuevo usuario registrado",
        body: u.name || "Cuenta nueva en RCKTDMG",
        href: "/admin/usuarios",
        createdAt: u.createdAt,
        readAt: leidoEn,
      });
    }
  }

  /* ─────────── CREADOR ─────────── */

  const propios = await prisma.product.findMany({
    where: { status: { in: ["PUBLISHED", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      rejectionReason: true,
      creatorId: true,
      updatedAt: true,
    },
  });

  for (const p of propios) {
    if (p.status === "PUBLISHED") {
      filas.push({
        id: `bf-pub-${p.id}`,
        userId: p.creatorId,
        type: "PRODUCT_PUBLISHED",
        title: "Recurso publicado",
        body: `${p.name} ya está visible en la tienda.`,
        href: `/tienda/${p.slug}`,
        createdAt: p.updatedAt,
        readAt: leidoEn,
      });
    } else {
      filas.push({
        id: `bf-rej-${p.id}`,
        userId: p.creatorId,
        type: "PRODUCT_REJECTED",
        title: "Recurso rechazado",
        body: p.rejectionReason || p.name,
        href: `/creadores/productos/${p.id}`,
        createdAt: p.updatedAt,
        readAt: leidoEn,
      });
    }
  }

  const ventas = await prisma.orderItem.findMany({
    where: { order: { status: "PAID" } },
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      creatorAmount: true,
      createdAt: true,
      product: { select: { name: true, creatorId: true } },
    },
  });

  for (const v of ventas) {
    filas.push({
      id: `bf-sale-${v.id}`,
      userId: v.product.creatorId,
      type: "SALE",
      title: "Nueva venta",
      body: `${v.product.name} · ${soles(v.creatorAmount)} para ti.`,
      href: "/creadores/panel",
      createdAt: v.createdAt,
      readAt: leidoEn,
    });
  }

  const favoritos = await prisma.favorite.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: {
      userId: true,
      productId: true,
      createdAt: true,
      product: { select: { name: true, slug: true, creatorId: true } },
    },
  });

  for (const f of favoritos) {
    // El mismo criterio que en vivo: nadie se avisa a sí mismo.
    if (f.product.creatorId === f.userId) continue;

    filas.push({
      id: `bf-fav-${f.userId}-${f.productId}`,
      userId: f.product.creatorId,
      type: "FAVORITE",
      title: "Nuevo favorito",
      body: `Alguien guardó ${f.product.name}.`,
      href: `/tienda/${f.product.slug}`,
      createdAt: f.createdAt,
      readAt: leidoEn,
    });
  }

  const seguidores = await prisma.follow.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: { followerId: true, creatorId: true, createdAt: true },
  });

  for (const s of seguidores) {
    filas.push({
      id: `bf-fol-${s.followerId}-${s.creatorId}`,
      userId: s.creatorId,
      type: "FOLLOW",
      title: "Nuevo seguidor",
      body: "Un usuario comenzó a seguirte.",
      href: "/creadores/panel/seguidores",
      createdAt: s.createdAt,
      readAt: leidoEn,
    });
  }

  const retirosResueltos = await prisma.withdrawal.findMany({
    where: { status: { in: ["APPROVED", "REJECTED", "PAID"] } },
    orderBy: { createdAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      creatorId: true,
      amount: true,
      status: true,
      note: true,
      createdAt: true,
      processedAt: true,
    },
  });

  const copiaRetiro = {
    APPROVED: "Retiro aprobado",
    REJECTED: "Retiro rechazado",
    PAID: "Retiro pagado",
    REQUESTED: "Retiro solicitado",
  } as const;

  for (const r of retirosResueltos) {
    filas.push({
      id: `bf-wu-${r.id}`,
      userId: r.creatorId,
      type: "WITHDRAWAL_UPDATED",
      title: copiaRetiro[r.status],
      body:
        r.status === "REJECTED" && r.note ? r.note : soles(r.amount),
      href: "/creadores/panel/retiros",
      createdAt: r.processedAt ?? r.createdAt,
      readAt: leidoEn,
    });
  }

  /* ─────────── CLIENTE ─────────── */

  const pedidos = await prisma.order.findMany({
    orderBy: { updatedAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      userId: true,
      total: true,
      status: true,
      updatedAt: true,
    },
  });

  for (const o of pedidos) {
    if (o.status === "PENDING") continue;

    filas.push({
      id: `bf-ord-${o.id}`,
      userId: o.userId,
      type: o.status === "PAID" ? "ORDER_PAID" : "ORDER_UPDATED",
      title:
        o.status === "PAID"
          ? "Compra confirmada"
          : o.status === "CANCELED"
            ? "Pedido cancelado"
            : "Pedido reembolsado",
      body: `Tu pedido de ${soles(o.total)}.`,
      href: "/mi-cuenta/compras",
      createdAt: o.updatedAt,
      readAt: leidoEn,
    });
  }

  const descargas = await prisma.download.findMany({
    where: { status: "ACTIVE", order: { status: "PAID" } },
    orderBy: { id: "desc" },
    take: LIMITE,
    select: {
      id: true,
      userId: true,
      product: { select: { name: true } },
      order: { select: { updatedAt: true } },
    },
  });

  for (const d of descargas) {
    filas.push({
      id: `bf-dl-${d.id}`,
      userId: d.userId,
      type: "DOWNLOAD_READY",
      title: "Descarga disponible",
      body: d.product.name,
      href: "/mi-cuenta/descargas",
      createdAt: d.order.updatedAt,
      readAt: leidoEn,
    });
  }

  /* ─────────── ESCRITURA ─────────── */

  const resultado = await prisma.notification.createMany({
    data: filas,
    skipDuplicates: true,
  });

  const total = await prisma.notification.count();

  console.log(`candidatas    : ${filas.length}`);
  console.log(`insertadas    : ${resultado.count}`);
  console.log(`ya existentes : ${filas.length - resultado.count}`);
  console.log(`total en tabla: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
