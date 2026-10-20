import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { LIMITE_RELEVANCIA, ordenarPorRelevancia } from "@/lib/busqueda";
import {
  POR_PAGINA,
  SELECCION_TARJETA,
  aTarjeta,
  construirWhere,
  filtrosDesde,
  lista,
  ORIENTACIONES,
  ordenEfectivo,
  ordenPrisma,
  paginaActual,
  type ParametrosTienda,
} from "@/lib/catalogo";

/**
 * Consulta paginada del catálogo.
 *
 * Es el único sitio donde la tienda pide recursos. Antes cada
 * listado hacía su propio `findMany` sin límite y traía el
 * catálogo entero; aquí siempre se piden como mucho
 * POR_PAGINA filas.
 */

export type ResultadoCatalogo = {
  productos: ReturnType<typeof aTarjeta>[];
  /** Total real de recursos que cumplen los filtros. */
  total: number;
  pagina: number;
  totalPaginas: number;
  /** true si se pidió una página que no existe. */
  paginaCorregida: boolean;
};

function vacio(): Omit<ResultadoCatalogo, "paginaCorregida"> {
  return { productos: [], total: 0, pagina: 1, totalPaginas: 1 };
}

export async function consultarCatalogo(
  parametros: ParametrosTienda,
  /**
   * Tamaño de página. La tienda usa el de por defecto; poder
   * cambiarlo permite comprobar el paginado con el catálogo
   * real, sin tener que inventar recursos para llenarlo.
   */
  porPagina: number = POR_PAGINA
): Promise<ResultadoCatalogo> {
  const filtros = filtrosDesde(parametros);
  const where = whereTienda(parametros);

  const texto = filtros.query?.trim() ?? "";
  const hayBusqueda = texto.length > 0;

  const orden = ordenEfectivo(parametros.sort, hayBusqueda);
  const pedida = paginaActual(parametros);

  const total = await prisma.product.count({ where });

  if (total === 0) {
    return { ...vacio(), paginaCorregida: pedida > 1 };
  }

  if (orden === "relevancia") {
    return porRelevancia({ where, texto, total, pedida, porPagina });
  }

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const pagina = Math.min(pedida, totalPaginas);

  const filas = await prisma.product.findMany({
    where,
    /*
      El id cierra el orden. Sin un criterio único al final,
      dos recursos con el mismo precio o la misma fecha pueden
      intercambiarse entre consultas y hacer que uno salga
      repetido en la página 2 y otro no salga nunca.
    */
    orderBy: [...ordenPrisma(orden), { id: "desc" }],
    skip: (pagina - 1) * porPagina,
    take: porPagina,
    select: SELECCION_TARJETA,
  });

  return {
    productos: filas.map(aTarjeta),
    total,
    pagina,
    totalPaginas,
    paginaCorregida: pagina !== pedida,
  };
}

/**
 * Página ordenada por relevancia.
 *
 * Se puntúan como mucho LIMITE_RELEVANCIA candidatos, los más
 * recientes. Con un catálogo normal eso cubre la búsqueda
 * entera; si alguna vez la desbordara, se ordenarían los 500
 * más nuevos en lugar de traer miles de filas para ordenarlas
 * y descartarlas. El total que se muestra sigue siendo el
 * real, no el recortado.
 */
async function porRelevancia({
  where,
  texto,
  total,
  pedida,
  porPagina,
}: {
  where: ReturnType<typeof construirWhere>;
  texto: string;
  total: number;
  pedida: number;
  porPagina: number;
}): Promise<ResultadoCatalogo> {
  const candidatos = await prisma.product.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LIMITE_RELEVANCIA,
    select: { id: true },
  });

  const ordenados = await ordenarPorRelevancia(
    candidatos.map((c) => c.id),
    texto
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(ordenados.length / porPagina)
  );

  const pagina = Math.min(pedida, totalPaginas);

  const idsPagina = ordenados.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina
  );

  if (idsPagina.length === 0) {
    return { ...vacio(), total, paginaCorregida: true };
  }

  const filas = await prisma.product.findMany({
    where: { id: { in: idsPagina } },
    select: SELECCION_TARJETA,
  });

  // `IN` no conserva el orden: se recompone el de relevancia.
  const porId = new Map(filas.map((fila) => [fila.id, fila]));

  const productos = idsPagina.flatMap((id) => {
    const fila = porId.get(id);

    return fila ? [aTarjeta(fila)] : [];
  });

  return {
    productos,
    total,
    pagina,
    totalPaginas,
    paginaCorregida: pagina !== pedida,
  };
}

