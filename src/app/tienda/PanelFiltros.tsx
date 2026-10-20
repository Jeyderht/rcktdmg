import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

import {
  COLORES,
  LICENCIAS,
  ORIENTACIONES,
  alternar,
  hayFiltros,
  lista,
  urlTienda,
  type ParametrosTienda,
} from "@/lib/catalogo";
import type { FacetasTienda } from "@/lib/catalogo-consulta";

/** Colores que ofrece Explorar, en este orden. */
const COLORES_PANEL = [
  "negro",
  "blanco",
  "rojo",
  "naranja",
  "amarillo",
  "verde",
  "azul",
  "morado",
  "rosa",
];

/** Formatos que siempre se ofrecen; se suman los que existan. */
const FORMATOS_BASE = ["psd", "jpg", "png", "zip"];

type Opcion = {
  valor: string;
  etiqueta: string;
  conteo: number;
};

/**
 * Panel de filtros de Explorar.
 *
 * Cada opción es un enlace real a la URL con esa opción
 * añadida o quitada: funciona sin JavaScript, se renderiza en el
 * servidor y se puede compartir. Los contadores vienen de
 * facetasTienda (cada grupo contado con los demás filtros
 * activos). Una opción sin recursos y sin marcar no lleva a
 * ninguna parte: se ve atenuada y no es un enlace.
 */
export default function PanelFiltros({
  parametros,
  facetas,
  categorias,
}: {
  parametros: ParametrosTienda;
  facetas: FacetasTienda;
  categorias: { slug: string; name: string }[];
}) {
  const formatos = [
    ...new Set([
      ...FORMATOS_BASE,
      ...Object.keys(facetas.formatos),
      ...lista(parametros.formato),
    ]),
  ];

  return (
    <div className="rk-ex-filtros">
      <div className="rk-ex-filtros-cab">
        <h2>Filtros</h2>

        {hayFiltros(parametros) && (
          <Link href="/tienda" className="rk-ex-limpiar">
            Limpiar filtros
          </Link>
        )}
      </div>

      <Grupo
        titulo="Licencia"
        clave="licencia"
        parametros={parametros}
        opciones={LICENCIAS.map((l) => ({
          ...l,
          conteo: facetas.licencias[l.valor] ?? 0,
        }))}
      />

      <Grupo
        titulo="Categorías"
        clave="categoria"
        parametros={parametros}
        opciones={categorias.map((c) => ({
          valor: c.slug,
          etiqueta: c.name,
          conteo: facetas.categorias[c.slug] ?? 0,
        }))}
      />

      <Grupo
        titulo="Formato"
        clave="formato"
        parametros={parametros}
        opciones={formatos.map((f) => ({
          valor: f,
          etiqueta: f.toUpperCase(),
          conteo: facetas.formatos[f] ?? 0,
        }))}
      />

      <details className="rk-ex-grupo" open>
        <summary>
          Color
          <ChevronDown size={16} aria-hidden />
        </summary>

        <ul className="rk-ex-colores" aria-label="Color">
          {COLORES_PANEL.flatMap((valor) => {
            const color = COLORES.find((c) => c.valor === valor);

            if (!color) return [];

            const marcado = lista(parametros.color).includes(valor);
            const conteo = facetas.colores[valor] ?? 0;
            const etiqueta = `${color.etiqueta}, ${conteo} ${conteo === 1 ? "recurso" : "recursos"}${marcado ? ", marcado" : ""}`;
            const muestra = { background: color.muestra };

            return [
              <li key={valor}>
                {conteo > 0 || marcado ? (
                  <Link
                    href={urlTienda(parametros, {
                      color: alternar(parametros.color, valor),
                    })}
                    className="rk-ex-color"
                    data-marcado={marcado || undefined}
                    aria-label={etiqueta}
                    title={`${color.etiqueta} (${conteo})`}
                    scroll={false}
                    style={muestra}
                  />
                ) : (
                  <span
                    className="rk-ex-color"
                    aria-disabled="true"
                    aria-label={etiqueta}
                    title={`${color.etiqueta} (0)`}
                    style={muestra}
                  />
                )}
              </li>,
            ];
          })}
        </ul>
      </details>

      <Grupo
        titulo="Orientación"
        clave="orientacion"
        parametros={parametros}
        opciones={ORIENTACIONES.map((o) => ({
          ...o,
          conteo: facetas.orientaciones[o.valor] ?? 0,
        }))}
      />
    </div>
  );
}

/** Grupo plegable de casillas con su contador. */
function Grupo({
  titulo,
  clave,
  parametros,
  opciones,
}: {
  titulo: string;
  clave: "licencia" | "categoria" | "formato" | "orientacion";
  parametros: ParametrosTienda;
  opciones: Opcion[];
}) {
  const marcados = lista(parametros[clave]);

  return (
    <details className="rk-ex-grupo" open>
      <summary>
        {titulo}
        <ChevronDown size={16} aria-hidden />
      </summary>

      <ul aria-label={titulo}>
        {opciones.map((opcion) => {
          const marcado = marcados.includes(opcion.valor);
          const contenido = (
            <>
              <span className="rk-ex-casilla" aria-hidden>
                {marcado && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="rk-ex-opcion-texto">{opcion.etiqueta}</span>
              <span className="rk-ex-opcion-conteo">{opcion.conteo}</span>
              {marcado && <span className="sr-only">(marcado)</span>}
            </>
          );

          return (
            <li key={opcion.valor}>
              {opcion.conteo > 0 || marcado ? (
                <Link
                  href={urlTienda(parametros, {
                    [clave]: alternar(parametros[clave], opcion.valor),
                  })}
                  className="rk-ex-opcion"
                  data-marcado={marcado || undefined}
                  scroll={false}
                >
                  {contenido}
                </Link>
              ) : (
                <span className="rk-ex-opcion" aria-disabled="true">
                  {contenido}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
