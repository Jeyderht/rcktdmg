import Link from "next/link";
import type { Metadata } from "next";
import { Library } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import { formatPrice } from "@/lib/pricing";
import { listarTodasLasColecciones } from "@/lib/colecciones-comerciales";
import { ETIQUETA_ESTADO_COLECCION } from "@/lib/colecciones-comerciales-comun";

export const metadata: Metadata = {
  title: "Colecciones comerciales",
};

export const dynamic = "force-dynamic";

const TONO: Record<string, string> = {
  DRAFT: "rk-badge-neutral",
  PUBLISHED: "rk-badge-success",
  ARCHIVED: "rk-badge-warning",
};

/**
 * Colecciones comerciales, vista de administración.
 *
 * Es una vista de supervisión, no una segunda cola de
 * moderación: una colección solo puede contener recursos que
 * YA pasaron por revisión, así que no hay nada nuevo que
 * aprobar. Administración puede editarlas y archivarlas por la
 * misma API que el creador, que acepta el rol ADMIN.
 */
export default async function AdminColeccionesPage() {
  const colecciones = await listarTodasLasColecciones();

  return (
    <div className="rk-fade-up">
      <header>
        <p className="rk-kicker">Catálogo</p>

        <h1 className="rk-title mt-2 text-2xl sm:text-3xl">
          Colecciones comerciales
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
          Conjuntos que los creadores venden como una sola compra. No
          son las colecciones personales de los clientes, que son
          listas privadas y no se venden.
        </p>
      </header>

      {colecciones.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Library}
            title="Todavía no hay colecciones"
            description="Cuando un creador publique una, aparecerá aquí."
          />
        </div>
      ) : (
        <ul className="mt-7 space-y-2.5">
          {colecciones.map((coleccion) => (
            <li
              key={coleccion.id}
              className="rk-card flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">
                  {coleccion.name}
                </p>

                <p className="mt-0.5 truncate text-[13px] tabular-nums text-ink/55">
                  {coleccion.creador.nombre} ·{" "}
                  {coleccion.productos.length} recursos ·{" "}
                  {formatPrice(coleccion.price)}
                  {coleccion.ahorro &&
                    ` · ahorro ${coleccion.ahorro.porcentaje}%`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rk-badge ${
                    TONO[coleccion.status] ?? "rk-badge-neutral"
                  }`}
                >
                  {ETIQUETA_ESTADO_COLECCION[coleccion.status]}
                </span>

                {coleccion.status === "PUBLISHED" && (
                  <Link
                    href={`/colecciones-comerciales/${coleccion.slug}`}
                    className="rk-btn rk-btn-line !px-4 !py-2 !text-[13px]"
                  >
                    Ver ficha
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
