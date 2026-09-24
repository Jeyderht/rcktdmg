import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  crearVersion,
  listarVersiones,
  marcarVersionActual,
} from "@/lib/versiones";

export const dynamic = "force-dynamic";

type Contexto = {
  params: Promise<{ id: string }>;
};

/**
 * Versiones de un recurso.
 *
 * SEGURIDAD
 *
 * Todas las operaciones comprueban en el servidor que el
 * recurso es del creador que ha iniciado sesión —o que es
 * ADMIN—, dentro de src/lib/versiones.ts. La interfaz no es la
 * barrera: cambiar el id en la URL devuelve 403.
 *
 * Ninguna respuesta incluye `fileUrl`: es la referencia al
 * almacén privado y no tiene por qué salir del servidor. El
 * archivo se entrega solo por /api/downloads/[id], tras
 * comprobar compra y licencia.
 */

async function autorizar(contexto: Contexto) {
  const session = await requireRole(["CREATOR", "ADMIN"]);

  if (!session) return { session: null, productId: "" };

  const { id } = await contexto.params;

  return { session, productId: id };
}

export async function GET(_req: Request, contexto: Contexto) {
  const { session, productId } = await autorizar(contexto);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const producto = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        creatorId: true,
        fileFormat: true,
        fileUrl: true,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    if (
      session.role !== "ADMIN" &&
      producto.creatorId !== session.userId
    ) {
      return NextResponse.json(
        { error: "No puedes ver las versiones de este recurso." },
        { status: 403 }
      );
    }

    const versiones = await listarVersiones(productId);

    return NextResponse.json({
      versiones,
      /*
        true cuando el recurso tiene archivo pero todavía
        ninguna versión: es el estado de los recursos
        anteriores a esta etapa, y la interfaz lo explica en
        lugar de enseñar un historial vacío sin más.
      */
      tieneArchivoSinVersionar:
        versiones.length === 0 && Boolean(producto.fileUrl),
    });
  } catch (error) {
    console.error("GET versiones:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las versiones." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, contexto: Contexto) {
  const { session, productId } = await autorizar(contexto);

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

    const resultado = await crearVersion(
      productId,
      { userId: session.userId, role: session.role },
      {
        version: body.version,
        fileUrl: body.fileUrl,
        changelog: body.changelog,
        hacerActual: body.hacerActual,
      }
    );

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json(
      {
        success: true,
        version: resultado.version,
        versiones: await listarVersiones(productId),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST versiones:", error);

    return NextResponse.json(
      { error: "No se pudo publicar la versión." },
      { status: 500 }
    );
  }
}

/** Cambia cuál es la versión vigente. */
export async function PATCH(request: Request, contexto: Contexto) {
  const { session, productId } = await autorizar(contexto);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    const versionId = String(body?.versionId ?? "").trim();

    if (!versionId) {
      return NextResponse.json(
        { error: "Indica la versión." },
        { status: 400 }
      );
    }

    const resultado = await marcarVersionActual(productId, versionId, {
      userId: session.userId,
      role: session.role,
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado }
      );
    }

    return NextResponse.json({
      success: true,
      versiones: await listarVersiones(productId),
    });
  } catch (error) {
    console.error("PATCH versiones:", error);

    return NextResponse.json(
      { error: "No se pudo cambiar la versión vigente." },
      { status: 500 }
    );
  }
}
