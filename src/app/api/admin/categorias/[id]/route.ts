import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { esSlugDelSistema } from "@/lib/tipos-publicacion";
import { slugificarCategoria, validarCategoria } from "@/lib/categorias";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, contexto: Contexto) {
  const session = await requireRole(["ADMIN"]);

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

    const actual = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        coverUrl: true,
      },
    });

    if (!actual) {
      return NextResponse.json(
        { error: "Categoría no encontrada." },
        { status: 404 }
      );
    }

    /*
      Edición parcial: lo que no venga conserva su valor. Así
      activar o desactivar una categoría no obliga a reenviar
      su nombre.
    */
    const validada = validarCategoria({
      name: body.name === undefined ? actual.name : body.name,
      description:
        body.description === undefined ? actual.description : body.description,
      /*
        Edición parcial también aquí: si no viene `coverUrl`,
        se conserva la que ya tenía. Enviar cadena vacía es la
        forma de quitarla.
      */
      coverUrl:
        body.coverUrl === undefined ? actual.coverUrl : body.coverUrl,
    });

    if (!validada.ok) {
      return NextResponse.json({ error: validada.error }, { status: 400 });
    }

    /*
      EL SLUG SÍ SE PUEDE CAMBIAR, pero solo a propósito.

      Cambiarlo NO es un efecto secundario de renombrar: hay
      que enviarlo. Es lo que viaja en `/tienda?categoria=…`,
      en el sitemap y en los enlaces que la gente ya compartió,
      así que un cambio accidental rompe direcciones vivas.

      Y hay cuatro que no se tocan. De ellos depende qué
      medidas se exigen: «eventos» es 1080 × 1920,
      «corporativos» y «general» son 1080 × 1350. Si el slug
      de Eventos dejara de ser «eventos», esa categoría
      empezaría a aceptar 4:5 en silencio. Renombrarlas se
      permite; mudarlas de dirección, no.
    */
    let slug = actual.slug || slugificarCategoria(validada.name);

    if (typeof body.slug === "string" && body.slug.trim()) {
      const pedido = slugificarCategoria(body.slug);

      if (!pedido) {
        return NextResponse.json(
          { error: "El slug no es válido." },
          { status: 400 }
        );
      }

      if (pedido !== actual.slug) {
        if (esSlugDelSistema(actual.slug)) {
          return NextResponse.json(
            {
              error: `«${actual.slug}» no puede cambiar de dirección: de este slug dependen las medidas que se exigen a sus recursos. Puedes cambiar el nombre.`,
            },
            { status: 409 }
          );
        }

        const ocupado = await prisma.category.findFirst({
          where: { slug: pedido, id: { not: id } },
          select: { id: true },
        });

        if (ocupado) {
          return NextResponse.json(
            { error: "Ya existe otra categoría con ese slug." },
            { status: 409 }
          );
        }

        slug = pedido;
      }
    }

    const activa =
      typeof body.isActive === "boolean" ? { isActive: body.isActive } : {};

    const categoria = await prisma.category.update({
      where: { id },
      data: {
        name: validada.name,
        description: validada.description,
        coverUrl: validada.coverUrl,
        slug,
        ...activa,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        coverUrl: true,
      },
    });

    return NextResponse.json({ success: true, categoria });
  } catch (error) {
    console.error("PATCH /api/admin/categorias/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar la categoría." },
      { status: 500 }
    );
  }
}

/**
 * Retira una categoría.
 *
 * Si tiene recursos NO se borra: se desactiva. Borrarla
 * dejaría productos sin categoría —una relación obligatoria—
 * y la operación fallaría a mitad o, peor, arrastraría los
 * productos consigo. Una categoría vacía sí se elimina de
 * verdad, porque no hay nada que preservar.
 */
export async function DELETE(_req: Request, contexto: Contexto) {
  const session = await requireRole(["ADMIN"]);

  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const { id } = await contexto.params;

    const categoria = await prisma.category.findUnique({
      where: { id },
      select: { id: true, _count: { select: { products: true } } },
    });

    if (!categoria) {
      return NextResponse.json(
        { error: "Categoría no encontrada." },
        { status: 404 }
      );
    }

    if (categoria._count.products > 0) {
      await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        desactivada: true,
        mensaje: `La categoría tiene ${categoria._count.products} recursos, así que se ha desactivado en lugar de borrarse.`,
      });
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true, eliminada: true });
  } catch (error) {
    console.error("DELETE /api/admin/categorias/[id]:", error);

    return NextResponse.json(
      { error: "No se pudo retirar la categoría." },
      { status: 500 }
    );
  }
}
