import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import {
  esTagProtegido,
  normalizarNombreTag,
  slugificarTag,
} from "@/lib/tags";

export const dynamic = "force-dynamic";

type Contexto = {
  params: Promise<{ id: string }>;
};

/**
 * Edición y borrado de una etiqueta.
 *
 * La protección de las etiquetas estructurales se comprueba
 * AQUÍ, en el servidor, y no solo en la interfaz: esconder un
 * botón no impide que alguien llame a la API a mano.
 */

async function cargar(id: string) {
  return prisma.tag.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true } },
    },
  });
}

export async function PATCH(request: Request, contexto: Contexto) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { id } = await contexto.params;

    const tag = await cargar(id);

    if (!tag) {
      return NextResponse.json(
        { error: "Etiqueta no encontrada." },
        { status: 404 }
      );
    }

    if (esTagProtegido(tag.slug)) {
      return NextResponse.json(
        {
          error:
            "“Pack” es una etiqueta del sistema: marca qué recursos son packs en toda la tienda y no se puede renombrar.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const nombre = normalizarNombreTag(String(body.name ?? ""));
    const slug = slugificarTag(nombre);

    if (!nombre || !slug) {
      return NextResponse.json(
        { error: "El nombre de la etiqueta no es válido." },
        { status: 400 }
      );
    }

    if (esTagProtegido(slug)) {
      return NextResponse.json(
        {
          error:
            "Ese nombre está reservado por el sistema para marcar packs.",
        },
        { status: 409 }
      );
    }

    // Renombrar hacia un slug que ya existe fusionaría dos
    // etiquetas distintas sin que nadie lo haya pedido.
    const choque = await prisma.tag.findFirst({
      where: { slug, NOT: { id: tag.id } },
      select: { name: true },
    });

    if (choque) {
      return NextResponse.json(
        {
          error: `Ya existe una etiqueta equivalente: “${choque.name}”.`,
        },
        { status: 409 }
      );
    }

    const actualizada = await prisma.tag.update({
      where: { id: tag.id },
      data: { name: nombre, slug },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ success: true, tag: actualizada });
  } catch (error) {
    console.error("PATCH /api/admin/tags/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la etiqueta." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, contexto: Contexto) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const { id } = await contexto.params;

    const tag = await cargar(id);

    if (!tag) {
      return NextResponse.json(
        { error: "Etiqueta no encontrada." },
        { status: 404 }
      );
    }

    if (esTagProtegido(tag.slug)) {
      return NextResponse.json(
        {
          error:
            "“Pack” es una etiqueta del sistema: si se borra, los packs dejan de aparecer como packs en toda la tienda.",
        },
        { status: 403 }
      );
    }

    /*
      Borrar una etiqueta en uso la quita de golpe de todos sus
      recursos (ProductTag va en cascada). Es una pérdida real
      de trabajo del creador, así que se exige confirmarlo de
      forma explícita en lugar de dejarlo pasar en silencio.
    */
    const { searchParams } = new URL(request.url);

    if (tag._count.products > 0 && searchParams.get("forzar") !== "true") {
      return NextResponse.json(
        {
          error: "ETIQUETA_EN_USO",
          recursos: tag._count.products,
        },
        { status: 409 }
      );
    }

    await prisma.tag.delete({ where: { id: tag.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/tags/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar la etiqueta." },
      { status: 500 }
    );
  }
}
