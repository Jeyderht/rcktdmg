import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleUpload } from "@vercel/blob/client";
import type { HandleUploadBody } from "@vercel/blob/client";

import { verifySessionToken } from "@/lib/auth";
import { tokenPrivado, tokenPublico } from "@/lib/storage/blob";
import {
  REGLAS,
  pathnameValido,
  tipoDesdePathname,
} from "@/lib/storage/imagenes";

export const runtime = "nodejs";

/**
 * Autorización para subir una imagen pública directamente al
 * almacén "rcktdmg-media".
 *
 * La imagen NO pasa por esta función: el cuerpo de una función
 * de Vercel admite unos 4,5 MB y las imágenes llegan a 10 MB.
 * El navegador sube al almacén y aquí solo se firma el permiso,
 * con las mismas condiciones que tenía la subida por servidor:
 *
 *   - sesión válida
 *   - rol CREATOR o ADMIN
 *   - tamaño máximo según el tipo de imagen
 *   - solo JPG, PNG o WEBP
 *   - ruta dentro de la carpeta que corresponde al tipo
 *   - en avatar y portada, nombre prefijado con el id del
 *     usuario: nadie puede escribir sobre el de otro
 */
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

    if (!session || typeof session.userId !== "string") {
      return NextResponse.json(
        { error: "La sesión no es válida o ha expirado." },
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

    const body = (await request.json()) as HandleUploadBody;

    /*
      El almacén lo decide la carpeta de destino: las imágenes de
      recurso van al privado (el público solo recibe su copia con
      marca de agua); el resto, al público como siempre. La carpeta
      se vuelve a validar abajo antes de firmar.
    */
    const destino =
      body.type === "blob.generate-client-token"
        ? body.payload.pathname
        : body.payload.blob.pathname;
    const tipoDestino = tipoDesdePathname(destino);
    const privada = tipoDestino ? REGLAS[tipoDestino].privada : false;

    const resultado = await handleUpload({
      body,
      request,
      token: privada ? tokenPrivado() : tokenPublico(),

      onBeforeGenerateToken: async (pathname: string) => {
        // El tipo sale de la carpeta, no de lo que diga el
        // cliente: así no puede pedir permisos de otro tipo.
        const tipo = tipoDesdePathname(pathname);

        if (!tipo) {
          throw new Error("Carpeta de destino no permitida.");
        }

        if (!pathnameValido(tipo, pathname, userId)) {
          throw new Error("Ruta de destino no permitida.");
        }

        const regla = REGLAS[tipo];

        return {
          allowedContentTypes: Object.keys(regla.tiposMime),
          maximumSizeInBytes: regla.maxBytes,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId, tipo }),
        };
      },

      onUploadCompleted: async () => {
        // La base de datos se actualiza en el endpoint que
        // confirma la subida, no aquí: esta devolución no
        // llega cuando se trabaja en local.
      },
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error(
      "ERROR AUTORIZANDO SUBIDA DE IMAGEN:",
      error
    );

    return NextResponse.json(
      { error: "No se pudo autorizar la subida." },
      { status: 500 }
    );
  }
}