/*
  Orientación de la portada. Compara dos columnas del mismo
  recurso (alto frente a ancho), así que necesita referencias de
  campo del cliente de Prisma: por eso vive aquí, en el servidor,
  y no en lib/catalogo, que también se usa en el navegador.
  Un recurso sin medidas no cumple ninguna (null nunca compara).
*/
function condicionOrientacion(valor: string): Prisma.ProductWhereInput {
  const ancho = prisma.product.fields.coverWidth;

  if (valor === "vertical") return { coverHeight: { gt: ancho } };
  if (valor === "horizontal") return { coverHeight: { lt: ancho } };

  return { coverHeight: { equals: ancho } };
}

/** El `where` completo de la tienda: catálogo + orientación. */
export function whereTienda(
  parametros: ParametrosTienda
): Prisma.ProductWhereInput {
  const where = construirWhere(filtrosDesde(parametros));
  const orientaciones = lista(parametros.orientacion);

  // Las tres marcadas equivalen a «con medidas»; ninguna, a todo.
  if (orientaciones.length === 0) return where;

  return {
    AND: [where, { OR: orientaciones.map(condicionOrientacion) }],
  };
}

export type FacetasTienda = {
  /** Recursos con TODOS los filtros aplicados. */
  total: number;
  categorias: Record<string, number>;
  formatos: Record<string, number>;
  colores: Record<string, number>;
  licencias: Record<string, number>;
  orientaciones: Record<string, number>;
};

/**
 * Contadores del panel de filtros.
 *
 * Cada grupo se cuenta con el resto de filtros activos pero sin el
 * suyo: así «JPG (3)» dice cuántos habría al marcar JPG, aunque ya
 * esté marcado PSD. Son consultas de conteo y groupBy, nunca filas.
 */
export async function facetasTienda(
  parametros: ParametrosTienda
): Promise<FacetasTienda> {
  const sin = (clave: keyof ParametrosTienda) =>
    whereTienda({ ...parametros, [clave]: undefined });

  const enMapa = <T extends { _count: { _all: number } }>(
    filas: T[],
    clave: (fila: T) => string | null
  ) =>
    Object.fromEntries(
      filas.flatMap((fila) => {
        const valor = clave(fila);
        return valor ? [[valor, fila._count._all]] : [];
      })
    );

  const sinLicencia = sin("licencia");
  const sinOrientacion = sin("orientacion");

  const [
    total,
    porCategoria,
    categorias,
    porFormato,
    porColor,
    gratis,
    premium,
    ...orientaciones
  ] = await Promise.all([
    prisma.product.count({ where: whereTienda(parametros) }),
    prisma.product.groupBy({
      by: ["categoryId"],
      where: sin("categoria"),
      _count: { _all: true },
    }),
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.product.groupBy({
      by: ["fileFormat"],
      where: sin("formato"),
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["color"],
      where: sin("color"),
      _count: { _all: true },
    }),
    prisma.product.count({
      where: { AND: [sinLicencia, { price: { equals: 0 } }] },
    }),
    prisma.product.count({
      where: { AND: [sinLicencia, { price: { gt: 0 } }] },
    }),
    ...ORIENTACIONES.map((o) =>
      prisma.product.count({
        where: { AND: [sinOrientacion, condicionOrientacion(o.valor)] },
      })
    ),
  ]);

  const slugDe = new Map(categorias.map((c) => [c.id, c.slug]));

  return {
    total,
    categorias: enMapa(porCategoria, (f) => slugDe.get(f.categoryId) ?? null),
    formatos: enMapa(porFormato, (f) => f.fileFormat?.toLowerCase() ?? null),
    colores: enMapa(porColor, (f) => f.color),
    licencias: { gratis, premium },
    orientaciones: Object.fromEntries(
      ORIENTACIONES.map((o, i) => [o.valor, orientaciones[i] ?? 0])
    ),
  };
}
