import { NextResponse } from "next/server";
import path from "path";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPrivate, esReferenciaBlob, esRutaPrivadaLocal } from "@/lib/storage";
import { nombreDeArchivoLocal } from "@/lib/storage/local";
import { disposicionDescarga } from "@/lib/descarga-cabeceras";
import { pagoAprobadoParaPedido } from "@/lib/pago-validado";
import { importesDePedidoValidos } from "@/lib/importes-pedido";
import { otorgarLicenciasDePedido } from "@/lib/licencias";
import {
  comprimirColeccion,
  prepararZipDeColeccion,
} from "@/lib/zip-coleccion";

export const runtime = "nodejs";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Descarga del archivo único de una colección.
 *
 * Mismo criterio que /api/downloads/[id], del que es hermana:
 *
 * 1. Se comprueba la sesión.
 * 2. Se comprueba que esa persona COMPRÓ esta colección.
 * 3. El archivo se sirve desde el servidor, en streaming.
 *
 * La URL del almacén privado NO sale nunca hacia el navegador,
 * ni siquiera como redirección: quien descarga solo ve esta
 * ruta. Sin compra, 403, aunque el id sea correcto.
 *
 * El ZIP es un añadido, no la entrega. Cada recurso de la
 * colección conserva su propia descarga y su propia licencia,
 * que es como funcionaba desde el principio; esto solo permite
 * bajarlo todo de una vez cuando el creador subió el archivo.
 */
export async function GET(_request: Request, contexto: Contexto) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const { id } = await contexto.params;

    const coleccion = await prisma.commercialCollection.findUnique({
      where: { id },
      select: { id: true, name: true, zipUrl: true, items: { select: { productId: true }, orderBy: { sortOrder: "asc" } } },
    });

    if (!coleccion) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    const userId = session.userId;
    const pedido = await prisma.order.findFirst({
      where: { userId, status: "PAID", items: { some: { commercialCollectionId: id } } },
      orderBy: { createdAt: "desc" },
      include: {
        payment: true,
        items: { include: { product: { select: { name: true, fileUrl: true, fileFormat: true } } } },
        downloads: { where: { userId, status: "ACTIVE" }, select: { productId: true } },
      },
    });
    if (!pedido || !pagoAprobadoParaPedido(pedido.payment, pedido.total)
      || !importesDePedidoValidos(pedido.items, pedido.subtotal, pedido.discount, pedido.total)) {
      return NextResponse.json({ error: "Se requiere una compra válida de esta colección." }, { status: 403 });
    }
    const lineas = pedido.items.filter(item => item.commercialCollectionId === id);
    const descargas = new Set(pedido.downloads.map(item => item.productId));
    const licencias = () => prisma.license.findMany({
      where: { orderId: pedido.id, userId, orderItemId: { in: lineas.map(item => item.id) } },
      select: { orderItemId: true, productId: true, status: true },
    });
    let emitidas = await licencias();
    if (emitidas.length < lineas.length) {
      await otorgarLicenciasDePedido(pedido.id);
      emitidas = await licencias();
    }
    const activas = new Map(emitidas.filter(item => item.status === "ACTIVE").map(item => [item.orderItemId, item.productId]));
    if (!lineas.every(item => descargas.has(item.productId) && activas.get(item.id) === item.productId)) {
      return NextResponse.json({ error: "La colección incluye una descarga o licencia inactiva." }, { status: 403 });
    }
    const ordenActual = new Map(coleccion.items.map((item, index) => [item.productId, index]));
    const mismoContenido = ordenActual.size === lineas.length && lineas.every(item => ordenActual.has(item.productId));

    /*
      SIN ZIP PROPIO: se arma uno con los recursos incluidos.

      El del creador manda siempre que exista. Este es el
      recambio para las colecciones que no lo tienen, que
      antes obligaban a bajar pieza por pieza.

      Se mide primero y se escribe después: si no cabe, se
      responde con el motivo en vez de empezar un archivo que
      quedaría cortado.
    */
    if (!coleccion.zipUrl || !mismoContenido) {
      lineas.sort((a, b) => (ordenActual.get(a.productId) ?? Infinity) - (ordenActual.get(b.productId) ?? Infinity));
      const preparado = await prepararZipDeColeccion(lineas);

      if (!preparado.ok) {
        return NextResponse.json(
          { error: preparado.error },
          { status: preparado.estado }
        );
      }

      const nombreZip = `${
        coleccion.name
          .normalize("NFC")
          .replace(/[\\/:*?"<>|]/g, "-")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60) || "coleccion"
      }.zip`;

      return new NextResponse(comprimirColeccion(preparado.piezas), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",

          /*
            Sin Content-Length: el tamaño comprimido no se
            conoce hasta terminar, y anunciar uno equivocado
            rompe la descarga.
          */
          "Content-Disposition": disposicionDescarga(nombreZip),

          "Cache-Control": "private, no-store",
        },
      });
    }

    /*
      La referencia puede ser del almacén privado o de disco,
      igual que en los recursos. Cualquier otra forma se
      rechaza en vez de intentar servirla.
    */
    let nombre = "";

    if (esReferenciaBlob(coleccion.zipUrl)) {
      try {
        nombre = decodeURIComponent(
          new URL(coleccion.zipUrl).pathname.split("/").pop() || ""
        );
      } catch {
        nombre = "";
      }
    } else if (esRutaPrivadaLocal(coleccion.zipUrl)) {
      // Mantiene la protección contra path traversal.
      nombre = nombreDeArchivoLocal(coleccion.zipUrl) ?? "";
    } else {
      return NextResponse.json(
        { error: "El archivo de la colección no está bien configurado." },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
    }

    const objeto = await getPrivate(coleccion.zipUrl);

    if (!objeto) {
      return NextResponse.json(
        { error: "El archivo no existe en el servidor." },
        { status: 404 }
      );
    }

    const TIPOS: Record<string, string> = {
      ".zip": "application/zip",
      ".rar": "application/vnd.rar",
      ".7z": "application/x-7z-compressed",
    };

    return new NextResponse(objeto.body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          TIPOS[path.extname(nombre).toLowerCase()] ||
          "application/octet-stream",

        "Content-Disposition": disposicionDescarga(nombre),

        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("ERROR DESCARGANDO COLECCIÓN:", error);

    return NextResponse.json(
      { error: "No se pudo descargar la colección." },
      { status: 500 }
    );
  }
}
