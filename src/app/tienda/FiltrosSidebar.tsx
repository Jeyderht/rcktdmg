import Link from "next/link";
import { Check } from "lucide-react";

import {
  COLORES,
  RANGOS_PRECIO,
  ordenPorDefecto,
  ordenesDisponibles,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";

/**
 * Filtros de escritorio.
 *
 * Cada opción es un enlace real: el filtrado ocurre en el
 * servidor, con la URL como única fuente de verdad. Así los
 * resultados se pueden compartir, volver atrás funciona y la
 * página sigue siendo usable sin JavaScript.
 *
 * Solo se ofrecen formatos y colores que existen de verdad en
 * el catálogo publicado, para que ningún filtro lleve a una
 * lista vacía.
 */

type Opcion = {
  valor: string;
  etiqueta: string;
  conteo?: number;
  muestra?: string;
};

function Muestra({ color }: { color: string }) {
  if (color === "multicolor") {
    return (
      <span
        aria-hidden
        className="rk-swatch rk-swatch-multi"
      />
    );
  }

  const definicion = COLORES.find((c) => c.valor === color);

  if (!definicion?.muestra) return null;

  return (
    <span
      aria-hidden
      className="rk-swatch"
      style={{ backgroundColor: definicion.muestra }}
    />
  );
}

function Grupo({
  titulo,
  clave,
  opciones,
  activo,
  actuales,
  conMuestra = false,
}: {
  titulo: string;
  clave: keyof ParametrosTienda;
  opciones: Opcion[];
  activo: string;
  actuales: ParametrosTienda;
  conMuestra?: boolean;
}) {
  if (opciones.length === 0) return null;

  return (
    <div className="rk-filter-group">
      <p className="rk-filter-title">{titulo}</p>

      <div className="rk-filter-options">
        {opciones.map((opcion) => {
          const seleccionada = opcion.valor === activo;

          return (
            <Link
              key={opcion.valor || "todos"}
              href={urlTienda(actuales, {
                // Volver a pulsar la opción activa la quita.
                [clave]: seleccionada ? undefined : opcion.valor,
              })}
              aria-current={seleccionada ? "true" : undefined}
              className="rk-filter-option"
            >
              {conMuestra && <Muestra color={opcion.valor} />}

              <span className="rk-filter-label">
                {opcion.etiqueta}
              </span>

              {typeof opcion.conteo === "number" && (
                <span className="rk-filter-count">
                  {opcion.conteo}
                </span>
              )}

              {seleccionada && (
                <Check aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function FiltrosSidebar({
  actuales,
  formatos,
  colores,
  etiquetas,
  totalPacks,
}: {
  actuales: ParametrosTienda;
  formatos: Opcion[];
  colores: Opcion[];
  etiquetas: Opcion[];
  totalPacks: number;
}) {
  // "Relevancia" solo se ofrece si hay algo que puntuar.
  const hayBusqueda = Boolean(actuales.q);

  return (
    <aside
      aria-label="Filtros"
      className="hidden w-[15.5rem] shrink-0 lg:block"
    >
      <div className="sticky top-24 space-y-3">
        <Grupo
          titulo="Orden"
          clave="sort"
          opciones={ordenesDisponibles(hayBusqueda).map((o) => ({
            valor: o.valor,
            etiqueta: o.etiqueta,
          }))}
          activo={actuales.sort ?? ordenPorDefecto(hayBusqueda)}
          actuales={actuales}
        />

        <Grupo
          titulo="Precio"
          clave="precio"
          opciones={RANGOS_PRECIO.map((r) => ({
            valor: r.valor,
            etiqueta: r.etiqueta,
          }))}
          activo={actuales.precio ?? ""}
          actuales={actuales}
        />

        {/* Etiquetas reales del catálogo publicado. */}
        <Grupo
          titulo="Etiquetas"
          clave="tag"
          opciones={etiquetas}
          activo={actuales.tag ?? ""}
          actuales={actuales}
        />

        <Grupo
          titulo="Formato"
          clave="formato"
          opciones={formatos}
          activo={actuales.formato ?? ""}
          actuales={actuales}
        />

        <Grupo
          titulo="Color"
          clave="color"
          opciones={colores}
          activo={actuales.color ?? ""}
          actuales={actuales}
          conMuestra
        />

        {/* El filtro de packs solo existe si hay packs. */}
        {totalPacks > 0 && (
          <Grupo
            titulo="Tipo"
            clave="pack"
            opciones={[
              {
                valor: "true",
                etiqueta: "Solo packs",
                conteo: totalPacks,
              },
            ]}
            activo={actuales.pack ?? ""}
            actuales={actuales}
          />
        )}
      </div>
    </aside>
  );
}
