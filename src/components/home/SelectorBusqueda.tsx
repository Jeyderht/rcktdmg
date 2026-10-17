import QueBuscas, { type OpcionQueBuscasVista } from "@/components/home/QueBuscas";
import { CATEGORIA_EVENTOS, type OpcionQueBuscas } from "@/lib/home";

/**
 * "¿Qué estás buscando?"
 *
 * Dos caminos, no dos pestañas: cada uno lleva a un listado
 * que ya existe, con su URL propia, así que se puede enlazar,
 * compartir y volver atrás. La tira los alterna (QueBuscas),
 * pero los enlaces son siempre los mismos.
 */

/*
  DESTINOS

    "Eventos"           → /tienda?categoria=eventos
    "Diseños generales" → /tienda?sin=eventos

  Cada opción lleva a lo que dice su etiqueta: `categoria`
  filtra POR esa categoría y `sin` la EXCLUYE, así que los dos
  caminos se reparten el catálogo entero sin solaparse.
*/
const OPCIONES = [
  {
    clave: "eventos",
    titulo: "Eventos",
    texto:
      "Flyers de fiestas, conciertos y fechas señaladas.",
    href: `/tienda?categoria=${CATEGORIA_EVENTOS}`,
    vertical: true,
    sufijo: "de eventos",
  },
  {
    clave: "generales",
    titulo: "Diseños generales",
    texto:
      "Todo lo demás: corporativos, social media, plantillas y colecciones.",
    href: `/tienda?sin=${CATEGORIA_EVENTOS}`,
    vertical: false,
    sufijo: "en total",
  },
] as const;

/**
 * Columnas del resumen; la que no tiene dato real no se enseña.
 * Sin «Desde»: el precio más bajo ya sale en el hero.
 */
function columnas(datos: OpcionQueBuscas): OpcionQueBuscasVista["columnas"] {
  return [
    datos.creadores > 0 && { etiqueta: "Creadores", valor: String(datos.creadores) },
    // Cifra grande en un tercio del ancho: con varios formatos
    // («JPEG · JPG · ZIP») no cabe y se cortaba; va el número.
    datos.formatos.length === 1 && { etiqueta: "Formato", valor: datos.formatos[0] },
    datos.formatos.length > 1 && { etiqueta: "Formatos", valor: String(datos.formatos.length) },
  ].filter((c) => c !== false);
}

export default function SelectorBusqueda({
  datos,
}: {
  datos: { eventos: OpcionQueBuscas; generales: OpcionQueBuscas };
}) {
  return (
    <QueBuscas
      opciones={OPCIONES.map((o) => ({
        clave: o.clave,
        titulo: o.titulo,
        texto: o.texto,
        href: o.href,
        vertical: o.vertical,
        portadas: datos[o.clave].portadas,
        total: datos[o.clave].recursos,
        sufijo: o.sufijo,
        columnas: columnas(datos[o.clave]),
      }))}
    />
  );
}
