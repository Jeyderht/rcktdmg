import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { slugificarCategoria, validarCategoria } from "@/lib/categorias";

export const dynamic = "force-dynamic";

/**
 * Categorías comerciales. Solo administración escribe.
 *
 * Las categorías son la estructura del catálogo, no contenido
 * de usuario: si cada creador pudiera crear la suya, la tienda
 * acabaría con "Social media", "social-media" y "SOCIAL MEDIA"
 * como tres secciones distintas. Los creadores ELIGEN de esta
 * lista; nadie más la amplía.
 */

export async function GET() {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 403 }
    );
  }

  try {
    const categorias = await prisma.category.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverUrl: true,
        isActive: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categorias });
  } catch (error) {
    console.error("GET /api/admin/categorias:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las categorías." },
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
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const validada = validarCategoria(body);

    if (!validada.ok) {
      return NextResponse.json(
        { error: validada.error },
        { status: 400 }
      );
    }

    const slug = slugificarCategoria(validada.name);

    const repetida = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (repetida) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre." },
        { status: 409 }
      );
    }

    const categoria = await prisma.category.create({
      data: {
        name: validada.name,
        slug,
        description: validada.description,
        coverUrl: validada.coverUrl,
      },
      select: { id: true, name: true, slug: true, coverUrl: true },
    });

    return NextResponse.json(
      { success: true, categoria },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/categorias:", error);

    return NextResponse.json(
      { error: "No se pudo crear la categoría." },
      { status: 500 }
    );
  }
}
