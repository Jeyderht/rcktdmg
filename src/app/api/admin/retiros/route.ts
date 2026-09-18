import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

async function getAuthenticatedAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session || session.role !== "ADMIN") {
    return null;
  }

  return session;
}

export async function GET() {
  try {
    const session = await getAuthenticatedAdmin();

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