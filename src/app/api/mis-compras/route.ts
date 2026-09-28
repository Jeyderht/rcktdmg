import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("rcktdmg_session")?.value;

        if (!token) {
            return NextResponse.json(
                { error: "Debes iniciar sesión." },
                { status: 401 }
            );
        }

        const session = await verifySessionToken(token);

        if (!session || typeof session.userId !== "string") {
            return NextResponse.json(
                { error: "Sesión inválida o expirada." },
                { status: 401 }
            );
        }

        const orders = await prisma.order.findMany({
            where: {
                userId: session.userId,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                coverUrl: true,
                                /* Decide el marco de la miniatura. */
                                pieceType: true,
                                category: { select: { slug: true } },
                                price: true,
                            },
                        },
                    },
                },
                payment: {
                    select: {
                        provider: true,
                        status: true,
                        transactionId: true,
                        amount: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            orders: orders.map((order) => ({
                id: order.id,
                total: Number(order.total),
                status: order.status,
                createdAt: order.createdAt,
                items: order.items.map((item) => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: Number(item.price),
                    product: {
                        id: item.product.id,
                        name: item.product.name,
                        slug: item.product.slug,
                        coverUrl: item.product.coverUrl,
                        price: Number(item.product.price),
                    },
                })),
                payment: order.payment
                    ? {
                          provider: order.payment.provider,
                          status: order.payment.status,
                          transactionId:
                              order.payment.transactionId,
                          amount: Number(order.payment.amount),
                      }
                    : null,
            })),
        });
    } catch (error) {
        console.error("GET /api/mis-compras:", error);

        return NextResponse.json(
            { error: "Error al obtener tus compras." },
            { status: 500 }
        );
    }
}