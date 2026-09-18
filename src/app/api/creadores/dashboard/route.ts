import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
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

        if (session.role !== "CREATOR" && session.role !== "ADMIN") {
            return NextResponse.json(
                { error: "No tienes permisos para acceder al dashboard." },
                { status: 403 }
            );
        }

        const userId = session.userId;

        // =========================
        // DATOS DEL CREADOR
        // =========================

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                name: true,
                email: true,
            },
        });

        // =========================
        // RECURSOS
        // =========================

        const [
            totalResources,
            publishedResources,
            pendingResources,
            rejectedResources,
            draftResources,
            archivedResources,
        ] = await Promise.all([
            prisma.product.count({
                where: {
                    creatorId: userId,
                },
            }),

            prisma.product.count({
                where: {
                    creatorId: userId,
                    status: "PUBLISHED",
                },
            }),

            prisma.product.count({
                where: {
                    creatorId: userId,
                    status: "PENDING_REVIEW",
                },
            }),

            prisma.product.count({
                where: {
                    creatorId: userId,
                    status: "REJECTED",
                },
            }),

            prisma.product.count({
                where: {
                    creatorId: userId,
                    status: "DRAFT",
                },
            }),

            prisma.product.count({
                where: {
                    creatorId: userId,
                    status: "ARCHIVED",
                },
            }),
        ]);

        // =========================
        // DESCARGAS
        // =========================

        const downloadsResult = await prisma.download.aggregate({
            where: {
                product: {
                    creatorId: userId,
                },
            },
            _sum: {
                downloadCount: true,
            },
        });

        const downloads = downloadsResult._sum.downloadCount ?? 0;

        // =========================
        // FAVORITOS
        // =========================

        const favorites = await prisma.favorite.count({
            where: {
                product: {
                    creatorId: userId,
                },
            },
        });

        // =========================
        // VENTAS
        // =========================

        const paidItems = await prisma.orderItem.findMany({
            where: {
                product: {
                    creatorId: userId,
                },
                order: {
                    status: "PAID",
                },
            },
            select: {
                id: true,
                price: true,
                quantity: true,
                createdAt: true,
                product: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                },
                order: {
                    select: {
                        id: true,
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

        let revenue = 0;
        let sales = 0;

        for (const item of paidItems) {
            revenue += Number(item.price) * item.quantity;
            sales += item.quantity;
        }

        // =========================
        // VENTAS RECIENTES
        // =========================
        // =========================
        // EVOLUCIÓN DE LOS ÚLTIMOS 6 MESES
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
                label: label.charAt(0).toUpperCase() + label.slice(1),
                revenue: 0,
                sales: 0,
                downloads: 0,
            });
        }

        // Ventas e ingresos por mes
        for (const item of paidItems) {
            const date = new Date(item.createdAt);

            const key = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;

            const month = monthlyMap.get(key);

            if (month) {
                month.revenue += Number(item.price) * item.quantity;
                month.sales += item.quantity;
            }
        }

        // Descargas por mes
        const creatorDownloads = await prisma.download.findMany({
            where: {
                product: {
                    creatorId: userId,
                },
            },
            select: {
                downloadCount: true,
                order: {
                    select: {
                        createdAt: true,
                    },
                },
            },
        });

        for (const download of creatorDownloads) {
            const date = new Date(download.order.createdAt);

            const key = `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;

            const month = monthlyMap.get(key);

            if (month) {
                month.downloads += download.downloadCount;
            }
        }

        const monthlyStats = Array.from(monthlyMap.entries()).map(
            ([key, value]) => ({
                month: key,
                label: value.label,
                revenue: value.revenue,
                sales: value.sales,
                downloads: value.downloads,
            })
        );

        // =========================
        // PRODUCTOS MÁS VENDIDOS
        // =========================

        const productSalesMap = new Map<
            string,
            {
                productId: string;
                productName: string;
                productSlug: string;
                sales: number;
                revenue: number;
            }
        >();

        for (const item of paidItems) {
            const existing = productSalesMap.get(item.product.id);

            const itemRevenue =
                Number(item.price) * item.quantity;

            if (existing) {
                existing.sales += item.quantity;
                existing.revenue += itemRevenue;
            } else {
                productSalesMap.set(item.product.id, {
                    productId: item.product.id,
                    productName: item.product.name,
                    productSlug: item.product.slug,
                    sales: item.quantity,
                    revenue: itemRevenue,
                });
            }
        }

        const topProducts = Array.from(
            productSalesMap.values()
        )
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 5);

        const recentSales = paidItems.slice(0, 5).map((item) => ({

            id: item.id,
            productId: item.product.id,
            productName: item.product.name,
            productSlug: item.product.slug,
            quantity: item.quantity,
            amount: Number(item.price) * item.quantity,
            buyerName: item.order.user.name || item.order.user.email,
            createdAt: item.createdAt.toISOString(),
        }));

        // =========================
        // RECURSOS RECIENTES
        // =========================

        const recentProducts = await prisma.product.findMany({
            where: {
                creatorId: userId,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                price: true,
                createdAt: true,
                coverUrl: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 5,
        });

        return NextResponse.json({
            creator: {
                name: user?.name || "Creador",
                email: user?.email || "",
            },

            stats: {
                totalResources,
                publishedResources,
                pendingResources,
                rejectedResources,
                draftResources,
                archivedResources,
                sales,
                downloads,
                favorites,
                revenue,
            },

            monthlyStats,

            topProducts,

            recentSales,

            recentProducts: recentProducts.map((product) => ({
                id: product.id,
                name: product.name,
                slug: product.slug,
                status: product.status,
                price: Number(product.price),
                coverUrl: product.coverUrl,
                createdAt: product.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("ERROR DASHBOARD CREADOR:", error);

        return NextResponse.json(
            {
                error: "No se pudo cargar el dashboard del creador.",
            },
            {
                status: 500,
            }
        );
    }
}