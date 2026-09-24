import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notificarAdmins } from "@/lib/notificaciones";
import { verifySessionToken } from "@/lib/auth";
import { Prisma, WithdrawalStatus } from "@prisma/client";

const MINIMUM_WITHDRAWAL = new Prisma.Decimal("50.00");

async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
        return null;
    }

    return verifySessionToken(token);
}

async function getCreatorFinancialData(userId: string) {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            creatorStatus: true,
            products: {
                select: {
                    id: true,
                },
            },
        },
    });

    if (!user) {
        return null;
    }

    const productIds = user.products.map((product) => product.id);

    const earnings = await prisma.orderItem.aggregate({
        where: {
            productId: {
                in: productIds,
            },
            order: {
                status: "PAID",
            },
        },
        _sum: {
            creatorAmount: true,
        },
    });

    const totalEarnings = earnings._sum?.creatorAmount ?? new Prisma.Decimal("0");

    const withdrawals = await prisma.withdrawal.findMany({
        where: {
            creatorId: userId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const withdrawnAmount = withdrawals
        .filter(
            (withdrawal) =>
                withdrawal.status === WithdrawalStatus.APPROVED ||
                withdrawal.status === WithdrawalStatus.PAID
        )
        .reduce(
            (total, withdrawal) => total.add(withdrawal.amount),
            new Prisma.Decimal("0")
        );

    const pendingAmount = withdrawals
        .filter((withdrawal) => withdrawal.status === WithdrawalStatus.REQUESTED)
        .reduce(
            (total, withdrawal) => total.add(withdrawal.amount),
            new Prisma.Decimal("0")
        );

    const availableBalance = Prisma.Decimal.max(
        totalEarnings
            .sub(withdrawnAmount)
            .sub(pendingAmount),
        new Prisma.Decimal("0")
    );

    return {
        user,
        totalEarnings,
        withdrawnAmount,
        pendingAmount,
        availableBalance,
        withdrawals,
    };
}

export async function GET() {
    try {
        const session = await getAuthenticatedUser();

        if (!session) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        if (session.role !== "CREATOR" && session.role !== "ADMIN") {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }
        const userId = String(session.userId);

        const data = await getCreatorFinancialData(userId);

        if (!data) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            summary: {
                totalEarnings: Number(data.totalEarnings),
                withdrawnAmount: Number(data.withdrawnAmount),
                pendingAmount: Number(data.pendingAmount),
                availableBalance: Number(data.availableBalance),
            },
            withdrawals: data.withdrawals.map((withdrawal) => ({
                id: withdrawal.id,
                amount: Number(withdrawal.amount),
                status: withdrawal.status,
                note: withdrawal.note,
                createdAt: withdrawal.createdAt,
                processedAt: withdrawal.processedAt,
            })),
        });
    } catch (error) {
        console.error("GET /api/creadores/retiros:", error);

        return NextResponse.json(
            { error: "Error al obtener los retiros" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getAuthenticatedUser();

        if (!session) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        if (session.role !== "CREATOR") {
            return NextResponse.json(
                { error: "Solo los creadores pueden solicitar retiros" },
                { status: 403 }
            );
        }
        const userId = String(session.userId);

        const body = await request.json();
        const paymentMethodId = String(body.paymentMethodId || "").trim();
        const amount = new Prisma.Decimal(
            String(body.amount ?? "")
        );

        if (!amount.isFinite() || amount.lte(0)) {
            return NextResponse.json(
                { error: "El monto del retiro no es válido" },
                { status: 400 }
            );
        }

        if (amount.lt(MINIMUM_WITHDRAWAL)) {
            return NextResponse.json(
                {
                    error: `El retiro mínimo es de S/ ${MINIMUM_WITHDRAWAL.toFixed(2)}`,
                },
                { status: 400 }
            );
        }
        if (!paymentMethodId) {
            return NextResponse.json(
                { error: "Debes seleccionar un método de pago" },
                { status: 400 }
            );
        }

        const paymentMethod = await prisma.creatorPaymentMethod.findFirst({
            where: {
                id: paymentMethodId,
                creatorId: userId,
            },
        });

        if (!paymentMethod) {
            return NextResponse.json(
                { error: "El método de pago seleccionado no es válido" },
                { status: 400 }
            );
        }


        const data = await getCreatorFinancialData(userId);

        if (!data) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        if (data.user.creatorStatus !== "APPROVED") {
            return NextResponse.json(
                { error: "Tu cuenta de creador todavía no está aprobada" },
                { status: 403 }
            );
        }

        if (amount.gt(data.availableBalance)) {
            return NextResponse.json(
                {
                    error: "El monto solicitado supera tu saldo disponible",
                    availableBalance: Number(data.availableBalance),
                },
                { status: 400 }
            );
        }

        const withdrawal = await prisma.withdrawal.create({
            data: {
                creatorId: userId,
                paymentMethodId,
                amount,
                status: WithdrawalStatus.REQUESTED,
            },
        });

        // Cada solicitud crea su propia fila, así que un aviso
        // por solicitud: no hay estado que repetir.
        await notificarAdmins({
            type: "WITHDRAWAL_REQUESTED",
            title: "Nueva solicitud de retiro",
            body: `S/ ${Number(withdrawal.amount).toFixed(2)}`,
            href: "/admin/retiros",
        });

        return NextResponse.json(
            {
                success: true,
                message: "Solicitud de retiro creada correctamente",
                withdrawal: {
                    id: withdrawal.id,
                    amount: Number(withdrawal.amount),
                    status: withdrawal.status,
                    createdAt: withdrawal.createdAt,
                },
                availableBalance: Number(
                    data.availableBalance.sub(amount)
                ),
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST /api/creadores/retiros:", error);

        return NextResponse.json(
            { error: "Error al solicitar el retiro" },
            { status: 500 }
        );
    }
}