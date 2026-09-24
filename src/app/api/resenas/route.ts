import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import {
  borrarResenaPropia,
  guardarResena,
  obtenerResenas,
  puedeValorar,
} from "@/lib/resenas";

export const dynamic = "force-dynamic";

/**
 * Reseñas de un recurso.
 *
 * GET es público: las valoraciones se leen sin sesión, igual
 * que la ficha del producto. Con sesión, además, se indica si
 * el visitante puede valorar y cuál es su reseña.
 *
 * SEGURIDAD: escribir y borrar usan SIEMPRE el userId de la
 * sesión firmada. No hay forma de escribir en nombre de otro
 * ni de borrar una reseña ajena.
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const productId = (searchParams.get("productId") ?? "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "Falta el recurso." },
        { status: 400 }
      );
    }

    const pagina = Number(searchParams.get("page") ?? "1");
    const session = await getSession();

    const listado = await obtenerResenas(
      productId,
      session?.userId ?? null,
      Number.isFinite(pagina) ? pagina : 1
    );

    /*
      La elegibilidad solo se consulta si hay sesión: sin ella
      la respuesta es siempre "inicia sesión", y calcularla
      costaría dos consultas para nada.
    */
    const elegibilidad = session
      ? await puedeValorar(session.userId, productId)
      : null;

    return NextResponse.json({
      ...listado,
      puedoValorar: elegibilidad?.puede ?? false,
      motivo: elegibilidad?.puede === false ? elegibilidad.motivo : null,
      haySesion: session !== null,
    });
  } catch (error) {
    console.error("GET /api/resenas:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las valoraciones." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para valorar." },
      { status: 401 }
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

    const productId = String(body?.productId ?? "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "Falta el recurso." },
        { status: 400 }
      );
    }

    const resultado = await guardarResena(session.userId, productId, {
      rating: body?.rating,
      comment: body?.comment,
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    // Se devuelve el listado ya actualizado para que la ficha
    // no tenga que pedirlo otra vez.
    const listado = await obtenerResenas(
      productId,
      session.userId,
      1
    );

    return NextResponse.json({
      success: true,
      creada: resultado.creada,
      ...listado,
    });
  } catch (error) {
    console.error("POST /api/resenas:", error);

    return NextResponse.json(
      { error: "No se pudo guardar la valoración." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    const productId = String(body?.productId ?? "").trim();

    if (!productId) {
      return NextResponse.json(
        { error: "Falta el recurso." },
        { status: 400 }
      );
    }

    const borrada = await borrarResenaPropia(
      session.userId,
      productId
    );

    if (!borrada) {
      return NextResponse.json(
        { error: "No tienes ninguna valoración en este recurso." },
        { status: 404 }
      );
    }

    const listado = await obtenerResenas(
      productId,
      session.userId,
      1
    );

    return NextResponse.json({ success: true, ...listado });
  } catch (error) {
    console.error("DELETE /api/resenas:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la valoración." },
      { status: 500 }
    );
  }
}
