import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { puedeVerVersionLimpia } from "@/lib/imagen-limpia";
import { idDeCopia, leerOriginal } from "@/lib/storage/imagenes-recurso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ productId: string; imagen: string }> };

/*
  Nunca en una caché compartida: es de una persona concreta. Y sin
  que el navegador adivine el tipo.
*/
const CABECERAS_PRIVADAS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

/**
 * Original sin marca de agua de una imagen de recurso.
 *
 *   GET /api/imagenes/limpia/<id del recurso>/<id de la copia>
 *
 * Solo para quien lo compró, su creador o la administración
 * (imagen-limpia.ts), comprobado en cada petición. La imagen tiene que
 * ser de ESE recurso —portada, vista previa o galería—: no se puede
 * pedir el original de otro cambiando el id.
 */
export async function GET(_request: Request, { params }: Contexto) {
  const { productId, imagen } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(imagen)) {
    return NextResponse.json({ error: "Imagen no válida." }, { status: 400, headers: CABECERAS_PRIVADAS });
  }

  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401, headers: CABECERAS_PRIVADAS });
  }

  const producto = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      creatorId: true,
      coverUrl: true,
      previewUrl: true,
      images: { select: { url: true } },
    },
  });

  // La copia tiene que pertenecer a este recurso.
  const urlCopia = producto
    ? [producto.coverUrl, producto.previewUrl, ...producto.images.map((i) => i.url)].find(
        (url) => idDeCopia(url) === imagen
      )
    : undefined;

  if (!producto || !urlCopia) {
    return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404, headers: CABECERAS_PRIVADAS });
  }

  if (!(await puedeVerVersionLimpia(session, producto))) {
    return NextResponse.json(
      { error: "La versión sin marca es solo para quien compró el recurso." },
      { status: 403, headers: CABECERAS_PRIVADAS }
    );
  }

  const original = await leerOriginal(urlCopia);

  if (!original) {
    return NextResponse.json({ error: "Imagen no encontrada." }, { status: 404, headers: CABECERAS_PRIVADAS });
  }

  const cuerpo = Buffer.isBuffer(original.body) ? new Uint8Array(original.body) : original.body;

  // El almacén local no guarda el tipo: se reconoce por los primeros bytes.
  const tipo =
    original.contentType ??
    (Buffer.isBuffer(original.body) ? tipoPorFirma(original.body) : null) ??
    "application/octet-stream";

  return new NextResponse(cuerpo, {
    headers: {
      ...CABECERAS_PRIVADAS,
      "Content-Type": tipo,
      ...(original.size !== null ? { "Content-Length": String(original.size) } : {}),
      "Content-Disposition": "inline",
    },
  });
}

/** JPEG, PNG o WEBP por su firma; null si no es ninguno. */
function tipoPorFirma(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.readUInt32BE(0) === 0x89504e47) return "image/png";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}
