import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Acciones administrativas sobre un usuario.
 *
 * La verificación y el estado de creador SOLO se cambian
 * aquí: ningún endpoint de creador o cliente permite
 * modificar `isVerified`, `creatorStatus` ni `role`.
 */
const ACTIONS = [
  "APPROVE_CREATOR",
  "SUSPEND_CREATOR",
  "REJECT_CREATOR",
  "VERIFY",
  "UNVERIFY",
  "MAKE_CREATOR",
  "MAKE_CLIENT",
] as const;

type AdminAction = (typeof ACTIONS)[number];

function isAdminAction(value: string): value is AdminAction {
  return (ACTIONS as readonly string[]).includes(value);
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const admin = await requireRole(["ADMIN"]);

    if (!admin) {
      return NextResponse.json(
        { error: "No tienes permisos para realizar esta acción." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el identificador del usuario." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const action = String(body.action || "").toUpperCase();

    if (!isAdminAction(action)) {
      return NextResponse.json(
        { error: "Acción no válida." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        role: true,
        creatorStatus: true,
        isVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        {
          error:
            "No se pueden modificar las cuentas de administrador desde aquí.",
        },
        { status: 400 }
      );
    }

    let data: Prisma.UserUpdateInput;
    let message: string;

    switch (action) {
      case "MAKE_CREATOR":
        data = {
          role: "CREATOR",
          creatorStatus: "APPROVED",
        };
        message = "El usuario ahora es creador.";
        break;

      case "MAKE_CLIENT":
        // Al dejar de ser creador se retira también la
        // verificación pública.
        data = {
          role: "CLIENT",
          creatorStatus: null,
          isVerified: false,
        };
        message = "El usuario ahora es cliente.";
        break;

      case "APPROVE_CREATOR":
        if (user.role !== "CREATOR") {
          return NextResponse.json(
            { error: "Este usuario no es creador." },
            { status: 400 }
          );
        }

        data = { creatorStatus: "APPROVED" };
        message = "Creador aprobado correctamente.";
        break;

      case "SUSPEND_CREATOR":
        if (user.role !== "CREATOR") {
          return NextResponse.json(
            { error: "Este usuario no es creador." },
            { status: 400 }
          );
        }

        data = { creatorStatus: "SUSPENDED" };
        message = "Creador suspendido correctamente.";
        break;

      case "REJECT_CREATOR":
        if (user.role !== "CREATOR") {
          return NextResponse.json(
            { error: "Este usuario no es creador." },
            { status: 400 }
          );
        }

        data = {
          creatorStatus: "REJECTED",
          isVerified: false,
        };
        message = "Creador rechazado correctamente.";
        break;

      case "VERIFY":
        if (user.role !== "CREATOR") {
          return NextResponse.json(
            {
              error: "Solo se puede verificar a un creador.",
            },
            { status: 400 }
          );
        }

        if (user.creatorStatus !== "APPROVED") {
          return NextResponse.json(
            {
              error:
                "Aprueba al creador antes de verificarlo.",
            },
            { status: 400 }
          );
        }

        data = { isVerified: true };
        message = "Creador verificado correctamente.";
        break;

      case "UNVERIFY":
        data = { isVerified: false };
        message = "Se retiró la verificación del creador.";
        break;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        creatorStatus: true,
        isVerified: true,
        username: true,
      },
    });

    return NextResponse.json({
      success: true,
      message,
      user: updatedUser,
    });
  } catch (error) {
    console.error("PATCH /api/admin/usuarios/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el usuario." },
      { status: 500 }
    );
  }
}
