import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { putPrivate } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Subida del archivo de portafolio de una solicitud.
 *
 * Va al almacén PRIVADO, nunca al público: un portafolio es
 * material que alguien comparte para que lo revisen, no para
 * publicarlo. Solo administración puede abrirlo después, por
 * /api/admin/solicitudes/[id]/portafolio.
 *
 * Cualquier usuario con sesión puede subirlo, porque quien
 * solicita ser creador todavía es CLIENT.
 */

const TAMANO_MAXIMO = 15 * 1024 * 1024;

const EXTENSIONES = [".pdf", ".zip", ".png", ".jpg", ".jpeg", ".webp"];

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Debes iniciar sesión." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío." },
        { status: 400 }
      );
    }

    if (file.size > TAMANO_MAXIMO) {
      return NextResponse.json(
        { error: "El portafolio no puede pasar de 15 MB." },
        { status: 400 }
      );
    }

    const nombreOriginal = file.name || "portafolio";

    const punto = nombreOriginal.lastIndexOf(".");

    const extension =
      punto > -1 ? nombreOriginal.slice(punto).toLowerCase() : "";

    if (!EXTENSIONES.includes(extension)) {
      return NextResponse.json(
        {
          error: `Formato no admitido. Usa ${EXTENSIONES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const guardado = await putPrivate({
      fileName: `${crypto.randomUUID()}${extension}`,
      data: buffer,
      contentType: file.type || undefined,
    });

    /*
      Se devuelve la referencia porque el formulario tiene que
      mandarla de vuelta al enviar la solicitud. No es una URL
      pública: sin sesión de ADMIN no se puede leer.
    */
    return NextResponse.json({
      success: true,
      portfolioFileUrl: guardado.url,
      fileName: nombreOriginal,
      size: file.size,
    });
  } catch (error) {
    console.error("POST /api/uploads/portafolio:", error);

    return NextResponse.json(
      { error: "No se pudo subir el portafolio." },
      { status: 500 }
    );
  }
}
