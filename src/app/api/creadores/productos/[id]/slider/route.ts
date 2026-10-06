import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { dimensionesDesdeUrl } from "@/lib/dimensiones";
import { olvidarObjeto } from "@/lib/storage";
import { revisarMedidasSlider } from "@/lib/portadas";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Portada horizontal del slider de un recurso (Product.sliderUrl).
 *
 * La gestiona el creador dueño del recurso, o administración.
 * La imagen ya viene subida al almacén público (SubirPortada);
 * aquí solo se comprueba su tamaño y se guarda la URL.
 */
async function recursoAutorizado(id: string) {
  const session = await getSession();

  if (!session) {
    return { error: "No has iniciado sesión.", status: 401 } as const;
  }

  const producto = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      creatorId: true,
      sliderUrl: true,
      sliderWidth: true,
      sliderHeight: true,
    },
  });

  if (!producto) {
    return { error: "Recurso no encontrado.", status: 404 } as const;
  }

  if (session.role !== "ADMIN" && producto.creatorId !== session.userId) {
    return { error: "No puedes editar este recurso.", status: 403 } as const;
  }

  return { producto } as const;
}

export async function GET(_request: Request, contexto: Contexto) {
  const { id } = await contexto.params;

  const r = await recursoAutorizado(id);

  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }

  return NextResponse.json({
    sliderUrl: r.producto.sliderUrl,
    sliderWidth: r.producto.sliderWidth,
    sliderHeight: r.producto.sliderHeight,
  });
}

/**
 * { sliderUrl: "https://…" } → la pone (si es horizontal 16:9)
 * { sliderUrl: null }         → la quita
 */
export async function PUT(request: Request, contexto: Contexto) {
  try {
    const { id } = await contexto.params;

    const r = await recursoAutorizado(id);

    if ("error" in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || !("sliderUrl" in body)) {
      return NextResponse.json(
        { error: "El cuerpo de la petición no es válido." },
        { status: 400 }
      );
    }

    const anterior = r.producto.sliderUrl;

    /* ── Quitar ── */
    if (body.sliderUrl === null || body.sliderUrl === "") {
      await prisma.product.update({
        where: { id },
        data: { sliderUrl: null, sliderWidth: null, sliderHeight: null },
      });

      if (anterior) await olvidarObjeto(anterior, "publico");

      return NextResponse.json({ sliderUrl: null });
    }

    if (typeof body.sliderUrl !== "string") {
      return NextResponse.json(
        { error: "La imagen no es válida." },
        { status: 400 }
      );
    }

    const nueva = body.sliderUrl.trim();

    /* ── Poner: solo horizontal 16:9 ── */
    const medidas = await dimensionesDesdeUrl(nueva);
    const problema = revisarMedidasSlider(medidas);

    if (problema) {
      // La imagen rechazada ya se subió: no se deja huérfana.
      if (nueva !== anterior) await olvidarObjeto(nueva, "publico");

      return NextResponse.json({ error: problema }, { status: 400 });
    }

    const actualizado = await prisma.product.update({
      where: { id },
      data: {
        sliderUrl: nueva,
        sliderWidth: medidas?.width ?? null,
        sliderHeight: medidas?.height ?? null,
      },
      select: { sliderUrl: true, sliderWidth: true, sliderHeight: true },
    });

    // La anterior deja de estar referenciada.
    if (anterior && anterior !== nueva) {
      await olvidarObjeto(anterior, "publico");
    }

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("PUT /api/creadores/productos/[id]/slider:", error);

    return NextResponse.json(
      { error: "No se pudo guardar la portada del slider." },
      { status: 500 }
    );
  }
}
