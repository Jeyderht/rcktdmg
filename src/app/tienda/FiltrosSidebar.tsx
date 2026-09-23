import Link from "next/link";
import { Check } from "lucide-react";

import {
  COLORES,
  ORDENES,
  RANGOS_PRECIO,
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
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-line/25"
        style={{
          backgroundImage:
            "conic-gradient(#d03a3a, #e6c02f, #3a9d5d, #2f6fe0, #7a4fd0, #d03a3a)",
        }}
      />
    );
  }

  const definicion = COLORES.find((c) => c.valor === color);

  if (!definicion?.muestra) return null;

  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 shrink-0 rounded-full border border-line/25"
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
    <div className="rk-tile p-4">
      <p className="rk-kicker">{titulo}</p>

      <div className="mt-3 space-y-0.5">
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
              className={`rk-press-sm flex w-full items-center gap-2 rounded-rk-sm px-2.5 py-2 text-[13px] transition-colors duration-fast ease-rk ${
                seleccionada
                  ? "bg-ink/[0.07] font-semibold"
                  : "text-ink/70 hover:bg-ink/[0.04] hover:text-ink"
              }`}
            >
              {conMuestra && <Muestra color={opcion.valor} />}

              <span className="min-w-0 flex-1 truncate">
                {opcion.etiqueta}
              </span>

              {typeof opcion.conteo === "number" && (
                <span className="shrink-0 text-[11px] tabular-nums text-ink/45">
                  {opcion.conteo}
                </span>
              )}

              {seleccionada && (
                <Check size={13} aria-hidden className="shrink-0" />
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
  totalPacks,
}: {
  actuales: ParametrosTienda;
  formatos: Opcion[];
  colores: Opcion[];
  totalPacks: number;
}) {
  return (
    <aside
      aria-label="Filtros"
      className="hidden w-[15.5rem] shrink-0 lg:block"
    >
      <div className="sticky top-24 space-y-3">
        <Grupo
          titulo="Orden"
          clave="sort"
          opciones={ORDENES.map((o) => ({
            valor: o.valor,
            etiqueta: o.etiqueta,
          }))}
          activo={actuales.sort ?? "recientes"}
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
