import { prisma } from "@/lib/prisma";
import { LIMITE_RELEVANCIA, ordenarPorRelevancia } from "@/lib/busqueda";
import {
  POR_PAGINA,
  SELECCION_TARJETA,
  aTarjeta,
  construirWhere,
  filtrosDesde,
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
  const where = construirWhere(filtros);

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
