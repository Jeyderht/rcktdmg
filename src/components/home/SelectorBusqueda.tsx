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
      "Flyers de fiestas, conciertos y fechas señaladas. Listos para publicar.",
    href: `/tienda?categoria=${CATEGORIA_EVENTOS}`,
    vertical: true,
    boton: "Ver eventos",
  },
  {
    clave: "generales",
    titulo: "Diseños generales",
    texto:
      "Todo lo demás: corporativos, social media, plantillas y colecciones.",
    href: `/tienda?sin=${CATEGORIA_EVENTOS}`,
    vertical: false,
    boton: "Ver diseños generales",
  },
] as const;

/** Cifras reales; una cifra a 0 no se enseña. */
function cifras(datos: OpcionQueBuscas): OpcionQueBuscasVista["cifras"] {
  return [
    datos.recursos > 0 && {
      clave: "recursos" as const,
      etiqueta: "Recursos publicados",
      valor: String(datos.recursos),
    },
    datos.creadores > 0 && {
      clave: "creadores" as const,
      etiqueta: datos.creadores === 1 ? "Creador" : "Creadores",
      valor: String(datos.creadores),
    },
    datos.formatos.length > 0 && {
      clave: "formatos" as const,
      etiqueta: datos.formatos.length === 1 ? "Formato" : "Formatos",
      valor: datos.formatos.join(" · "),
    },
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
        ...o,
        portadas: datos[o.clave].portadas,
        cifras: cifras(datos[o.clave]),
      }))}
    />
  );
}
