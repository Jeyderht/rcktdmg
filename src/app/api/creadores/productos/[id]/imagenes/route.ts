import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { olvidarObjeto } from "@/lib/storage";
import { dimensionesDesdeUrl } from "@/lib/dimensiones";
import { verifySessionToken } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function authenticateAndGetProduct(
  context: RouteContext
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("rcktdmg_session")?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "No has iniciado sesión." },
        { status: 401 }
      ),
    };
  }

  const session = await verifySessionToken(token);

  if (!session || typeof session.userId !== "string") {
    return {
      error: NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      ),
    };
  }

  if (
    session.role !== "CREATOR" &&
    session.role !== "ADMIN"
  ) {
    return {
      error: NextResponse.json(
        { error: "No tienes permisos para gestionar imágenes." },
        { status: 403 }
      ),
    };
  }

  const { id } = await context.params;

  if (!id) {
    return {
      error: NextResponse.json(
        { error: "Falta el ID del recurso." },
        { status: 400 }
      ),
    };
  }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return {
      error: NextResponse.json(
        { error: "Recurso no encontrado." },
        { status: 404 }
      ),
    };
  }

  if (
    session.role !== "ADMIN" &&
    product.creatorId !== session.userId
  ) {
    return {
      error: NextResponse.json(
        { error: "No tienes permisos para editar este recurso." },
        { status: 403 }
      ),
    };
  }

  return {
    session,
    product,
  };
}

/**
 * GET
 * Lista las imágenes adicionales del producto.
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const result = await authenticateAndGetProduct(context);

    if ("error" in result) {
      return result.error;
    }

    const { product } = result;

    const images = await prisma.productImage.findMany({
      where: {
        productId: product.id,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("ERROR OBTENIENDO IMÁGENES:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener las imágenes.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST
 * Registra una imagen adicional.
 */
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const result = await authenticateAndGetProduct(context);

    if ("error" in result) {
      return result.error;
    }

    const { product } = result;

    const body = await req.json();

    const {
      url,
      alt,
      sortOrder,
    } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          error: "La URL de la imagen es obligatoria.",
        },
        {
          status: 400,
        }
      );
    }

    const existingCount = await prisma.productImage.count({
      where: {
        productId: product.id,
      },
    });

    // Máximo 10 imágenes adicionales.
    if (existingCount >= 10) {
      return NextResponse.json(
        {
          error: "Puedes agregar un máximo de 10 imágenes adicionales.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Dimensiones reales de la imagen.

      Se leen de la cabecera del archivo ya publicado, no de lo
      que diga el cliente. Si no se pueden leer quedan nulas:
      es preferible no saber el tamaño a registrar uno falso,
      porque de estos números depende qué recursos entran en la
      sección de Corporativos.
    */
    const medida = await dimensionesDesdeUrl(url);

    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        url,
        imageWidth: medida?.width ?? null,
        imageHeight: medida?.height ?? null,
        alt:
          typeof alt === "string" && alt.trim()
            ? alt.trim()
            : null,
        sortOrder:
          typeof sortOrder === "number"
            ? sortOrder
            : existingCount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Imagen agregada correctamente.",
        image,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("ERROR AGREGANDO IMAGEN:", error);

    return NextResponse.json(
      {
        error: "No se pudo agregar la imagen.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * PATCH
 * Mantiene la edición de portada y preview.
 * También permite cambiar el orden de imágenes adicionales.
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const result = await authenticateAndGetProduct(context);

    if ("error" in result) {
      return result.error;
    }

    const { product } = result;

    const body = await req.json();

    const {
      coverUrl,
      previewUrl,
      imageId,
      sortOrder,
    } = body;

    // -----------------------------------------
    // CAMBIAR ORDEN DE UNA IMAGEN ADICIONAL
    // -----------------------------------------

    if (imageId !== undefined) {
      if (
        typeof imageId !== "string" ||
        !imageId.trim()
      ) {
        return NextResponse.json(
          {
            error: "El ID de la imagen no es válido.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        typeof sortOrder !== "number" ||
        !Number.isInteger(sortOrder) ||
        sortOrder < 0
      ) {
        return NextResponse.json(
          {
            error: "El orden de la imagen no es válido.",
          },
          {
            status: 400,
          }
        );
      }

      const image = await prisma.productImage.findFirst({
        where: {
          id: imageId,
          productId: product.id,
        },
      });

      if (!image) {
        return NextResponse.json(
          {
            error: "Imagen no encontrada.",
          },
          {
            status: 404,
          }
        );
      }

      const updatedImage =
        await prisma.productImage.update({
          where: {
            id: image.id,
          },
          data: {
            sortOrder,
          },
        });

      return NextResponse.json({
        success: true,
        message: "Orden actualizado correctamente.",
        image: updatedImage,
      });
    }

    // -----------------------------------------
    // ACTUALIZAR PORTADA / PREVIEW
    // -----------------------------------------

    if (
      coverUrl !== undefined &&
      coverUrl !== null &&
      typeof coverUrl !== "string"
    ) {
      return NextResponse.json(
        {
          error: "La portada no es válida.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      previewUrl !== undefined &&
      previewUrl !== null &&
      typeof previewUrl !== "string"
    ) {
      return NextResponse.json(
        {
          error: "El preview no es válido.",
        },
        {
          status: 400,
        }
      );
    }

    const updatedProduct =
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          coverUrl:
            coverUrl !== undefined
              ? coverUrl || null
              : product.coverUrl,

          previewUrl:
            previewUrl !== undefined
              ? previewUrl || null
              : product.previewUrl,
        },
      });

    return NextResponse.json({
      success: true,
      message: "Imágenes actualizadas correctamente.",
      product: {
        id: updatedProduct.id,
        coverUrl: updatedProduct.coverUrl,
        previewUrl: updatedProduct.previewUrl,
      },
    });
  } catch (error) {
    console.error(
      "ERROR ACTUALIZANDO IMÁGENES:",
      error
    );

    return NextResponse.json(
      {
        error: "No se pudieron actualizar las imágenes.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * DELETE
 * Elimina una imagen adicional.
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const result = await authenticateAndGetProduct(context);

    if ("error" in result) {
      return result.error;
    }

    const { product } = result;

    const body = await req.json();

    const imageId = body?.imageId;

    if (
      typeof imageId !== "string" ||
      !imageId.trim()
    ) {
      return NextResponse.json(
        {
          error: "Falta el ID de la imagen.",
        },
        {
          status: 400,
        }
      );
    }

    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId: product.id,
      },
    });

    if (!image) {
      return NextResponse.json(
        {
          error: "Imagen no encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.productImage.delete({
      where: {
        id: image.id,
      },
    });

    /*
      El objeto se borra DESPUÉS de la base de datos y solo si
      es del almacén público. Si fallara, quedaría huérfano en
      Blob, que es preferible a un registro apuntando a un
      objeto inexistente. La imagen ya se comprobó que
      pertenece a este producto.
    */
    await olvidarObjeto(image.url, "publico");

    return NextResponse.json({
      success: true,
      message: "Imagen eliminada correctamente.",
    });
  } catch (error) {
    console.error(
      "ERROR ELIMINANDO IMAGEN:",
      error
    );

    return NextResponse.json(
      {
        error: "No se pudo eliminar la imagen.",
      },
      {
        status: 500,
      }
    );
  }
}