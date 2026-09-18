import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getAuthenticatedUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
        return null;
    }

    const session = await verifySessionToken(token);

    if (!session) {
        return null;
    }

    return session;
}

export async function GET() {
    try {
        const session = await getAuthenticatedUser();

        const role = String(session?.role ?? "");

        if (!session || !["CREATOR", "ADMIN"].includes(role)) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const userId = String(session.userId);

        const paymentMethods = await prisma.creatorPaymentMethod.findMany({
            where: {
                creatorId: userId,
            },
            orderBy: [
                {
                    isDefault: "desc",
                },
                {
                    createdAt: "desc",
                },
            ],
        });

        return NextResponse.json({
            paymentMethods,
        });
    } catch (error) {
        console.error("Error obteniendo métodos de pago:", error);

        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getAuthenticatedUser();

        if (!session || session.role !== "CREATOR") {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const userId = String(session.userId);

        const body = await request.json();

        const type = String(body.type || "").trim().toUpperCase();
        const holderName = String(body.holderName || "").trim();
        const documentNumber = String(body.documentNumber || "").trim();
        const bankName = String(body.bankName || "").trim();
        const accountNumber = String(body.accountNumber || "").trim();
        const cci = String(body.cci || "").trim();
        const phone = String(body.phone || "").trim();
        const isDefault = body.isDefault === true;

        const validTypes = ["BANK", "YAPE", "PLIN"];

        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: "Método de pago no válido" },
                { status: 400 }
            );
        }

        if (!holderName) {
            return NextResponse.json(
                { error: "El nombre del titular es obligatorio" },
                { status: 400 }
            );
        }

        if (!documentNumber) {
            return NextResponse.json(
                { error: "El DNI/RUC es obligatorio" },
                { status: 400 }
            );
        }

        if (type === "BANK") {
            if (!bankName) {
                return NextResponse.json(
                    { error: "El banco es obligatorio" },
                    { status: 400 }
                );
            }

            if (!accountNumber) {
                return NextResponse.json(
                    { error: "El número de cuenta es obligatorio" },
                    { status: 400 }
                );
            }

            if (!cci) {
                return NextResponse.json(
                    { error: "El CCI es obligatorio" },
                    { status: 400 }
                );
            }
        }

        if (type === "YAPE" || type === "PLIN") {
            if (!phone) {
                return NextResponse.json(
                    { error: "El número de teléfono es obligatorio" },
                    { status: 400 }
                );
            }
        }

        const existingMethods =
            await prisma.creatorPaymentMethod.count({
                where: {
                    creatorId: userId,
                },
            });

        const shouldBeDefault = isDefault || existingMethods === 0;

        const paymentMethod = await prisma.$transaction(async (tx) => {
            if (shouldBeDefault) {
                await tx.creatorPaymentMethod.updateMany({
                    where: {
                        creatorId: userId,
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }

            return tx.creatorPaymentMethod.create({
                data: {
                    creatorId: userId,
                    type: type as "BANK" | "YAPE" | "PLIN",
                    holderName,
                    documentNumber,
                    bankName: type === "BANK" ? bankName : null,
                    accountNumber: type === "BANK" ? accountNumber : null,
                    cci: type === "BANK" ? cci : null,
                    phone:
                        type === "YAPE" || type === "PLIN"
                            ? phone
                            : null,
                    isDefault: shouldBeDefault,
                },
            });
        });

        return NextResponse.json(
            {
                success: true,
                paymentMethod,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creando método de pago:", error);

        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}