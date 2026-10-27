import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import type { SessionData } from "@/lib/session";
import {
  autorizarCambio,
  type ErrorCambio,
  type PeticionCambio,
} from "@/lib/vista-previa-permisos";

export type ResultadoCambio = {
  /** Recursos que ahora tienen el valor pedido. */
  actualizados: number;
  /** Ids pedidos que no existen (solo la administración los ve). */
  noEncontrados: string[];
  previewLibre: boolean;
};

/**
 * Cambia «vista previa libre» de uno o varios recursos, después de
 * comprobar en el servidor quién lo pide (vista-previa-permisos.ts).
 *
 * Las páginas públicas no usan caché de servidor —se pintan en cada
 * petición—, así que el cambio ya se ve en la siguiente carga. Aun
 * así se invalidan todas las rutas donde aparece el recurso: si
 * alguna pasara a tener caché, pasar a «Solo registrados» seguiría
 * dejando de entregar la imagen real a los visitantes al momento.
 */
export async function cambiarVistaPrevia(
  session: SessionData | null,
  peticion: PeticionCambio
): Promise<ResultadoCambio | ErrorCambio> {
  const encontrados = await prisma.product.findMany({
    where: { id: { in: peticion.ids } },
    select: {
      id: true,
      slug: true,
      creatorId: true,
      creator: { select: { username: true } },
    },
  });

  const permiso = autorizarCambio(
    session ? { userId: session.userId, role: session.role } : null,
    peticion.ids,
    encontrados
  );

  if ("error" in permiso) return permiso;

  const resultado = await prisma.product.updateMany({
    where: { id: { in: encontrados.map((r) => r.id) } },
    data: { previewLibre: peticion.previewLibre },
  });

  // Todas las páginas donde puede aparecer el recurso.
  for (const r of encontrados) {
    revalidatePath(`/tienda/${r.slug}`);
    if (r.creator.username) revalidatePath(`/creadores/${r.creator.username}`);
  }

  for (const ruta of ["/", "/tienda", "/packs", "/colecciones-comerciales", "/api/recomendaciones"]) {
    revalidatePath(ruta);
  }

  revalidatePath("/packs/[slug]", "page");
  revalidatePath("/colecciones-comerciales/[slug]", "page");
  revalidatePath("/colecciones/[id]", "page");

  const existentes = new Set(encontrados.map((r) => r.id));

  return {
    actualizados: resultado.count,
    noEncontrados: peticion.ids.filter((id) => !existentes.has(id)),
    previewLibre: peticion.previewLibre,
  };
}
