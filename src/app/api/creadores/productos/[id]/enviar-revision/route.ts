import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

/**
 * Envía un recurso a revisión.
 *
 * Este endpoint lo usan dos interfaces distintas:
 *  - el panel de recursos, mediante `fetch` (espera JSON);
 *  - la ficha del recurso, mediante un `<form>` (espera
 *    una redirección de vuelta al panel).
 *
 * Por eso la respuesta se negocia según la petición.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const accept = req.headers.get("accept") || "";

  // Un formulario HTML pide text/html; fetch pide JSON.
  const wantsJson =
    accept.includes("application/json") ||
    !accept.includes("text/html");

  function fail(error: string, status: number) {
    if (wantsJson) {
      return NextResponse.json({ error }, { status });
    }

    const url = new URL("/creadores/panel/recursos", req.url);
    url.searchParams.set("error", error);

    return NextResponse.redirect(url, 303);
  }

  try {
    const session = await requireRole(["CREATOR", "ADMIN"]);

    if (!session) {
      return fail(
        "No tienes permisos para realizar esta acción.",
        403
      );
    }

    const { id } = await params;

    if (!id) {
      return fail("Falta el ID del recurso.", 400);
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return fail("No se encontró el recurso.", 404);
    }

    // Un CREATOR solamente puede enviar sus propios recursos.
    // Un ADMIN puede gestionar cualquier recurso.
    if (
      session.role !== "ADMIN" &&
      product.creatorId !== session.userId
    ) {
      return fail(
        "No tienes permisos para este recurso.",
        403
      );
    }

    if (
      product.status !== "DRAFT" &&
      product.status !== "REJECTED"
    ) {
      return fail(
        "Este recurso no puede enviarse a revisión en su estado actual.",
        400
      );
    }

    if (!product.fileUrl) {
      return fail(
        "Debes cargar el archivo principal antes de enviar el recurso a revisión.",
        400
      );
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        status: "PENDING_REVIEW",
        // Al reenviar un recurso rechazado se limpia el
        // motivo del rechazo anterior.
        rejectionReason: null,
      },
    });

    if (wantsJson) {
      return NextResponse.json({
        success: true,
        message: "Recurso enviado a revisión correctamente.",
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          status: updatedProduct.status,
        },
      });
    }

    return NextResponse.redirect(
      new URL("/creadores/panel/recursos", req.url),
      303
    );
  } catch (error) {
    console.error("ERROR ENVIANDO RECURSO A REVISIÓN:", error);

    return fail("Error interno del servidor.", 500);
  }
}
