import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { olvidarObjeto } from "@/lib/storage";
import { verifySessionToken } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para ver este recurso." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    if (
      session.role !== "ADMIN" &&
      product.creatorId !== session.userId
    ) {
      return NextResponse.json(
        { error: "No tienes permisos para ver este recurso." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price.toString(),
        accessType: product.accessType,
        status: product.status,
        rejectionReason: product.rejectionReason,
        coverUrl: product.coverUrl,
        previewUrl: product.previewUrl,
        fileUrl: product.fileUrl,
        categoryId: product.categoryId,
        category: product.category
          ? {
            id: product.category.id,
            name: product.category.name,
          }
          : null,
      },
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO RECURSO:", error);

    return NextResponse.json(
      { error: "No se pudo obtener el recurso." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para editar recursos." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID del recurso." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Recurso no encontrado." },
        { status: 404 }
      );
    }

    // Un creador solamente puede editar sus propios recursos.
    if (
      session.role !== "ADMIN" &&
      product.creatorId !== session.userId
    ) {
      return NextResponse.json(
        { error: "No tienes permisos para editar este recurso." },
        { status: 403 }
      );
    }

    // Solo permitimos editar borradores y recursos rechazados.
    if (
      product.status !== "DRAFT" &&
      product.status !== "REJECTED"
    ) {
      return NextResponse.json(
        {
          error:
            "Este recurso no puede editarse mientras está pendiente de revisión o publicado.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      name,
      description,
      categoryId,
      price,
      accessType,
      coverUrl,
      previewUrl,
      fileUrl,
    } = body;

    if (
      !name ||
      !description ||
      !categoryId ||
      price === undefined
    ) {
      return NextResponse.json(
        { error: "Completa todos los campos obligatorios." },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return NextResponse.json(
        { error: "El precio no es válido." },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "La categoría indicada no existe." },
        { status: 400 }
      );
    }

    const validAccessTypes = [
      "INDIVIDUAL",
      "PLAN",
      "BOTH",
    ];

    if (
      accessType &&
      !validAccessTypes.includes(accessType)
    ) {
      return NextResponse.json(
        { error: "El tipo de acceso no es válido." },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        name: name.trim(),
        description: description.trim(),
        categoryId,
        price: String(numericPrice),
        accessType: accessType || product.accessType,
        coverUrl:
          coverUrl !== undefined
            ? coverUrl || null
            : product.coverUrl,
        previewUrl:
          previewUrl !== undefined
            ? previewUrl || null
            : product.previewUrl,
        fileUrl:
          fileUrl !== undefined
            ? fileUrl || null
            : product.fileUrl,

        // Si estaba rechazado, vuelve a borrador.
        status:
          product.status === "REJECTED"
            ? "DRAFT"
            : product.status,

        rejectionReason:
          product.status === "REJECTED"
            ? null
            : product.rejectionReason,
      },
    });

    /*
      Limpieza del almacén, ya con la base de datos guardada.

      Mismo criterio que el borrado de imágenes: primero la
      base, después el objeto. Si esto fallara quedaría un
      huérfano en Blob, que es preferible a un registro
      apuntando a un objeto que ya no existe.

      Solo se olvidan portada y preview, que viven en el
      almacén público. El archivo vendible no se toca aquí.
    */
    const candidatas = [
      product.coverUrl !== updatedProduct.coverUrl
        ? product.coverUrl
        : null,

      product.previewUrl !== updatedProduct.previewUrl
        ? product.previewUrl
        : null,
    ].filter((url): url is string => Boolean(url));

    if (candidatas.length > 0) {
      // Una misma URL puede seguir usándose en el otro campo
      // o en la galería: en ese caso no se borra nada.
      const siguenEnUso = new Set(
        [
          updatedProduct.coverUrl,
          updatedProduct.previewUrl,
          updatedProduct.fileUrl,
        ].filter((url): url is string => Boolean(url))
      );

      const enGaleria = await prisma.productImage.findMany({
        where: {
          url: { in: candidatas },
        },
        select: { url: true },
      });

      for (const imagen of enGaleria) {
        siguenEnUso.add(imagen.url);
      }

      for (const anterior of candidatas) {
        if (siguenEnUso.has(anterior)) continue;

        await olvidarObjeto(anterior, "publico");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Recurso actualizado correctamente.",
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        status: updatedProduct.status,
      },
    });
  } catch (error) {
    console.error("ERROR EDITANDO RECURSO:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el recurso." },
      { status: 500 }
    );
  }
}