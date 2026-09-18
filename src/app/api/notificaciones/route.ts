import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Centro de notificaciones.
 *
 * IMPORTANTE: el esquema no tiene un modelo `Notification`,
 * así que aquí NO se inventa nada. Cada elemento se deriva
 * de un registro que ya existe en la base de datos (pedidos,
 * productos, retiros, favoritos, usuarios) y enlaza a una
 * ruta real de la aplicación.
 *
 * Consecuencia de no tener tabla: el estado leído/no leído
 * no puede guardarse en el servidor. El cliente lo gestiona
 * de forma local. Para notificaciones persistentes hace
 * falta añadir el modelo `Notification` a Prisma.
 */

type NotificationTone = "neutral" | "success" | "warning" | "danger";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  tone: NotificationTone;
};

const LIMIT = 8;

function money(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

async function getAdminNotifications(): Promise<NotificationItem[]> {
  const [pendingProducts, withdrawals, paidOrders, newUsers] =
    await Promise.all([
      prisma.product.findMany({
        where: { status: "PENDING_REVIEW" },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          name: true,
          updatedAt: true,
          creator: { select: { name: true, email: true } },
        },
      }),

      prisma.withdrawal.findMany({
        where: { status: "REQUESTED" },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          creator: { select: { name: true, email: true } },
        },
      }),

      prisma.order.findMany({
        where: { status: "PAID" },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          total: true,
          updatedAt: true,
          user: { select: { name: true, email: true } },
        },
      }),

      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

  return [
    ...pendingProducts.map((product) => ({
      id: `product-review-${product.id}`,
      title: "Recurso enviado a revisión",
      description: `${product.name} · ${
        product.creator.name || product.creator.email
      }`,
      createdAt: product.updatedAt.toISOString(),
      href: `/admin/recursos/${product.id}`,
      tone: "warning" as const,
    })),

    ...withdrawals.map((withdrawal) => ({
      id: `withdrawal-${withdrawal.id}`,
      title: "Nueva solicitud de retiro",
      description: `${money(Number(withdrawal.amount))} · ${
        withdrawal.creator.name || withdrawal.creator.email
      }`,
      createdAt: withdrawal.createdAt.toISOString(),
      href: "/admin/retiros",
      tone: "warning" as const,
    })),

    ...paidOrders.map((order) => ({
      id: `order-paid-${order.id}`,
      title: "Nuevo pedido pagado",
      description: `${money(Number(order.total))} · ${
        order.user.name || order.user.email
      }`,
      createdAt: order.updatedAt.toISOString(),
      href: "/admin",
      tone: "success" as const,
    })),

    ...newUsers.map((user) => ({
      id: `user-new-${user.id}`,
      title:
        user.role === "CREATOR"
          ? "Nuevo creador registrado"
          : "Nuevo usuario registrado",
      description: user.name || user.email,
      createdAt: user.createdAt.toISOString(),
      href:
        user.role === "CREATOR"
          ? "/admin/usuarios?rol=CREATOR"
          : "/admin/usuarios",
      tone: "neutral" as const,
    })),
  ];
}

