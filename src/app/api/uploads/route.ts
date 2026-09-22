import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Endpoint retirado.
 *
 * Escribía el archivo directamente en `storage/` del servidor y
 * devolvía una ruta `/api/download-file/…` que nunca existió
 * como página. Sobre Vercel el sistema de archivos es efímero,
 * así que ese camino no podía funcionar en producción.
 *
 * Se comprobó en todo el repositorio que no tenía ni un solo
 * consumidor antes de retirarlo.
 *
 * Los reemplazos vigentes son:
 *
 *   - archivos vendibles : POST /api/uploads/product
 *                          (o subida directa al almacén privado
 *                          con /api/uploads/product/client-token)
 *
 *   - imágenes públicas  : POST /api/uploads/product-image,
 *                          /api/uploads/creator-avatar,
 *                          /api/uploads/creator-cover
 *                          (o subida directa con
 *                          /api/uploads/imagenes/client-token)
 *
 * Se responde 410 Gone en vez de borrar la ruta: si algún
 * cliente antiguo siguiera llamándola, recibe una respuesta
 * explícita en lugar de un 404 que parecería un fallo de
 * enrutado.
 */

const RESPUESTA = {
  error: "Este endpoint fue retirado.",
  usar: {
    archivoVendible: "/api/uploads/product",
    imagenes: [
      "/api/uploads/product-image",
      "/api/uploads/creator-avatar",
      "/api/uploads/creator-cover",
    ],
  },
} as const;

export async function POST() {
  return NextResponse.json(RESPUESTA, { status: 410 });
}

export async function GET() {
  return NextResponse.json(RESPUESTA, { status: 410 });
}
