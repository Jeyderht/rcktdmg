import { NextResponse } from "next/server";

import { requireRole } from "@/lib/session";
import {
  crearColeccion,
  listarColeccionesDe,
} from "@/lib/colecciones-comerciales";

export const dynamic = "force-dynamic";

/**
 * Colecciones comerciales del creador que ha iniciado sesión.
 *
 * El `creatorId` sale SIEMPRE de la sesión: no se lee del
 * cuerpo, así que no hay manera de crear una colección a
 * nombre de otra persona.
 */

export async function GET() {
  const session = await requireRole(["CREATOR", "ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const colecciones = await listarColeccionesDe(session.userId);

    return NextResponse.json({ colecciones });
  } catch (error) {
    console.error("GET /api/colecciones-comerciales:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar tus colecciones." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireRole(["CREATOR", "ADMIN"]);

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

    const resultado = await crearColeccion(session.userId, {
      name: body.name,
      description: body.description,
      price: body.price,
      coverUrl: body.coverUrl,
      productIds: body.productIds,
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json(
      { success: true, id: resultado.id, slug: resultado.slug },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/colecciones-comerciales:", error);

    return NextResponse.json(
      { error: "No se pudo crear la colección." },
      { status: 500 }
    );
  }
}
