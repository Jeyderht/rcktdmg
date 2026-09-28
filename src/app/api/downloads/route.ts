import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 },
      );
    }

    const session = await verifySessionToken(token);

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "Sesión inválida o expirada." },
        { status: 401 },
      );
    }

    /*
      Las dos consultas no dependen una de otra, así que van a
      la vez: antes se esperaba a que terminara la primera para
      empezar la segunda sin ningún motivo.
    */
    const [downloads, lineas] = await Promise.all([
      prisma.download.findMany({
        where: {
          userId: session.userId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              coverUrl: true,
              /* Decide el marco de la miniatura: story o catálogo. */
              pieceType: true,
              description: true,
              /*
              fileUrl NO se devuelve: es la referencia al
              almacén privado y el cliente no la necesita para
              nada —descarga por /api/downloads/[id], que
              comprueba sesión, pedido y licencia—. La página
              nunca la usó; solo viajaba por la red sin motivo.
            */
            },
          },
          order: {
            select: {
              id: true,
              createdAt: true,
              status: true,
            },
          },
        },
        orderBy: {
          order: {
            createdAt: "desc",
          },
        },
      }),

      /*
      COLECCIONES ADQUIRIDAS

      Comprar una colección crea una descarga por recurso —así
      estaba montado y así sigue—, pero en la lista eso aparece
      como diez piezas sueltas sin nada que las relacione. Aquí
      se devuelven además las colecciones de las que salieron,
      para poder enseñarlas como lo que son y ofrecer su
      archivo único cuando el creador lo subió.

      Se resuelven junto a las descargas de arriba.
    */
      prisma.orderItem.findMany({
        where: {
          order: { userId: session.userId, status: "PAID" },
          commercialCollectionId: { not: null },
        },
        select: {
          commercialCollectionId: true,
          order: { select: { createdAt: true } },
          collection: {
            select: {
              id: true,
              name: true,
              slug: true,
              coverUrl: true,
              price: true,
              zipUrl: true,
              _count: { select: { items: true } },
              /*
                Para saber si se puede armar un ZIP automático
                hace falta que TODAS las piezas tengan archivo.
                Se trae solo esa referencia, no los archivos.
              */
              items: { select: { product: { select: { fileUrl: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    /* Una colección por compra, aunque haya aportado diez líneas. */
    const vistas = new Set<string>();

    const colecciones = lineas
      .filter((linea) => {
        const id = linea.commercialCollectionId;

        if (!id || !linea.collection || vistas.has(id)) return false;

        vistas.add(id);

        return true;
      })
      .map((linea) => ({
        id: linea.collection!.id,
        name: linea.collection!.name,
        slug: linea.collection!.slug,
        coverUrl: linea.collection!.coverUrl,
        precioPagado: Number(linea.collection!.price),
        recursos: linea.collection!._count.items,
        /*
          Si hay descarga de la colección entera, y de dónde
          sale: el archivo que subió el creador, o uno armado
          al vuelo con sus piezas. La URL privada no viaja en
          ningún caso.
        */
        tieneZip: Boolean(linea.collection!.zipUrl),
        puedeDescargarse:
          Boolean(linea.collection!.zipUrl) ||
          (linea.collection!.items.length > 0 &&
            linea.collection!.items.every((i) => Boolean(i.product.fileUrl))),
        compradaEl: linea.order.createdAt.toISOString(),
      }));

    return NextResponse.json({
      downloads,
      colecciones,
    });
  } catch (error) {
    console.error("Error obteniendo descargas:", error);

    return NextResponse.json(
      { error: "No se pudieron cargar las descargas." },
      { status: 500 },
    );
  }
}
