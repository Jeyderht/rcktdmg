import { NextResponse } from "next/server";

import { requireRole } from "@/lib/session";
import {
  actualizarColeccion,
  borrarColeccion,
  coleccionEditablePor,
  obtenerColeccion,
} from "@/lib/colecciones-comerciales";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_req: Request, contexto: Contexto) {
  const session = await requireRole(["CREATOR", "ADMIN"]);

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { id } = await contexto.params;

    const { coleccion, permitido } = await coleccionEditablePor(
      id,
      session.userId,
      session.role
    );

    if (!coleccion) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    if (!permitido) {
      return NextResponse.json(
        { error: "No puedes ver esta colección." },
        { status: 403 }
      );
    }

    return NextResponse.json({ coleccion: await obtenerColeccion(id) });
  } catch (error) {
    console.error("GET /api/colecciones-comerciales/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo cargar la colección." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, contexto: Contexto) {
  const session = await requireRole(["CREATOR", "ADMIN"]);

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { id } = await contexto.params;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const resultado = await actualizarColeccion(
      id,
      { userId: session.userId, role: session.role },
      {
        name: body.name,
        description: body.description,
        price: body.price,
        coverUrl: body.coverUrl,
        previewUrl: body.previewUrl,
        zipUrl: body.zipUrl,
        productIds: body.productIds,
        status: body.status,
      }
    );

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json({
      success: true,
      slug: resultado.slug,
      coleccion: await obtenerColeccion(id),
    });
  } catch (error) {
    console.error("PATCH /api/colecciones-comerciales/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la colección." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, contexto: Contexto) {
  const session = await requireRole(["CREATOR", "ADMIN"]);

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { id } = await contexto.params;

    const resultado = await borrarColeccion(id, {
      userId: session.userId,
      role: session.role,
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/colecciones-comerciales/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la colección." },
      { status: 500 }
    );
  }
}
