import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  esTagProtegido,
  normalizarNombreTag,
  slugificarTag,
} from "@/lib/tags";

export const dynamic = "force-dynamic";

/**
 * Administración de etiquetas.
 *
 * Solo ADMIN. El listado incluye las etiquetas protegidas
 * —el panel necesita enseñarlas— pero marcadas, para que la
 * interfaz no ofrezca acciones que el servidor va a rechazar.
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

    const consulta = (searchParams.get("q") ?? "").trim();

    const tags = await prisma.tag.findMany({
      where: consulta
        ? { name: { contains: consulta, mode: "insensitive" } }
        : {},
      orderBy: [{ products: { _count: "desc" } }, { name: "asc" }],
      take: 200,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        createdAt: tag.createdAt.toISOString(),
        // Recursos en cualquier estado: es un dato de gestión.
        recursos: tag._count.products,
        protegida: esTagProtegido(tag.slug),
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/tags:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las etiquetas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const nombre = normalizarNombreTag(String(body.name ?? ""));
    const slug = slugificarTag(nombre);

    if (!nombre || !slug) {
      return NextResponse.json(
        { error: "El nombre de la etiqueta no es válido." },
        { status: 400 }
      );
    }

    /*
      Crear una etiqueta con el slug reservado dejaría dos
      filas compitiendo por el mismo significado estructural.
    */
    if (esTagProtegido(slug)) {
      return NextResponse.json(
        {
          error:
            "Ese nombre está reservado por el sistema para marcar packs.",
        },
        { status: 409 }
      );
    }

    const existente = await prisma.tag.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (existente) {
      return NextResponse.json(
        {
          error: `Ya existe una etiqueta equivalente: “${existente.name}”.`,
        },
        { status: 409 }
      );
    }

    const tag = await prisma.tag.create({
      data: { name: nombre, slug },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ success: true, tag }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/tags:", error);

    return NextResponse.json(
      { error: "No se pudo crear la etiqueta." },
      { status: 500 }
    );
  }
}
