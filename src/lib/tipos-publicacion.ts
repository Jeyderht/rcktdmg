import type { $Enums } from "@prisma/client";

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
  | "PLANTILLA"
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
  /**
   * Valor con el que se guarda en la base.
   *
   * Solo lo tienen las piezas de evento: son las únicas que se
   * persisten hoy. En el resto queda null y la columna del
   * recurso también.
   */
  pieza?: TipoPieza;
};

/**
 * Los tipos de pieza, tal y como los guarda la base.
 *
 * Se declara con `$Enums` para que TypeScript avise si alguien
 * añade un valor al enum de Prisma y se olvida de traerlo
 * aquí: el guardia de exhaustividad de más abajo deja de
 * compilar.
 */
export type TipoPieza = $Enums.PieceType;


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

/**
 * La medida estándar del catálogo: 1080 × 1350, 4:5.
 *
 * La usan TODAS las piezas salvo la story de evento y Social
 * Media: corporativos, diseño general y el resto de piezas de
 * un evento (flyer, portada, perfil, post y otras).
 *
 * Se llama por su proporción y no por una categoría porque ya
 * no pertenece a ninguna en particular.
 */
export const CUATRO_QUINTOS: MedidaExigida = {
  ancho: 1080,
  alto: 1350,
  proporcion: "4:5",
};

/**
 * Nombre anterior de la misma medida.
 *
 * Se conserva porque varios módulos ya la importaban así
 * cuando era exclusiva de Corporativos. Es la MISMA constante,
 * no una copia: cambiar una cambia las dos.
 */
export const CORPORATIVO = CUATRO_QUINTOS;

/**
 * Formato estándar del catálogo.
 *
 * Lo usan diseño general y corporativos: la misma pieza con
 * el mismo marco. Social Media es el único que sigue sin
 * medida fija.
 */
const ESTANDAR: FormatoPieza = {
  clave: "ESTANDAR",
  nombre: "1080 × 1350 · 4:5",
  medida: CUATRO_QUINTOS,
};

