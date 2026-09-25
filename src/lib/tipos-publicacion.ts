/**
 * Tipos de publicación.
 *
 * Lo primero que elige un creador, y lo que decide el resto
 * del formulario: en qué categoría entra la pieza, qué medidas
 * se le exigen y si se construye aquí o en su propio taller.
 *
 * Este archivo NO importa Prisma a propósito: lo lee el
 * formulario, que corre en el navegador. Las categorías se
 * nombran por su `slug`, que es estable, y se resuelven a id
 * contra las que existan de verdad en la base de datos.
 */

export type ClaveTipo =
  | "EVENTO"
  | "GENERAL"
  | "SOCIAL_MEDIA"
  | "CORPORATIVO"
  | "COLECCION"
  | "PACK";

/** Medidas exigidas a la portada de una pieza. */
export type MedidaExigida = {
  ancho: number;
  alto: number;
  /** Cómo se le llama a la proporción, para el mensaje de error. */
  proporcion: string;
};

export type TipoPublicacion = {
  clave: ClaveTipo;
  nombre: string;
  descripcion: string;
  /**
   * Categoría en la que entra. Null para los tipos que no son
   * un recurso suelto (colección y pack).
   */
  categoriaSlug: string | null;
  /**
   * Dónde se construye. Los recursos se crean en este mismo
   * formulario; las colecciones y los packs se arman a partir
   * de recursos YA publicados, así que tienen su propia
   * pantalla y aquí solo se enlaza.
   */
  ruta: string | null;
  /**
   * Formatos que admite. Si tiene más de uno, el creador elige
   * y cada uno puede exigir sus medidas.
   */
  formatos: FormatoPieza[];
};

export type FormatoPieza = {
  clave: string;
  nombre: string;
  /** Null: se acepta cualquier medida. */
  medida: MedidaExigida | null;
};

/** Sin exigencia de medidas. */
const LIBRE: FormatoPieza = {
  clave: "LIBRE",
  nombre: "Sin formato fijo",
  medida: null,
};

export const STORY: MedidaExigida = {
  ancho: 1080,
  alto: 1920,
  proporcion: "9:16",
};

export const CORPORATIVO: MedidaExigida = {
  ancho: 1080,
  alto: 1350,
  proporcion: "4:5",
};

export const TIPOS_PUBLICACION: TipoPublicacion[] = [
  {
    clave: "EVENTO",
    nombre: "Evento",
    descripcion:
      "Piezas de una fiesta, concierto o fecha concreta: story, flyer, portada, perfil o post.",
    categoriaSlug: "eventos",
    ruta: null,
    /*
      Un evento no es una sola imagen: es un juego de piezas.
      Solo la story tiene medida obligatoria, porque es la
      única que se pinta a pantalla completa en Home y una
      proporción distinta se vería recortada o con bandas.
    */
    formatos: [
      { clave: "STORY", nombre: "Story · 1080 × 1920", medida: STORY },
      { clave: "FLYER", nombre: "Flyer principal", medida: null },
      { clave: "PORTADA", nombre: "Portada", medida: null },
      { clave: "PERFIL", nombre: "Foto de perfil", medida: null },
      { clave: "POST", nombre: "Post", medida: null },
      { clave: "OTRO", nombre: "Otra pieza del evento", medida: null },
    ],
  },
  {
    clave: "CORPORATIVO",
    nombre: "Corporativo",
    descripcion:
      "Comunicación de marca: anuncios, presentaciones y campañas de empresa.",
    categoriaSlug: "corporativos",
    ruta: null,
    /*
      Medida obligatoria: el carrusel de Home es 4:5 exacto y
      una pieza de otra proporción rompería la fila.
    */
    formatos: [
      {
        clave: "CORPORATIVO",
        nombre: "Corporativo · 1080 × 1350",
        medida: CORPORATIVO,
      },
    ],
  },
  {
    clave: "SOCIAL_MEDIA",
    nombre: "Social Media",
    descripcion: "Contenido para redes, sin atarse a un evento concreto.",
    categoriaSlug: "social-media",
    ruta: null,
    formatos: [LIBRE],
  },
  {
    clave: "GENERAL",
    nombre: "Diseño general",
    descripcion:
      "Cualquier diseño que no pertenezca a una campaña ni a un evento.",
    categoriaSlug: "general",
    ruta: null,
    formatos: [LIBRE],
  },
  {
    clave: "COLECCION",
    nombre: "Colección",
    descripcion:
      "Varias piezas tuyas vendidas juntas por un solo precio. Se arma con recursos ya publicados.",
    categoriaSlug: null,
    ruta: "/creadores/panel/colecciones",
    formatos: [],
  },
  {
    clave: "PACK",
    nombre: "Pack",
    descripcion:
      "Agrupación descargable de recursos tuyos ya publicados.",
    categoriaSlug: null,
    ruta: "/creadores/panel/packs",
    formatos: [],
  },
];

export function tipoPorClave(clave: string): TipoPublicacion | null {
  return TIPOS_PUBLICACION.find((t) => t.clave === clave) ?? null;
}

/** ¿Este tipo se crea en el formulario de recurso? */
export function esRecursoSuelto(tipo: TipoPublicacion): boolean {
  return tipo.categoriaSlug !== null;
}

/**
 * Comprueba unas medidas contra las que exige el formato.
 *
 * Devuelve `null` si todo está bien y, si no, la frase exacta
 * que hay que enseñar. El mensaje dice qué se esperaba y qué
 * llegó: «no válido» no le sirve a nadie para arreglarlo.
 */
export function revisarMedidas(
  medida: MedidaExigida | null,
  reales: { ancho: number; alto: number } | null
): string | null {
  if (!medida) return null;

  if (!reales) {
    return "No se pudieron leer las medidas de la imagen. Prueba con un PNG, JPG o WEBP.";
  }

  if (reales.ancho === medida.ancho && reales.alto === medida.alto) {
    return null;
  }

  return `El archivo debe ser ${medida.ancho} × ${medida.alto} px (${medida.proporcion}). El que subiste es ${reales.ancho} × ${reales.alto} px.`;
}
