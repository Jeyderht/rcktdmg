import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { dimensionesDesdeUrl } from "@/lib/dimensiones";
import { verifySessionToken } from "@/lib/auth";
import {
  aplicarEtiquetaPack,
  colorValido,
  formatoDesdeUrl,
} from "@/lib/producto-metadata";
import { sincronizarTagsProducto } from "@/lib/tags";
import { esTipoLicencia } from "@/lib/licencias-comun";
import {
  CORPORATIVO,
  revisarMedidas,
  tipoPorClave,
} from "@/lib/tipos-publicacion";

function createSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
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

    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 }
      );
    }

    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para crear recursos." },
        { status: 403 }
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
      color,
      esPack,
      tags,
      licenseType,
      formato,
      imagenes,
    } = body;

    if (!name || !description || !categoryId || price === undefined) {
      return NextResponse.json(
        { error: "Completa todos los campos obligatorios." },
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

    const baseSlug = createSlug(name);

    let slug = baseSlug;

    const existingProduct = await prisma.product.findUnique({
      where: {
        slug,
      },
    });

    if (existingProduct) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const medidaPortada = coverUrl
      ? await dimensionesDesdeUrl(coverUrl)
      : null;

    /*
      MEDIDAS OBLIGATORIAS SEGÚN EL TIPO

      El formulario ya las comprueba antes de subir la imagen,
      pero esa comprobación vive en el navegador y se puede
      saltar. Aquí se repite sobre el archivo que de verdad
      llegó, leyendo su cabecera.

      Dos orígenes, a propósito:
      - `formato`: lo que el creador declaró (una story de
        evento, por ejemplo). No se guarda; solo dice qué
        regla aplicar.
      - la categoría: «corporativos» exige 1080 × 1350 sea lo
        que sea que declare el cliente, porque el carrusel de
        la portada es 4:5 exacto y una pieza de otra
        proporción rompe la fila.
    */
    const exigida =
      category.slug === "corporativos"
        ? CORPORATIVO
        : tipoPorClave("EVENTO")?.formatos.find((f) => f.clave === formato)
            ?.medida ?? null;

    const problemaMedidas = revisarMedidas(
      exigida,
      medidaPortada
        ? { ancho: medidaPortada.width, alto: medidaPortada.height }
        : null
    );

    if (problemaMedidas) {
      return NextResponse.json({ error: problemaMedidas }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        creatorId: session.userId as string,
        categoryId,
        name: name.trim(),
        slug,
        description: description.trim(),
        price: String(price),
        accessType: accessType || "BOTH",
        status: "DRAFT",
        coverUrl: coverUrl || null,
        /*
          Tamaño real de la portada, leído de su cabecera. Nulo
          si no se pudo leer: nunca se supone.
        */
        coverWidth: medidaPortada?.width ?? null,
        coverHeight: medidaPortada?.height ?? null,
        previewUrl: previewUrl || null,
        fileUrl: fileUrl || null,
        color: colorValido(color),
        // El formato lo deduce el archivo subido, no el
        // formulario: así siempre coincide con la descarga.
        fileFormat: formatoDesdeUrl(fileUrl),
        // Un tipo desconocido cae a PERSONAL, que es el más
        // restrictivo: nunca se conceden derechos de más.
        licenseType: esTipoLicencia(licenseType)
          ? licenseType
          : "PERSONAL",
      },
    });

    // La etiqueta "pack" es opcional y se puede quitar luego.
    if (esPack === true) {
      await aplicarEtiquetaPack(product.id, true);
    }

    /*
      GALERÍA INICIAL

      Antes había que crear el recurso y entrar a otra pantalla
      para añadir imágenes. Ahora llegan con el resto del
      formulario, en el orden en que el creador las colocó.

      Cada una se mide igual que la portada, leyendo su
      cabecera: de esos números dependen las Stories y el
      carrusel de Corporativos. Un fallo aquí NO tumba la
      creación —el recurso ya existe— y se puede reintentar
      desde la pantalla de imágenes de siempre.
    */
    if (Array.isArray(imagenes) && imagenes.length) {
      const urls = imagenes
        .filter((url: unknown): url is string => typeof url === "string")
        .map((url) => url.trim())
        .filter(Boolean)
        .slice(0, 20);

      for (const [indice, url] of urls.entries()) {
        try {
          const medida = await dimensionesDesdeUrl(url);

          await prisma.productImage.create({
            data: {
              productId: product.id,
              url,
              imageWidth: medida?.width ?? null,
              imageHeight: medida?.height ?? null,
              sortOrder: indice,
            },
          });
        } catch (error) {
          console.error("No se pudo guardar una imagen de galería:", error);
        }
      }
    }

    /*
      Etiquetas descriptivas. Van después de la de pack a
      propósito: sincronizarTagsProducto nunca toca las
      etiquetas protegidas, así que el orden es seguro en
      los dos sentidos.
    */
    await sincronizarTagsProducto(product.id, tags);

    return NextResponse.json(
      {
        message: "Recurso creado correctamente.",
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: product.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ERROR CREANDO RECURSO:", error);

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