export const TIPOS_PUBLICACION: TipoPublicacion[] = [
  {
    clave: "EVENTO",
    nombre: "Evento",
    descripcion:
      "Piezas de una fiesta, concierto o fecha concreta. Todas verticales, 1080 × 1920.",
    categoriaSlug: "eventos",
    ruta: null,
    /*
      Un evento no es una sola imagen: es un juego de piezas.
      Solo la story tiene medida obligatoria, porque es la
      única que se pinta a pantalla completa en Home y una
      proporción distinta se vería recortada o con bandas.
    */
    formatos: [
      {
        clave: "STORY",
        nombre: "Story · 1080 × 1920",
        medida: STORY,
        pieza: "EVENT_STORY",
      },
      {
        clave: "FLYER",
        nombre: "Flyer principal · 1080 × 1920",
        medida: STORY,
        pieza: "EVENT_FLYER",
      },
      {
        clave: "PORTADA",
        nombre: "Portada · 1080 × 1920",
        medida: STORY,
        pieza: "EVENT_COVER",
      },
      {
        clave: "PERFIL",
        nombre: "Foto de perfil · 1080 × 1920",
        medida: STORY,
        pieza: "EVENT_PROFILE",
      },
      {
        clave: "POST",
        nombre: "Post · 1080 × 1920",
        medida: STORY,
        pieza: "EVENT_POST",
      },
      {
        clave: "OTRO",
        nombre: "Otra pieza · 1080 × 1920",
        medida: STORY,
        pieza: "EVENT_OTHER",
      },
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
    /*
      Plantillas existe como categoría real del catálogo desde
      el principio, pero no tenía tipo de publicación, y el
      formulario construye sus opciones a partir de esta lista:
      sin entrada aquí, un creador no podía publicar en
      Plantillas por mucho que la categoría estuviera creada.

      No se le impone medida: `medidaExigidaPara` no exige
      ninguna a este slug, así que el formato es libre, igual
      que en Social Media.
    */
    clave: "PLANTILLA",
    nombre: "Plantilla",
    descripcion:
      "Archivos editables para reutilizar y adaptar a cada proyecto.",
    categoriaSlug: "plantillas",
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
    formatos: [ESTANDAR],
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

/* ══════════════ TIPOS DE PIEZA ══════════════ */

/**
 * Cómo se llama cada pieza para una persona.
 *
 * Es un `Record` completo a propósito: si mañana el enum de
 * Prisma gana un valor, esto deja de compilar hasta que
 * alguien decida cómo se llama. Un tipo sin nombre saldría en
 * pantalla como EVENT_LO_QUE_SEA.
 */
export const ETIQUETA_PIEZA: Record<TipoPieza, string> = {
  EVENT_STORY: "Story",
  EVENT_FLYER: "Flyer",
  EVENT_COVER: "Portada",
  EVENT_PROFILE: "Perfil",
  EVENT_POST: "Post",
  EVENT_OTHER: "Otra pieza",
};

/** Qué medidas exige cada pieza. Solo la story exige unas. */
/**
 * Qué medida exige cada pieza.
 *
 * Todas las de un evento son verticales: la categoría entera
 * lo es. La tabla se conserva porque documenta pieza a pieza
 * lo que `medidaExigidaPara` resuelve por categoría, y porque
 * el guardia de exhaustividad avisa si mañana aparece un tipo
 * de pieza nuevo sin medida asignada.
 */
export const MEDIDA_DE_PIEZA: Record<TipoPieza, MedidaExigida | null> = {
  EVENT_STORY: STORY,
  EVENT_FLYER: STORY,
  EVENT_COVER: STORY,
  EVENT_PROFILE: STORY,
  EVENT_POST: STORY,
  EVENT_OTHER: STORY,
};

/**
 * Qué medida se le exige a un recurso. LA ÚNICA.
 *
 * La usan el formulario antes de subir, la API antes de
 * guardar y administración al revisar. Si alguna de las tres
 * calculara la suya por su cuenta, tarde o temprano una
 * aceptaría lo que otra rechaza.
 *
 * El orden importa:
 *
 * 1. Dentro de eventos manda la PIEZA que declaró el creador.
 *    Una story pide 9:16; el resto, 4:5.
 * 2. Fuera de eventos manda la categoría.
 * 3. Social Media no exige medida, y una pieza de evento sin
 *    tipo declarado tampoco: son los recursos anteriores a
 *    que esto se guardara y no se les inventa una regla.
 */
export function medidaExigidaPara(
  categoriaSlug: string | null | undefined,
  pieceType: TipoPieza | null | undefined
): MedidaExigida | null {
  /*
    EVENTOS ES VERTICAL, ENTERO.

    Manda la CATEGORÍA, no la pieza. Un evento se consume en el
    móvil a pantalla completa —da igual que la pieza sea una
    story, un flyer o un post—, así que todas sus piezas
    comparten el 9:16.

    Que dependa de la categoría y no del `pieceType` tiene una
    consecuencia buscada: los recursos de Eventos anteriores a
    que la pieza se guardara, con `pieceType` nulo, también se
    reconocen y se tratan como verticales.
  */
  /*
    La pieza también identifica al evento: EVENT_* solo existe
    dentro de Eventos. Así una llamada que solo conozca la
    pieza —una miniatura de carrito, por ejemplo— llega a la
    misma conclusión que una que conozca la categoría.
  */
  const esEvento =
    categoriaSlug === "eventos" ||
    (typeof pieceType === "string" && pieceType.startsWith("EVENT_"));

  if (esEvento) {
    return STORY;
  }

  if (categoriaSlug === "corporativos" || categoriaSlug === "general") {
    return CUATRO_QUINTOS;
  }

  // social-media y cualquier categoría futura: sin medida fija.
  return null;
}

/**
 * Con qué proporción se enseña un recurso.
 *
 * Es la cara visible de la regla de arriba: el marco de una
 * tarjeta, de la ficha o del visor. Devuelve el valor tal y
 * como lo entiende CSS.
 *
 * Null significa «lo que traiga la imagen»: Social Media y los
 * recursos antiguos sin tipo. Quien lo reciba debe elegir un
 * marco por defecto en vez de estirar nada.
 */
export function proporcionDeRecurso(
  categoriaSlug: string | null | undefined,
  pieceType: TipoPieza | null | undefined
): string | null {
  const medida = medidaExigidaPara(categoriaSlug, pieceType);

  if (!medida) return null;

  return `${medida.ancho} / ${medida.alto}`;
}

export function esTipoPieza(valor: unknown): valor is TipoPieza {
  return (
    typeof valor === "string" && Object.hasOwn(ETIQUETA_PIEZA, valor)
  );
}

/**
 * Traduce la opción del formulario al valor que se guarda.
 *
 * Devuelve null cuando el tipo elegido no persiste pieza
 * —cualquiera que no sea un evento—, que es exactamente lo
 * que debe quedar en la columna.
 */
export function piezaDeFormato(
  claveTipo: string,
  claveFormato: unknown
): TipoPieza | null {
  const tipo = tipoPorClave(claveTipo);

  if (!tipo) return null;

  const formato = tipo.formatos.find((f) => f.clave === claveFormato);

  return formato?.pieza ?? null;
}

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

/**
 * Qué clase de marco le corresponde a un recurso.
 *
 * Existe para que ningún componente tenga que preguntarse
 * «¿esto es una story?». Se le pasa lo que sabe del recurso y
 * devuelve la clase; la proporción concreta vive en el CSS y
 * la decisión, aquí. Una sola fuente para las dos cosas.
 *
 * Sin datos —una miniatura de un carrito guardado antes de
 * que esto existiera— devuelve el marco del catálogo, que es
 * lo correcto para casi todo y nunca deforma: recorta.
 */
export function claseProporcion({
  categoriaSlug,
  pieceType,
}: {
  /** Slug de la categoría del recurso, si se conoce. */
  categoriaSlug?: string | null;
  /** Pieza declarada, si se conoce. */
  pieceType?: TipoPieza | null;
}): string {
  /*
    El argumento es un OBJETO a propósito. Con dos parámetros
    sueltos, el día que cambie el orden una llamada antigua
    seguiría compilando y pasaría la pieza donde va la
    categoría, en silencio. Así el compilador obliga a mirar
    cada sitio.

    La decisión la toma `medidaExigidaPara`, la MISMA función
    que exige la medida al subir: el marco y la validación no
    pueden discrepar.
  */
  const medida = medidaExigidaPara(categoriaSlug, pieceType);

  return medida === STORY ? "rk-aspect-story" : "rk-aspect-product";
}

/**
 * Slugs de los que depende el comportamiento del sistema.
 *
 * No son una lista aparte: salen de los propios tipos de
 * publicación, que es donde ya estaban declarados. Se añade
 * `social-media` porque Home lo consulta por su slug aunque no
 * exija medidas.
 *
 * Renombrar una de estas categorías está permitido; cambiarle
 * el SLUG no, porque es lo que decide qué medidas se exigen.
 * Un evento cuyo slug dejara de ser «eventos» pasaría a
 * aceptar 4:5 sin que nadie lo hubiera pedido.
 */
export const SLUGS_DEL_SISTEMA: readonly string[] = [
  ...new Set(
    TIPOS_PUBLICACION.map((t) => t.categoriaSlug).filter(
      (s): s is string => Boolean(s)
    )
  ),
  "social-media",
];

export function esSlugDelSistema(slug: string): boolean {
  return SLUGS_DEL_SISTEMA.includes(slug);
}
