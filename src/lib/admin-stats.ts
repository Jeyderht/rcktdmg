import { prisma } from "@/lib/prisma";

/**
 * Métricas del panel de administración.
 *
 * Todo sale de PostgreSQL vía Prisma: no hay ningún valor
 * inventado ni de ejemplo. Si un dato no se puede calcular
 * con los modelos actuales, simplemente no se devuelve.
 *
 * La fecha de venta que se usa es `Order.createdAt` (cuándo
 * se realizó la compra), que es el único campo estable para
 * fechar un pedido con el esquema actual.
 */

export type MonthPoint = {
  key: string;
  label: string;
  sales: number;
  gross: number;
  platformFee: number;
  creatorAmount: number;
};

export type RecentSale = {
  id: string;
  orderId: string;
  productName: string;
  productSlug: string;
  buyer: string;
  creator: string;
  createdAt: Date;
  amount: number;
  orderStatus: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  tone: "neutral" | "success" | "warning" | "danger";
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

export async function getAdminStats() {
  const now = new Date();

  const dayStart = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Ventana de 12 meses para las series mensuales.
  const seriesStart = new Date(
    now.getFullYear(),
    now.getMonth() - 11,
    1
  );

  const [
    usersByRole,
    creatorsByStatus,
    productsByStatus,
    ordersByStatus,
    paidTotals,
    itemTotals,
    dayAgg,
    monthAgg,
    yearAgg,
    pendingWithdrawals,
    paidOrdersForSeries,
    recentItems,
    topProducts,
    topCreators,
    recentUsers,
    recentProducts,
    recentFavorites,
    recentWithdrawals,
    newUsersForSeries,
  ] = await Promise.all([
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),

    prisma.user.groupBy({
      by: ["creatorStatus"],
      where: { role: "CREATOR" },
      _count: { _all: true },
    }),

    prisma.product.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { total: true },
    }),

    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
      _count: { _all: true },
    }),

    prisma.orderItem.aggregate({
      where: { order: { status: "PAID" } },
      _sum: { platformFee: true, creatorAmount: true, quantity: true },
    }),

    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: dayStart } },
      _sum: { total: true },
      _count: { _all: true },
    }),

    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: { _all: true },
    }),

    prisma.order.aggregate({
      where: { status: "PAID", createdAt: { gte: yearStart } },
      _sum: { total: true },
      _count: { _all: true },
    }),

    prisma.withdrawal.aggregate({
      where: { status: "REQUESTED" },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    prisma.order.findMany({
      where: { status: "PAID", createdAt: { gte: seriesStart } },
      select: {
        createdAt: true,
        total: true,
        items: {
          select: { platformFee: true, creatorAmount: true },
        },
      },
    }),

    prisma.orderItem.findMany({
      where: { order: { status: "PAID" } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderId: true,
        price: true,
        quantity: true,
        createdAt: true,
        order: {
          select: {
            status: true,
            user: { select: { name: true, email: true } },
          },
        },
        product: {
          select: {
            name: true,
            slug: true,
            creator: { select: { name: true, email: true } },
          },
        },
      },
    }),

    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { status: "PAID" } },
      _sum: { quantity: true, price: true },
      _count: { _all: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    prisma.orderItem.findMany({
      where: { order: { status: "PAID" } },
      select: {
        price: true,
        quantity: true,
        creatorAmount: true,
        product: {
          select: {
            creatorId: true,
            creator: { select: { name: true, email: true } },
          },
        },
      },
    }),

    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),

    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        creator: { select: { name: true, email: true } },
      },
    }),

    prisma.favorite.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        userId: true,
        productId: true,
        createdAt: true,
        product: { select: { name: true } },
      },
    }),

    prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        creator: { select: { name: true, email: true } },
      },
    }),

    prisma.user.findMany({
      where: { createdAt: { gte: seriesStart } },
      select: { createdAt: true },
    }),
  ]);

  // ---------- CONTEOS ----------

  const countRole = (role: string) =>
    usersByRole.find((row) => row.role === role)?._count._all ?? 0;

  const countCreatorStatus = (status: string) =>
    creatorsByStatus.find((row) => row.creatorStatus === status)
      ?._count._all ?? 0;

  const countProductStatus = (status: string) =>
    productsByStatus.find((row) => row.status === status)?._count
      ._all ?? 0;

  const orderStatusRow = (status: string) =>
    ordersByStatus.find((row) => row.status === status);

  // ---------- SERIES MENSUALES ----------

  const months: MonthPoint[] = [];

  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - index,
      1
    );

    months.push({
      key: monthKey(date),
      label: new Intl.DateTimeFormat("es-PE", {
        month: "short",
      }).format(date),
      sales: 0,
      gross: 0,
      platformFee: 0,
      creatorAmount: 0,
    });
  }

  const monthIndex = new Map(
    months.map((month, index) => [month.key, index])
  );

  for (const order of paidOrdersForSeries) {
    const index = monthIndex.get(monthKey(order.createdAt));

    if (index === undefined) continue;

    const point = months[index];

    point.sales += 1;
    point.gross += Number(order.total);

    for (const item of order.items) {
      point.platformFee += Number(item.platformFee);
      point.creatorAmount += Number(item.creatorAmount);
    }
  }

  const newUsersByMonth = months.map((month) => ({
    key: month.key,
    label: month.label,
    count: 0,
  }));

  const newUserIndex = new Map(
    newUsersByMonth.map((month, index) => [month.key, index])
  );

  for (const user of newUsersForSeries) {
    const index = newUserIndex.get(monthKey(user.createdAt));

    if (index !== undefined) {
      newUsersByMonth[index].count += 1;
    }
  }

  // ---------- CREADORES POR VOLUMEN DE VENTAS ----------

  const creatorVolume = new Map<
    string,
    { name: string; sales: number; revenue: number }
  >();

  for (const item of topCreators) {
    const id = item.product.creatorId;

    const current = creatorVolume.get(id) ?? {
      name: item.product.creator.name || item.product.creator.email,
      sales: 0,
      revenue: 0,
    };

    current.sales += item.quantity;
    current.revenue += Number(item.creatorAmount);

    creatorVolume.set(id, current);
  }

  const creatorsByVolume = [...creatorVolume.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  // ---------- RECURSOS MÁS VENDIDOS ----------

  const topProductIds = topProducts.map((row) => row.productId);

  const topProductRecords =
    topProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];

  const topProductMap = new Map(
    topProductRecords.map((product) => [product.id, product])
  );

  const bestSellers = topProducts
    .map((row) => {
      const product = topProductMap.get(row.productId);

      if (!product) return null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sales: row._sum.quantity ?? 0,
        revenue: Number(row._sum.price ?? 0),
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    slug: string;
    sales: number;
    revenue: number;
  }[];

  // ---------- ÚLTIMAS VENTAS ----------

  const recentSales: RecentSale[] = recentItems.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    productName: item.product.name,
    productSlug: item.product.slug,
    buyer: item.order.user.name || item.order.user.email,
    creator:
      item.product.creator.name || item.product.creator.email,
    createdAt: item.createdAt,
    amount: Number(item.price) * item.quantity,
    orderStatus: item.order.status,
  }));

  // ---------- ACTIVIDAD RECIENTE ----------

  const productStatusCopy: Record<
    string,
    { title: string; tone: ActivityItem["tone"] }
  > = {
    PUBLISHED: { title: "Recurso publicado", tone: "success" },
    PENDING_REVIEW: {
      title: "Recurso enviado a revisión",
      tone: "warning",
    },
    REJECTED: { title: "Recurso rechazado", tone: "danger" },
    DRAFT: { title: "Recurso en borrador", tone: "neutral" },
    ARCHIVED: { title: "Recurso archivado", tone: "neutral" },
  };

  const withdrawalCopy: Record<
    string,
    { title: string; tone: ActivityItem["tone"] }
  > = {
    REQUESTED: { title: "Retiro solicitado", tone: "warning" },
    APPROVED: { title: "Retiro aprobado", tone: "success" },
    REJECTED: { title: "Retiro rechazado", tone: "danger" },
    PAID: { title: "Retiro pagado", tone: "success" },
  };

  const activity: ActivityItem[] = [
    ...recentSales.slice(0, 5).map((sale) => ({
      id: `sale-${sale.id}`,
      title: "Nueva venta",
      description: `${sale.productName} · ${sale.buyer}`,
      createdAt: sale.createdAt,
      tone: "success" as const,
    })),

    ...recentUsers.map((user) => ({
      id: `user-${user.id}`,
      title:
        user.role === "CREATOR"
          ? "Nuevo creador"
          : "Nuevo usuario registrado",
      description: user.name || user.email,
      createdAt: user.createdAt,
      tone: "neutral" as const,
    })),

    ...recentProducts.map((product) => {
      const copy =
        productStatusCopy[product.status] ??
        productStatusCopy.DRAFT;

      return {
        id: `product-${product.id}`,
        title: copy.title,
        description: `${product.name} · ${
          product.creator.name || product.creator.email
        }`,
        createdAt: product.updatedAt,
        tone: copy.tone,
      };
    }),

    ...recentFavorites.map((favorite) => ({
      id: `fav-${favorite.userId}-${favorite.productId}`,
      title: "Nuevo favorito",
      description: favorite.product.name,
      createdAt: favorite.createdAt,
      tone: "neutral" as const,
    })),

    ...recentWithdrawals.map((withdrawal) => {
      const copy =
        withdrawalCopy[withdrawal.status] ??
        withdrawalCopy.REQUESTED;

      return {
        id: `withdrawal-${withdrawal.id}`,
        title: copy.title,
        description: `S/ ${Number(withdrawal.amount).toFixed(
          2
        )} · ${
          withdrawal.creator.name || withdrawal.creator.email
        }`,
        createdAt: withdrawal.createdAt,
        tone: copy.tone,
      };
    }),
  ]
    .sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    .slice(0, 10);

  return {
    sales: {
      day: {
        count: dayAgg._count._all,
        total: Number(dayAgg._sum.total ?? 0),
      },
      month: {
        count: monthAgg._count._all,
        total: Number(monthAgg._sum.total ?? 0),
      },
      year: {
        count: yearAgg._count._all,
        total: Number(yearAgg._sum.total ?? 0),
      },
      allTime: {
        count: paidTotals._count._all,
        total: Number(paidTotals._sum.total ?? 0),
      },
    },

    revenue: {
      gross: Number(paidTotals._sum.total ?? 0),
      platformFee: Number(itemTotals._sum.platformFee ?? 0),
      creatorAmount: Number(itemTotals._sum.creatorAmount ?? 0),
      unitsSold: itemTotals._sum.quantity ?? 0,
    },

    withdrawals: {
      pendingCount: pendingWithdrawals._count._all,
      pendingAmount: Number(pendingWithdrawals._sum.amount ?? 0),
    },

    users: {
      total: usersByRole.reduce(
        (sum, row) => sum + row._count._all,
        0
      ),
      clients: countRole("CLIENT"),
      creators: countRole("CREATOR"),
      admins: countRole("ADMIN"),
      newByMonth: newUsersByMonth,
    },

    creators: {
      approved: countCreatorStatus("APPROVED"),
      pending: countCreatorStatus("PENDING"),
      suspended: countCreatorStatus("SUSPENDED"),
      rejected: countCreatorStatus("REJECTED"),
      byVolume: creatorsByVolume,
    },

    products: {
      total: productsByStatus.reduce(
        (sum, row) => sum + row._count._all,
        0
      ),
      published: countProductStatus("PUBLISHED"),
      pending: countProductStatus("PENDING_REVIEW"),
      draft: countProductStatus("DRAFT"),
      rejected: countProductStatus("REJECTED"),
      archived: countProductStatus("ARCHIVED"),
      bestSellers,
    },

    orders: {
      pending: {
        count: orderStatusRow("PENDING")?._count._all ?? 0,
        total: Number(orderStatusRow("PENDING")?._sum.total ?? 0),
      },
      paid: {
        count: orderStatusRow("PAID")?._count._all ?? 0,
        total: Number(orderStatusRow("PAID")?._sum.total ?? 0),
      },
      canceled: {
        count: orderStatusRow("CANCELED")?._count._all ?? 0,
        total: Number(orderStatusRow("CANCELED")?._sum.total ?? 0),
      },
      refunded: {
        count: orderStatusRow("REFUNDED")?._count._all ?? 0,
        total: Number(orderStatusRow("REFUNDED")?._sum.total ?? 0),
      },
    },

    months,
    recentSales,
    activity,
  };
}

export type AdminStats = Awaited<ReturnType<typeof getAdminStats>>;
