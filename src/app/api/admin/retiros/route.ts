import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminDeSesion } from "@/lib/sesion-api";
export async function GET() {
  try {
    const session = await adminDeSesion();

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            creatorStatus: true,
          },
        },
        paymentMethod: true,
      },
    });

    return NextResponse.json({
      success: true,
      withdrawals: withdrawals.map((withdrawal) => ({
        id: withdrawal.id,
        amount: Number(withdrawal.amount),
        status: withdrawal.status,
        note: withdrawal.note,
        createdAt: withdrawal.createdAt,
        processedAt: withdrawal.processedAt,
        creator: withdrawal.creator,
        paymentMethod: withdrawal.paymentMethod,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/retiros:", error);

    return NextResponse.json(
      { error: "Error al obtener los retiros" },
      { status: 500 }
    );
  }
}