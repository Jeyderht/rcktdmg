import { NextResponse } from "next/server";
import path from "path";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPrivate, esReferenciaBlob, esRutaPrivadaLocal } from "@/lib/storage";
import { nombreDeArchivoLocal } from "@/lib/storage/local";
import { tieneColeccion } from "@/lib/adquisiciones";
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
      select: { id: true, name: true, zipUrl: true },
    });

    if (!coleccion) {
      return NextResponse.json(
        { error: "Colección no encontrada." },
        { status: 404 }
      );
    }

    // La compra, y solo la compra, da derecho al archivo.
    const suya = await tieneColeccion(session.userId, coleccion.id);

    if (!suya) {
      return NextResponse.json(
        { error: "No has adquirido esta colección." },
        { status: 403 }
      );
    }

    /*
      SIN ZIP PROPIO: se arma uno con los recursos incluidos.

      El del creador manda siempre que exista. Este es el
      recambio para las colecciones que no lo tienen, que
      antes obligaban a bajar pieza por pieza.

      Se mide primero y se escribe después: si no cabe, se
      responde con el motivo en vez de empezar un archivo que
      quedaría cortado.
    */
    if (!coleccion.zipUrl) {
      const preparado = await prepararZipDeColeccion(coleccion.id);

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
          "Content-Disposition": `attachment; filename="${nombreZip}"`,

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

        "Content-Disposition": `attachment; filename="${nombre}"`,

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