async function getCreatorNotifications(
  userId: string
): Promise<NotificationItem[]> {
  const [products, sales, favorites, withdrawals] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          creatorId: userId,
          status: { in: ["PUBLISHED", "REJECTED", "PENDING_REVIEW"] },
        },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          updatedAt: true,
          rejectionReason: true,
        },
      }),

      prisma.orderItem.findMany({
        where: {
          product: { creatorId: userId },
          order: { status: "PAID" },
        },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          creatorAmount: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
        },
      }),

      prisma.favorite.findMany({
        where: { product: { creatorId: userId } },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          userId: true,
          productId: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
        },
      }),

      prisma.withdrawal.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        take: LIMIT,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          processedAt: true,
        },
      }),
    ]);

  const withdrawalCopy: Record<
    string,
    { title: string; tone: NotificationTone }
  > = {
    REQUESTED: { title: "Retiro solicitado", tone: "neutral" },
    APPROVED: { title: "Retiro aprobado", tone: "success" },
    REJECTED: { title: "Retiro rechazado", tone: "danger" },
    PAID: { title: "Retiro pagado", tone: "success" },
  };

  return [
    ...products.map((product) => {
      if (product.status === "PUBLISHED") {
        return {
          id: `my-product-${product.id}-published`,
          title: "Recurso publicado",
          description: product.name,
          createdAt: product.updatedAt.toISOString(),
          href: `/tienda/${product.slug}`,
          tone: "success" as const,
        };
      }

      if (product.status === "REJECTED") {
        return {
          id: `my-product-${product.id}-rejected`,
          title: "Recurso rechazado",
          description:
            product.rejectionReason || product.name,
          createdAt: product.updatedAt.toISOString(),
          href: `/creadores/productos/${product.id}`,
          tone: "danger" as const,
        };
      }

      return {
        id: `my-product-${product.id}-review`,
        title: "Recurso en revisión",
        description: product.name,
        createdAt: product.updatedAt.toISOString(),
        href: `/creadores/productos/${product.id}`,
        tone: "warning" as const,
      };
    }),

    ...sales.map((sale) => ({
      id: `sale-${sale.id}`,
      title: "Nueva venta",
      description: `${sale.product.name} · ${money(
        Number(sale.creatorAmount)
      )} para ti`,
      createdAt: sale.createdAt.toISOString(),
      href: "/creadores/panel",
      tone: "success" as const,
    })),

    ...favorites.map((favorite) => ({
      id: `fav-${favorite.userId}-${favorite.productId}`,
      title: "Nuevo favorito",
      description: favorite.product.name,
      createdAt: favorite.createdAt.toISOString(),
      href: `/tienda/${favorite.product.slug}`,
      tone: "neutral" as const,
    })),

    ...withdrawals.map((withdrawal) => {
      const copy =
        withdrawalCopy[withdrawal.status] ??
        withdrawalCopy.REQUESTED;

      return {
        id: `my-withdrawal-${withdrawal.id}-${withdrawal.status}`,
        title: copy.title,
        description: money(Number(withdrawal.amount)),
        createdAt: (
          withdrawal.processedAt ?? withdrawal.createdAt
        ).toISOString(),
        href: "/creadores/panel/retiros",
        tone: copy.tone,
      };
    }),
  ];
}

async function getClientNotifications(
  userId: string
): Promise<NotificationItem[]> {
  const [orders, downloads] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        total: true,
        status: true,
        updatedAt: true,
      },
    }),

    prisma.download.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { id: "desc" },
      take: LIMIT,
      select: {
        id: true,
        downloadCount: true,
        product: { select: { name: true } },
        order: { select: { status: true, updatedAt: true } },
      },
    }),
  ]);

  const orderCopy: Record<
    string,
    { title: string; tone: NotificationTone }
  > = {
    PENDING: { title: "Pedido pendiente de pago", tone: "warning" },
    PAID: { title: "Compra confirmada", tone: "success" },
    CANCELED: { title: "Pedido cancelado", tone: "danger" },
    REFUNDED: { title: "Pedido reembolsado", tone: "neutral" },
  };

  return [
    ...orders.map((order) => {
      const copy = orderCopy[order.status] ?? orderCopy.PENDING;

      return {
        id: `my-order-${order.id}-${order.status}`,
        title: copy.title,
        description: money(Number(order.total)),
        createdAt: order.updatedAt.toISOString(),
        href: "/mi-cuenta/compras",
        tone: copy.tone,
      };
    }),

    ...downloads
      .filter((download) => download.order.status === "PAID")
      .map((download) => ({
        id: `my-download-${download.id}`,
        title:
          download.downloadCount > 0
            ? "Descarga disponible"
            : "Nueva descarga disponible",
        description: download.product.name,
        createdAt: download.order.updatedAt.toISOString(),
        href: "/mi-cuenta/descargas",
        tone: "success" as const,
      })),
  ];
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { notifications: [] },
        { status: 401 }
      );
    }

    let items: NotificationItem[] = [];

    if (session.role === "ADMIN") {
      items = await getAdminNotifications();
    } else if (session.role === "CREATOR") {
      items = await getCreatorNotifications(session.userId);
    } else {
      items = await getClientNotifications(session.userId);
    }

    // Más recientes primero.
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      notifications: items.slice(0, 20),
    });
  } catch (error) {
    console.error("GET /api/notificaciones:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las notificaciones." },
      { status: 500 }
    );
  }
}
