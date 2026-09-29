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
import { MAXIMO_IMAGENES_GALERIA } from "@/lib/requisitos-contenido";
import {
  medidaExigidaPara,
  piezaDeFormato,
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
      tipo,
    } = body;

    /*
      LA CATEGORÍA LA DECIDE EL TIPO, NO EL NAVEGADOR

      El formulario ya no pregunta la categoría: se deduce del
      tipo de publicación elegido en el primer paso. Aquí se
      vuelve a deducir en el servidor, porque una categoría
      enviada desde el cliente es un dato que el cliente
      controla, y de la categoría dependen las medidas que se
      exigen al recurso.

      Si además llega un `categoryId` y no coincide con el que
      corresponde al tipo, se rechaza en lugar de elegir uno de
      los dos: guardar un evento dentro de Corporativos —o al
      revés— deja el recurso con las medidas de una categoría y
      la etiqueta de otra.

      Sin `tipo` se mantiene el camino de antes, para no romper
      a quien ya llamaba a esta API con `categoryId`.
    */
    let categoriaResuelta: string | null = null;

    if (tipo !== undefined && tipo !== null && tipo !== "") {
      const definicion = tipoPorClave(String(tipo));

      if (!definicion || !definicion.categoriaSlug) {
        return NextResponse.json(
          { error: "El tipo de publicación no es válido." },
          { status: 400 }
        );
      }

      const deTipo = await prisma.category.findUnique({
        where: { slug: definicion.categoriaSlug },
        select: { id: true },
      });

      if (!deTipo) {
        return NextResponse.json(
          {
            error: `No existe la categoría «${definicion.categoriaSlug}» que corresponde a «${definicion.nombre}».`,
          },
          { status: 400 }
        );
      }

      if (categoryId && categoryId !== deTipo.id) {
        return NextResponse.json(
          {
            error: `«${definicion.nombre}» pertenece a «${definicion.categoriaSlug}»; no se puede guardar en otra categoría.`,
          },
          { status: 400 }
        );
      }

      categoriaResuelta = deTipo.id;
    }

    const categoriaFinal = categoriaResuelta ?? categoryId;

    if (!name || !description || !categoriaFinal || price === undefined) {
      return NextResponse.json(
        { error: "Completa todos los campos obligatorios." },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoriaFinal,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "La categoría indicada no existe." },
        { status: 400 }
      );
    }

    /*
      Y tiene que estar activa. El formulario ya no ofrece las
      retiradas, pero esconder la opción no impide que llegue
      un `categoryId` cualquiera por la API: la comprobación
      que cuenta es esta.

      Los recursos que ya viven en una categoría retirada no se
      tocan; lo que se impide es colgar piezas nuevas de ella.
    */
    if (!category.isActive) {
      return NextResponse.json(
        {
          error: `La categoría «${category.name}» está retirada y no admite recursos nuevos.`,
        },
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

      La medida NO se decide aquí: la decide
      `medidaExigidaPara`, que es la misma función que usa el
      formulario antes de subir y la que usa administración al
      revisar. Si este endpoint calculara la suya, acabaría
      aceptando lo que el formulario rechaza, o al revés.

      La pieza declarada manda dentro de eventos y se guarda
      tal cual: un flyer sigue siendo un flyer aunque mida
      1080 × 1920. Las medidas comprueban el tipo elegido;
      nunca lo cambian.
    */
    const pieza =
      category.slug === "eventos" ? piezaDeFormato("EVENTO", formato) : null;

    const exigida = medidaExigidaPara(category.slug, pieza);

    /*
      MEDIDAS: SOLO SI YA HAY PORTADA

      Lo que se crea aquí es siempre un BORRADOR, y un borrador
      puede estar a medias: el creador guarda el nombre y el
      precio, y sube la portada más tarde. Exigirla desde el
      primer guardado obligaba a tenerlo todo listo antes de
      poder apuntar nada.

      Cuando SÍ llega una portada se comprueba igual que
      siempre, para avisar en el momento y no al final. Y la
      exigencia de verdad —portada obligatoria y con la medida
      de su categoría— vive en enviar a revisión y en publicar,
      que son las puertas que sacan el recurso del borrador.
    */
    if (coverUrl) {
      const problemaMedidas = revisarMedidas(
        exigida,
        medidaPortada
          ? { ancho: medidaPortada.width, alto: medidaPortada.height }
          : null
      );

      if (problemaMedidas) {
        return NextResponse.json({ error: problemaMedidas }, { status: 400 });
      }
    }

    const product = await prisma.product.create({
      data: {
        creatorId: session.userId as string,
        categoryId: categoriaFinal,
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
        /*
          Qué pieza es. Null fuera de eventos y null también si
          el creador no declaró ninguna: no se le inventa una.
        */
        pieceType: pieza,
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
        .slice(0, MAXIMO_IMAGENES_GALERIA);

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

