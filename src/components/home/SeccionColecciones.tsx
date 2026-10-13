import { Library } from "lucide-react";

import ColeccionCard from "@/components/ColeccionCard";
import EmptyState from "@/components/EmptyState";
import type { ColeccionVista } from "@/lib/colecciones-comerciales-comun";

/**
 * Colecciones comerciales en la portada.
 *
 * Son las PUBLICADAS más recientes. No hay orden por
 * "popularidad": no existe ninguna métrica real de popularidad
 * de colecciones, y ordenar por una inventada sería decirle al
 * visitante algo que no sabemos.
 *
 * NO son las colecciones personales, que siguen apareciendo
 * en su propia pestaña («Selecciones») del catálogo.
 *
 * Es el contenido de la pestaña «Colecciones» del catálogo del
 * inicio (CatalogoPestanas): el título, la descripción y el
 * enlace a todas las pone la pestaña. Sin datos, lo dice.
 */
export default function SeccionColecciones({
  colecciones,
}: {
  colecciones: ColeccionVista[];
}) {
  if (colecciones.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Próximamente"
        description="Aquí aparecerán las colecciones completas en cuanto un creador publique la primera."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {colecciones.map((coleccion) => (
        <ColeccionCard key={coleccion.id} coleccion={coleccion} />
      ))}
    </div>
  );
}
