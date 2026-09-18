import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
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
            "No tienes permisos para consultar tus ganancias.",
        },
        { status: 403 }
      );
    }

    const userId = session.userId;

    // =========================
    // PRODUCTOS DEL CREADOR
    // =========================

    const products = await prisma.product.findMany({
      where:
        session.role === "ADMIN"
          ? {}
          : {
              creatorId: userId,
            },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const productIds = products.map(
      (product) => product.id
    );

    // =========================
    // VENTAS PAGADAS
    // =========================

    const paidItems = await prisma.orderItem.findMany({
      where: {
        productId: {
          in: productIds,
        },
        order: {
          status: "PAID",
        },
      },
      select: {
        id: true,
        productId: true,
        price: true,
        quantity: true,
        commissionRate: true,
        platformFee: true,
        creatorAmount: true,
        createdAt: true,
        product: {
          select: {
            name: true,
          },
        },
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

    // =========================
    // TOTALES
    // =========================

    let grossRevenue = 0;
    let platformFees = 0;
    let creatorEarnings = 0;
    let totalSales = 0;

    for (const item of paidItems) {
      const gross =
        Number(item.price) * item.quantity;

      grossRevenue += gross;
      totalSales += item.quantity;

      // Solo contamos como ganancia reconocida
      // los OrderItem que ya tienen distribución financiera.
      platformFees += Number(item.platformFee);
      creatorEarnings += Number(item.creatorAmount);
    }

    // =========================
    // GANANCIAS MENSUALES
    // =========================

    const now = new Date();

    const monthlyMap = new Map<
      string,
      {
        label: string;
        grossRevenue: number;
        platformFees: number;
        creatorEarnings: number;
        sales: number;
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

      const label = new Intl.DateTimeFormat(
        "es-PE",
        {
          month: "short",
        }
      ).format(date);

      monthlyMap.set(key, {
        label:
          label.charAt(0).toUpperCase() +
          label.slice(1),
        grossRevenue: 0,
        platformFees: 0,
        creatorEarnings: 0,
        sales: 0,
      });
    }

    for (const item of paidItems) {
      const date = new Date(item.createdAt);

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      const month = monthlyMap.get(key);

      if (!month) continue;

      const gross =
        Number(item.price) * item.quantity;

      month.grossRevenue += gross;
      month.platformFees += Number(
        item.platformFee
      );
      month.creatorEarnings += Number(
        item.creatorAmount
      );
      month.sales += item.quantity;
    }

    const monthlyEarnings = Array.from(
      monthlyMap.entries()
    ).map(([month, value]) => ({
      month,
      label: value.label,
      grossRevenue: value.grossRevenue,
      platformFees: value.platformFees,
      creatorEarnings: value.creatorEarnings,
      sales: value.sales,
    }));

    // =========================
    // ÚLTIMAS GANANCIAS
    // =========================

    const recentEarnings = paidItems
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: Number(item.price),
        grossAmount:
          Number(item.price) * item.quantity,
        commissionRate:
          Number(item.commissionRate),
        platformFee:
          Number(item.platformFee),
        creatorAmount:
          Number(item.creatorAmount),
        buyerName:
          item.order.user.name ||
          item.order.user.email,
        createdAt:
          item.createdAt.toISOString(),
      }));

    // =========================
    // RESPUESTA
    // =========================

    return NextResponse.json({
      summary: {
        grossRevenue,
        platformFees,
        creatorEarnings,
        totalSales,
      },

      monthlyEarnings,

      recentEarnings,
    });
  } catch (error) {
    console.error(
      "ERROR GANANCIAS CREADOR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron cargar las ganancias del creador.",
      },
      { status: 500 }
    );
  }
}