import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { dimensionesDesdeUrl } from "@/lib/dimensiones";
import {
  medidaExigidaPara,
  revisarMedidas,
} from "@/lib/tipos-publicacion";
import { olvidarObjeto } from "@/lib/storage";
import {
  aplicarEtiquetaPack,
  colorValido,
  formatoDesdeUrl,
} from "@/lib/producto-metadata";
import { TAG_PACK } from "@/lib/catalogo";
import { sincronizarTagsProducto, tagsVisibles } from "@/lib/tags";
import { esTipoLicencia } from "@/lib/licencias-comun";
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

        /*
          Todas las etiquetas: el formulario necesita las
          descriptivas para poder editarlas, y la de pack
          para saber si el interruptor va marcado.
        */
        tags: {
          select: { tag: { select: { name: true, slug: true } } },
        },
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
        /* Con ella, cada pantalla enseña el recurso en su marco. */
        pieceType: product.pieceType,
        categorySlug: product.category?.slug ?? null,
        previewUrl: product.previewUrl,
        fileUrl: product.fileUrl,
        fileFormat: product.fileFormat,
        color: product.color,
        licenseType: product.licenseType,
        esPack: product.tags.some((fila) => fila.tag.slug === TAG_PACK),
        // Solo las descriptivas: `pack` se maneja aparte.
        tags: tagsVisibles(product.tags.map((fila) => fila.tag)).map(
          (tag) => tag.name
        ),
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

    const body = await req.json();

    /*
      EDITAR SOLO LA PORTADA DE UN RECURSO YA PUBLICADO

      La edición completa sigue reservada a borradores y
      rechazados: si un recurso aprobado pudiera cambiar de
      nombre, precio o archivo, la revisión no serviría de
      nada.

      La portada es la excepción, y por un motivo concreto:
      hay recursos publicados con una portada que no cumple la
      medida de su categoría —o directamente sin portada— y sin
      esta puerta su creador no tenía forma de arreglarlo salvo
      volver a crear el recurso, perdiendo ventas, descargas y
      licencias.

      Aquí solo se toca `coverUrl` y sus medidas. Todo lo demás
      del cuerpo se ignora a propósito: así, aunque la petición
      traiga un nombre o un precio nuevos, no se aplican.
    */
    const soloPortada =
      product.status !== "DRAFT" && product.status !== "REJECTED";

    if (soloPortada) {
      const nuevaPortada = body?.coverUrl;

      if (typeof nuevaPortada !== "string" || !nuevaPortada) {
        return NextResponse.json(
          {
            error:
              "De un recurso publicado solo puede reemplazarse la portada.",
          },
          { status: 400 }
        );
      }

      const categoriaActual = await prisma.category.findUnique({
        where: { id: product.categoryId },
        select: { slug: true, name: true },
      });

      const medidas = await dimensionesDesdeUrl(nuevaPortada);

      const problema = revisarMedidas(
        medidaExigidaPara(categoriaActual?.slug, product.pieceType),
        medidas ? { ancho: medidas.width, alto: medidas.height } : null
      );

      if (problema) {
        return NextResponse.json(
          {
            error: `Formato incorrecto para ${categoriaActual?.name ?? "esta categoría"}. ${problema}`,
          },
          { status: 400 }
        );
      }

      const anterior = product.coverUrl;

      const actualizado = await prisma.product.update({
        where: { id: product.id },
        data: {
          coverUrl: nuevaPortada,
          coverWidth: medidas?.width ?? null,
          coverHeight: medidas?.height ?? null,
        },
        select: { id: true, coverUrl: true, coverWidth: true, coverHeight: true },
      });

      /* La portada vieja deja de estar referenciada. */
      if (anterior && anterior !== nuevaPortada) {
        await olvidarObjeto(anterior, "publico");
      }

      return NextResponse.json({ product: actualizado });
    }

    const {
      name,
      description,
      categoryId,
      price,
      accessType,
      coverUrl,
      previewUrl,
      fileUrl,
      color,
      esPack,
      tags,
      licenseType,
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

    /*
      LA CATEGORÍA NO SE CAMBIA DESDE LA EDICIÓN

      El alta ya deduce la categoría del tipo de publicación y
      rechaza la que no corresponda. Aquí faltaba la otra mitad:
      el formulario de edición solo ofrece la categoría actual,
      pero `categoryId` viaja en el cuerpo de la petición, y el
      cuerpo lo controla quien llama.

      Importa porque de la categoría dependen las medidas que se
      exigen —«eventos» es 1080 × 1920 y el resto 1080 × 1350—,
      así que mover un recurso de categoría por esta vía lo
      dejaría con las medidas de una y la etiqueta de otra.

      Se compara contra la categoría que ya tiene el recurso, y
      no se recalcula desde el tipo, porque en la edición no
      llega el tipo: la pieza se decidió al crearlo y quedó
      guardada.
    */
    if (categoryId !== product.categoryId) {
      return NextResponse.json(
        {
          error:
            "La categoría de un recurso no se cambia desde la edición: la decide el tipo de publicación al crearlo.",
        },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        id: product.categoryId,
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

    /*
      Archivo final tras la edición: el nuevo si llegó uno, y
      si no, el que ya tenía. De él sale el formato, para que
      no quede describiendo a un archivo que ya no está.
    */
    const archivoFinal =
      fileUrl !== undefined ? fileUrl || null : product.fileUrl;

    /*
      La portada solo se vuelve a medir si de verdad cambia.
      Medir en cada guardado costaría una descarga parcial por
      edición para acabar con el mismo número.
    */
    const medidaPortada =
      coverUrl !== undefined && coverUrl
        ? await dimensionesDesdeUrl(coverUrl)
        : null;

    /*
      LA PORTADA NUEVA TIENE QUE CUMPLIR LA MEDIDA

      Se comprueba contra la categoría que va a quedar
      guardada, no contra la que tenía antes: si en el mismo
      guardado se cambia de categoría, manda la nueva.

      Solo cuando de verdad llega una portada. Dejarla vacía
      sigue permitido —un borrador puede estar a medias— y de
      exigirla se encargan enviar a revisión y publicar.

      La medida no se decide aquí: la decide `medidaExigidaPara`,
      la misma función que usa la creación y la que mira
      administración al revisar. Sin esto, reemplazar la
      portada era la puerta por la que entraba una imagen
      horizontal a un recurso de Eventos.
    */
    if (coverUrl !== undefined && coverUrl) {
      const exigida = medidaExigidaPara(category.slug, product.pieceType);

      const problema = revisarMedidas(
        exigida,
        medidaPortada
          ? { ancho: medidaPortada.width, alto: medidaPortada.height }
          : null
      );

      if (problema) {
        return NextResponse.json(
          { error: `Formato incorrecto para ${category.name}. ${problema}` },
          { status: 400 }
        );
      }
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
        licenseType: esTipoLicencia(licenseType)
          ? licenseType
          : product.licenseType,
        coverUrl:
          coverUrl !== undefined
            ? coverUrl || null
            : product.coverUrl,
        /*
          Las dimensiones se vuelven a medir SOLO si la portada
          cambia. Si no se toca, se conservan las que ya había.
        */
        ...(coverUrl !== undefined
          ? {
              coverWidth: medidaPortada?.width ?? null,
              coverHeight: medidaPortada?.height ?? null,
            }
          : {}),
        previewUrl:
          previewUrl !== undefined
            ? previewUrl || null
            : product.previewUrl,
        fileUrl: archivoFinal,

        color:
          color !== undefined ? colorValido(color) : product.color,

        // El formato acompaña siempre al archivo guardado.
        fileFormat: formatoDesdeUrl(archivoFinal),

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

    // La etiqueta "pack" solo se toca si el formulario la envía.
    if (typeof esPack === "boolean") {
      await aplicarEtiquetaPack(product.id, esPack);
    }

    /*
      Igual con las descriptivas: si el formulario no manda
      `tags`, las que ya tenía el recurso se quedan como
      están. Solo se sincronizan cuando llega una lista.
    */
    if (Array.isArray(tags)) {
      await sincronizarTagsProducto(product.id, tags);
    }

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
