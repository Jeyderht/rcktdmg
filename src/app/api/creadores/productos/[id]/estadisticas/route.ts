import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // =========================
    // AUTENTICACIÓN
    // =========================

    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "La sesión no es válida o ha expirado." },
        { status: 401 }
      );
    }

    if (
      session.role !== "CREATOR" &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para acceder a estas estadísticas.",
        },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = session.userId;

    // =========================
    // PRODUCTO
    // =========================

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        status: true,
        coverUrl: true,
        createdAt: true,
        creatorId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    // Un creador solamente puede ver sus propios recursos.
    if (
      session.role !== "ADMIN" &&
      product.creatorId !== userId
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para ver este recurso.",
        },
        { status: 403 }
      );
    }

    // =========================
    // VENTAS
    // =========================

    const paidItems = await prisma.orderItem.findMany({
      where: {
        productId: product.id,
        order: {
          status: "PAID",
        },
      },
      select: {
        id: true,
        price: true,
        quantity: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let sales = 0;
    let revenue = 0;

    for (const item of paidItems) {
      sales += item.quantity;
      revenue += Number(item.price) * item.quantity;
    }

    // =========================
    // DESCARGAS
    // =========================

    const downloads = await prisma.download.findMany({
      where: {
        productId: product.id,
      },
      select: {
        id: true,
        downloadCount: true,
        status: true,
        order: {
          select: {
            createdAt: true,
          },
        },
      },
    });

    const totalDownloads = downloads.reduce(
      (total, download) =>
        total + download.downloadCount,
      0
    );

    // =========================
    // FAVORITOS
    // =========================

    const favorites = await prisma.favorite.count({
      where: {
        productId: product.id,
      },
    });

    // =========================
    // ESTADÍSTICAS MENSUALES
    // =========================

    const now = new Date();

    const monthlyMap = new Map<
      string,
      {
        label: string;
        revenue: number;
        sales: number;
        downloads: number;
      }
    >();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const label = new Intl.DateTimeFormat("es-PE", {
        month: "short",
      }).format(date);

      monthlyMap.set(key, {
        label:
          label.charAt(0).toUpperCase() +
          label.slice(1),
        revenue: 0,
        sales: 0,
        downloads: 0,
      });
    }

    // Ventas por mes
    for (const item of paidItems) {
      const date = new Date(item.createdAt);

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const month = monthlyMap.get(key);

      if (month) {
        month.revenue +=
          Number(item.price) * item.quantity;

        month.sales += item.quantity;
      }
    }

    // Descargas por mes
    for (const download of downloads) {
      const date = new Date(
        download.order.createdAt
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const month = monthlyMap.get(key);

      if (month) {
        month.downloads += download.downloadCount;
      }
    }

    const monthlyStats = Array.from(
      monthlyMap.entries()
    ).map(([month, value]) => ({
      month,
      label: value.label,
      revenue: value.revenue,
      sales: value.sales,
      downloads: value.downloads,
    }));

    // =========================
    // VENTAS RECIENTES
    // =========================

    const recentSales = paidItems
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        quantity: item.quantity,
        amount:
          Number(item.price) * item.quantity,
        buyerName:
          item.order.user.name ||
          item.order.user.email,
        createdAt:
          item.createdAt.toISOString(),
      }));

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        status: product.status,
        coverUrl: product.coverUrl,
        createdAt: product.createdAt.toISOString(),
      },

      stats: {
        sales,
        revenue,
        downloads: totalDownloads,
        favorites,
      },

      monthlyStats,

      recentSales,
    });
  } catch (error) {
    console.error(
      "ERROR ESTADÍSTICAS PRODUCTO:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron cargar las estadísticas del recurso.",
      },
      {
        status: 500,
      }
    );
  }
}