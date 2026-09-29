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
    /*
      Solo categorías activas. Una categoría retirada sigue
      existiendo para no perder los recursos que ya cuelgan de
      ella, pero no admite piezas nuevas: ofrecerla aquí sería
      invitar a publicar en un sitio que el administrador ya
      cerró. La API lo comprueba otra vez por su cuenta.
    */
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      /* El slug es lo que enlaza cada tipo de publicación con su categoría. */
      slug: true,
    },
  });

  return <NuevoRecursoForm categories={categories} />;
}
