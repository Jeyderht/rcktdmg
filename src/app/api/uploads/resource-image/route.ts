import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/auth";
import { ImagenNoProcesable } from "@/lib/marca-agua";
import { driverActual } from "@/lib/storage";
import { blobStorage } from "@/lib/storage/blob";
import { guardarImagenDeRecurso } from "@/lib/storage/imagenes-recurso";
import { REGLAS, pathnameValido } from "@/lib/storage/imagenes";
import type { PrivateObject } from "@/lib/storage/types";

export const runtime = "nodejs";

/*
  Generar la copia lleva menos de un segundo, pero descargar el
  original de hasta 10 MB desde el almacén suma: margen holgado.
*/
export const maxDuration = 60;

const REGLA = REGLAS["resource-image"];

const ERROR_GENERICO =
  "No se pudo preparar la imagen con la marca de agua. No se ha guardado nada; inténtalo de nuevo.";

/**
 * Imagen de recurso (portada, vista previa o galería).
 *
 * El original nunca toca el almacén público:
 *
 *   - Con Blob, el navegador ya lo dejó en el almacén PRIVADO
 *     (product-uploads/<idUsuario>-<uuid>.<ext>) y aquí llega su
 *     ruta.
 *   - En local, llega el archivo por formulario.
 *
 * Aquí se genera la copia con marca de agua y se guardan el
 * original (privado) y la copia (pública). Se devuelve SOLO la
 * URL de la copia; la imagen se asocia al recurso después, desde
 * la API de recursos, como antes.
 *
 * Falla cerrado: si la copia no se genera o no se sube, responde
 * con un error claro y no deja nada guardado —ni el original—. Lo
 * subido a product-uploads/ se borra siempre, salga bien o mal.
 */
export async function POST(request: Request) {
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
      { error: "No tienes permisos para subir imágenes." },
      { status: 403 }
    );
  }

  const userId = session.userId;
  const esConfirmacion = (request.headers.get("content-type") || "")
    .includes("application/json");

  // Ruta de la subida privada pendiente de convertir, si la hay.
  let pendiente: string | null = null;

  try {
    let original: Buffer;
    let contentType: string | undefined;
    let fileName: string;

    if (esConfirmacion) {
      if (driverActual() !== "blob") {
        return NextResponse.json(
          { error: "Este almacén no admite subidas directas." },
          { status: 400 }
        );
      }

      const cuerpo = await request.json().catch(() => null);
      const ruta = typeof cuerpo?.ruta === "string" ? cuerpo.ruta : "";

      // Solo una subida suya, en la carpeta y con el formato firmados.
      if (!pathnameValido("resource-image", ruta, userId)) {
        return NextResponse.json(
          { error: "Ruta de imagen no permitida." },
          { status: 403 }
        );
      }

      pendiente = ruta;

      const objeto = await blobStorage.getPrivateByPath(ruta);

      if (!objeto) {
        return NextResponse.json(
          { error: "La imagen no existe en el almacén." },
          { status: 404 }
        );
      }

      const leido = await leerConTope(objeto, REGLA.maxBytes);

      if (!leido) {
        return NextResponse.json(
          { error: REGLA.etiqueta },
          { status: 400 }
        );
      }

      original = leido;
      contentType = objeto.contentType ?? undefined;
      fileName = ruta.split("/").pop() ?? "imagen";
    } else {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "No se recibió ninguna imagen." },
          { status: 400 }
        );
      }

      if (file.size > REGLA.maxBytes) {
        return NextResponse.json(
          { error: REGLA.etiqueta },
          { status: 400 }
        );
      }

      if (!Object.keys(REGLA.tiposMime).includes(file.type)) {
        return NextResponse.json(
          { error: "Formato no permitido. Usa JPG, PNG o WEBP." },
          { status: 400 }
        );
      }

      original = Buffer.from(await file.arrayBuffer());
      contentType = file.type;
      fileName = file.name || "imagen";
    }

    const guardada = await guardarImagenDeRecurso(original, contentType);

    return NextResponse.json({
      success: true,
      imageUrl: guardada.url,
      fileName,
    });
  } catch (error) {
    if (error instanceof ImagenNoProcesable) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(
      "ERROR PREPARANDO IMAGEN DE RECURSO:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json({ error: ERROR_GENERICO }, { status: 500 });
  } finally {
    // La subida temporal no se conserva nunca: ya es original o copia.
    if (pendiente) {
      await blobStorage.deletePrivateByPath(pendiente).catch(() => {});
    }
  }
}

/** El cuerpo entero en memoria, o null si pasa de `tope` bytes. */
async function leerConTope(
  objeto: PrivateObject,
  tope: number
): Promise<Buffer | null> {
  if (objeto.size !== null && objeto.size > tope) return null;

  if (Buffer.isBuffer(objeto.body)) {
    return objeto.body.length > tope ? null : objeto.body;
  }

  const partes: Uint8Array[] = [];
  let total = 0;
  const lector = objeto.body.getReader();

  for (;;) {
    const { done, value } = await lector.read();

    if (done) break;

    total += value.byteLength;

    if (total > tope) {
      await lector.cancel();
      return null;
    }

    partes.push(value);
  }

  return Buffer.concat(partes);
}
