import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";
import { verifySessionToken } from "@/lib/auth";
import { WithdrawalStatus } from "@prisma/client";

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

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const session = await getAuthenticatedAdmin();

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const action = String(body.action || "").toUpperCase();
    const note =
      body.note !== undefined
        ? String(body.note)
        : undefined;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: {
        id,
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Solicitud de retiro no encontrada" },
        { status: 404 }
      );
    }

    let newStatus: WithdrawalStatus;

    if (action === "APPROVE") {
      if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
        return NextResponse.json(
          {
            error:
              "Solo se pueden aprobar solicitudes pendientes",
          },
          { status: 400 }
        );
      }

      newStatus = WithdrawalStatus.APPROVED;
    } else if (action === "REJECT") {
      if (withdrawal.status !== WithdrawalStatus.REQUESTED) {
        return NextResponse.json(
          {
            error:
              "Solo se pueden rechazar solicitudes pendientes",
          },
          { status: 400 }
        );
      }

      if (!note || !note.trim()) {
        return NextResponse.json(
          {
            error:
              "Debes indicar una razón para rechazar el retiro",
          },
          { status: 400 }
        );
      }

      newStatus = WithdrawalStatus.REJECTED;
    } else if (action === "PAY") {
      if (withdrawal.status !== WithdrawalStatus.APPROVED) {
        return NextResponse.json(
          {
            error:
              "Solo se pueden marcar como pagados los retiros aprobados",
          },
          { status: 400 }
        );
      }

      newStatus = WithdrawalStatus.PAID;
    } else {
      return NextResponse.json(
        {
          error:
            "Acción inválida. Usa APPROVE, REJECT o PAY",
        },
        { status: 400 }
      );
    }

    const updatedWithdrawal = await prisma.withdrawal.update({
      where: {
        id,
      },
      data: {
        status: newStatus,
        note:
          action === "REJECT"
            ? note?.trim()
            : withdrawal.note,
        processedAt:
          newStatus === WithdrawalStatus.APPROVED ||
          newStatus === WithdrawalStatus.REJECTED ||
          newStatus === WithdrawalStatus.PAID
            ? new Date()
            : withdrawal.processedAt,
      },
    });

    /*
      La ruta comprueba arriba que la transición de estado sea
      válida, así que repetir la misma acción no vuelve a
      llegar hasta aquí: un cambio de estado, un aviso.
    */
    const copia = {
      APPROVED: "Retiro aprobado",
      REJECTED: "Retiro rechazado",
      PAID: "Retiro pagado",
      REQUESTED: "Retiro solicitado",
    } as const;

    await crearNotificacion({
      userId: updatedWithdrawal.creatorId,
      type: "WITHDRAWAL_UPDATED",
      title: copia[updatedWithdrawal.status],
      body:
        updatedWithdrawal.status === "REJECTED" && updatedWithdrawal.note
          ? updatedWithdrawal.note
          : `S/ ${Number(updatedWithdrawal.amount).toFixed(2)}`,
      href: "/creadores/panel/retiros",
    });

    return NextResponse.json({
      success: true,
      message:
        newStatus === WithdrawalStatus.APPROVED
          ? "Retiro aprobado correctamente"
          : newStatus === WithdrawalStatus.REJECTED
            ? "Retiro rechazado correctamente"
            : "Retiro marcado como pagado",
      withdrawal: {
        id: updatedWithdrawal.id,
        amount: Number(updatedWithdrawal.amount),
        status: updatedWithdrawal.status,
        note: updatedWithdrawal.note,
        createdAt: updatedWithdrawal.createdAt,
        processedAt: updatedWithdrawal.processedAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/admin/retiros/[id]:", error);

    return NextResponse.json(
      { error: "Error al actualizar el retiro" },
      { status: 500 }
    );
  }
}