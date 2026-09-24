import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import {
  actualizarPack,
  borrarPack,
  obtenerPack,
  packEditablePor,
} from "@/lib/packs";

export const dynamic = "force-dynamic";

type Contexto = {
  params: Promise<{ id: string }>;
};

/**
 * Un pack concreto.
 *
 * SEGURIDAD
 *
 * GET deja ver un pack PUBLICADO a cualquiera —es público—,
 * pero uno en borrador o archivado solo a su creador o a un
 * ADMIN: un borrador es trabajo sin terminar y no tiene por
 * qué ser visible.
 *
 * PATCH y DELETE comprueban la propiedad en el servidor. Los
 * recursos incluidos se validan contra el creador DEL PACK,
 * así que ni siquiera un ADMIN puede meterle recursos de
 * terceros.
 */

export async function GET(_req: Request, contexto: Contexto) {
  try {
    const { id } = await contexto.params;

    const pack = await obtenerPack(id);

    if (!pack) {
      return NextResponse.json(
        { error: "Pack no encontrado." },
        { status: 404 }
      );
    }

    if (pack.status !== "PUBLISHED") {
      const session = await getSession();

      const { permitido } = session
        ? await packEditablePor(id, session.userId, session.role)
        : { permitido: false };

      if (!permitido) {
        // 404 y no 403: quien no puede verlo no tiene por qué
        // enterarse de que existe.
        return NextResponse.json(
          { error: "Pack no encontrado." },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ pack });
  } catch (error) {
    console.error("GET /api/packs/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo cargar el pack." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, contexto: Contexto) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  if (session.role !== "CREATOR" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
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

    const resultado = await actualizarPack(
      id,
      { userId: session.userId, role: session.role },
      {
        name: body.name,
        description: body.description,
        price: body.price,
        coverUrl: body.coverUrl,
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
      pack: await obtenerPack(id),
    });
  } catch (error) {
    console.error("PATCH /api/packs/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el pack." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, contexto: Contexto) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  if (session.role !== "CREATOR" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { id } = await contexto.params;

    const resultado = await borrarPack(id, {
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
    console.error("DELETE /api/packs/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el pack." },
      { status: 500 }
    );
  }
}
