import { NextResponse } from "next/server";

import { getSession, requireRole } from "@/lib/session";
import {
  crearPack,
  listarPacksDe,
  listarPacksPublicos,
} from "@/lib/packs";

export const dynamic = "force-dynamic";

/**
 * Packs.
 *
 *   GET  /api/packs          → packs publicados (público)
 *   GET  /api/packs?mios=1   → los del creador en sesión
 *   POST /api/packs          → crear (solo CREATOR o ADMIN)
 *
 * El creador de un pack nuevo sale SIEMPRE de la sesión: no
 * hay forma de crear un pack a nombre de otra persona.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("mios") === "1") {
      const session = await requireRole(["CREATOR", "ADMIN"]);

      if (!session) {
        return NextResponse.json(
          { error: "No autorizado." },
          { status: 403 }
        );
      }

      return NextResponse.json({
        packs: await listarPacksDe(session.userId),
      });
    }

    // Listado público: solo publicados, sin sesión necesaria.
    return NextResponse.json({
      packs: await listarPacksPublicos(),
    });
  } catch (error) {
    console.error("GET /api/packs:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar los packs." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  if (session.role !== "CREATOR" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo los creadores pueden crear packs." },
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

    const resultado = await crearPack(session.userId, {
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
    console.error("POST /api/packs:", error);

    return NextResponse.json(
      { error: "No se pudo crear el pack." },
      { status: 500 }
    );
  }
}
