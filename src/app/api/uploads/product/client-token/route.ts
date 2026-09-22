import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";

import { verifySessionToken } from "@/lib/auth";
import { tokenPrivado } from "@/lib/storage/blob";

export const runtime = "nodejs";

/**
 * Autorización para subir un archivo vendible directamente al
 * almacén privado.
 *
 * El archivo NO pasa por esta función: una función de Vercel
 * admite como mucho 4,5 MB de cuerpo y los recursos pueden
 * llegar a 100 MB. El navegador sube el archivo al almacén y
 * este endpoint solo firma el permiso, con los mismos límites
 * que la subida por servidor:
 *
 *   - sesión válida
 *   - rol CREATOR o ADMIN
 *   - 100 MB como máximo
 *   - las mismas extensiones permitidas
 *   - destino siempre "products/…" y access "private"
 */

const MAX_FILE_SIZE = 100 * 1024 * 1024;

/** products/<uuid><extensión>, sin subcarpetas ni nombres libres. */
const PATHNAME_VALIDO =
  /^products\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i;

const ALLOWED_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "application/octet-stream",
];

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("rcktdmg_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No hay una sesión activa." },
        { status: 401 }
      );
    }

    const session = await verifySessionToken(token);

    if (!session || !session.userId) {
      return NextResponse.json(
        { error: "La sesión no es válida o ha expirado." },
        { status: 401 }
      );
    }

    if (session.role !== "CREATOR" && session.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos para subir archivos." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    const resultado = await handleUpload({
      body,
      request,
      token: tokenPrivado(),

      onBeforeGenerateToken: async (pathname: string) => {
        // El cliente propone la ruta, así que se comprueba:
        // siempre dentro de "products/" y con un nombre
        // generado, nunca uno elegido a mano.
        if (!PATHNAME_VALIDO.test(pathname)) {
          throw new Error("Ruta de destino no permitida.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE,
          addRandomSuffix: false,
          // Queda registrado quién pidió el permiso.
          tokenPayload: JSON.stringify({
            userId: session.userId,
          }),
        };
      },

      onUploadCompleted: async () => {
        // El recurso se crea después, desde el formulario, con
        // la URL devuelta. Aquí no se toca la base de datos.
      },
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("ERROR AUTORIZANDO SUBIDA DIRECTA:", error);

    return NextResponse.json(
      { error: "No se pudo autorizar la subida." },
      { status: 500 }
    );
  }
}
