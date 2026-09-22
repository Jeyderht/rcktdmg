import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import NuevoRecursoForm from "./NuevoRecursoForm";

export const metadata: Metadata = {
  title: "Nuevo recurso",
};

export const dynamic = "force-dynamic";

/**
 * Las categorías se leen de la base de datos.
 *
 * Antes el selector tenía una única opción con el id escrito
 * a mano en el código: funcionaba solo mientras existiera esa
 * categoría y ocultaba cualquier otra. Ahora la lista es la
 * real, sin tocar la API que crea el recurso.
 */
export default async function NuevoRecursoPage() {
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  return <NuevoRecursoForm categories={categories} />;
}
