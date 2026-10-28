/**
 * Versión LIMPIA (sin marca de agua) de las imágenes de un recurso.
 *
 * La copia pública lleva la marca; el original vive en el almacén
 * privado. El original solo lo ven, y solo en la ficha del recurso:
 *
 *   - quien lo compró: con el MISMO criterio que la descarga
 *     (/api/downloads/[id]): una descarga activa con su pedido pagado
 *     y la licencia sin retirar;
 *   - el creador dueño;
 *   - la administración.
 *
 * Se entrega por /api/imagenes/limpia/<recurso>/<id de la copia>, que
 * vuelve a comprobarlo en cada petición. Las listas y las tarjetas
 * siguen usando siempre la copia con marca.
 */

import { prisma } from "@/lib/prisma";
import { licenciaRetirada } from "@/lib/licencias";
import type { SessionData } from "@/lib/session";
import { RUTA_VERSION_LIMPIA } from "@/lib/imagen-limpia-comun";
import { idDeCopia } from "@/lib/storage/imagenes-recurso";

/** ¿Puede esta sesión ver el original sin marca de este recurso? */
export async function puedeVerVersionLimpia(
  session: SessionData | null,
  producto: { id: string; creatorId: string }
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  if (session.userId === producto.creatorId) return true;

  // Comprador: lo mismo que exige la descarga.
  const descarga = await prisma.download.findFirst({
    where: {
      userId: session.userId,
      productId: producto.id,
      status: "ACTIVE",
      order: { status: "PAID" },
    },
    select: { id: true },
  });

  if (!descarga) return false;

  return !(await licenciaRetirada(session.userId, producto.id));
}

/**
 * La ruta de la versión limpia de una imagen del recurso, o null si
 * la URL no es una copia con marca (las de antes de la marca ya son
 * el original y se enseñan tal cual).
 */
export function urlVersionLimpia(
  productId: string,
  urlCopia: string | null | undefined
): string | null {
  const id = idDeCopia(urlCopia);

  return id ? `${RUTA_VERSION_LIMPIA}${productId}/${id}` : null;
}
