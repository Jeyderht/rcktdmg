import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  borrarResenaComoAdmin,
  moderarResena,
} from "@/lib/resenas";

export const dynamic = "force-dynamic";

const POR_PAGINA = 20;

/**
 * Moderación de valoraciones. Solo ADMIN.
 *
 * A diferencia del listado público, aquí SÍ se ven las
 * ocultas: es la cola de revisión, y esconder de la vista del
 * moderador lo que él mismo ocultó haría imposible deshacerlo.
 *
 * El correo del autor tampoco se expone aquí. Para identificar
 * a una persona está el panel de usuarios; una cola de
 * moderación no necesita datos de contacto.
 */

export async function GET(request: Request) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const estado = searchParams.get("estado");

    const where: Prisma.ReviewWhereInput =
      estado === "PUBLISHED" || estado === "HIDDEN"
        ? { status: estado }
        : {};

    const pedida = Number(searchParams.get("page") ?? "1");

    const [total, ocultas] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
    ]);

    const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

    const pagina = Math.min(
      Number.isFinite(pedida) && pedida > 1 ? Math.floor(pedida) : 1,
      totalPaginas
    );

    const filas = await prisma.review.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        rating: true,
        comment: true,
        status: true,
        moderationNote: true,
        createdAt: true,
        user: {
          select: { name: true, publicName: true, username: true },
        },
        product: {
          select: { name: true, slug: true },
        },
      },
    });

    return NextResponse.json({
      total,
      ocultas,
      pagina,
      totalPaginas,
      resenas: filas.map((fila) => ({
        id: fila.id,
        rating: fila.rating,
        comment: fila.comment,
        status: fila.status,
        moderationNote: fila.moderationNote,
        createdAt: fila.createdAt.toISOString(),
        autor:
          fila.user.publicName ||
          fila.user.name ||
          (fila.user.username ? `@${fila.user.username}` : "Usuario"),
        producto: fila.product.name,
        productoSlug: fila.product.slug,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/resenas:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las valoraciones." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const id = String(body?.id ?? "").trim();
    const estado = body?.estado;

    if (!id || (estado !== "PUBLISHED" && estado !== "HIDDEN")) {
      return NextResponse.json(
        { error: "Indica la reseña y si se publica o se oculta." },
        { status: 400 }
      );
    }

    const hecho = await moderarResena(id, estado, body?.nota);

    if (!hecho) {
      return NextResponse.json(
        { error: "Valoración no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/admin/resenas:", error);

    return NextResponse.json(
      { error: "No se pudo moderar la valoración." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    const id = String(body?.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Indica la reseña." },
        { status: 400 }
      );
    }

    const borrada = await borrarResenaComoAdmin(id);

    if (!borrada) {
      return NextResponse.json(
        { error: "Valoración no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/resenas:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la valoración." },
      { status: 500 }
    );
  }
}
