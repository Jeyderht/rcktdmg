import {
  REGLAS,
  extensionesDe,
  type TipoImagen,
} from "@/lib/storage/imagenes";
import {
  CORPORATIVO,
  ETIQUETA_PIEZA,
  MEDIDA_DE_PIEZA,
  STORY,
  type MedidaExigida,
  type TipoPieza,
} from "@/lib/tipos-publicacion";

/** Se reexporta para que quien lea los requisitos no necesite dos imports. */
export type { MedidaExigida };
import {
  MAXIMO_RECURSOS_COLECCION,
  MINIMO_RECURSOS_COLECCION,
} from "@/lib/colecciones-comerciales-comun";
import {
  MAXIMO_RECURSOS_PACK,
  MINIMO_RECURSOS_PACK,
} from "@/lib/packs-comun";

/**
 * Los requisitos de contenido, en un solo sitio.
 *
 * ══════════ LO QUE ESTE ARCHIVO NO HACE ══════════
 *
 * NO inventa números. Cada cifra sale de donde ya se aplica:
 *
 *   pesos y formatos de imagen → storage/imagenes.ts, que es
 *     lo que firma el permiso de subida y lo que comprueba el
 *     servidor al confirmarla.
 *   medidas de story y corporativo → tipos-publicacion.ts,
 *     que es lo que rechaza una portada del tamaño incorrecto.
 *   mínimos de colección y pack → sus propios módulos.
 *   archivo descargable → las constantes de más abajo, que
 *     son las mismas que usa /api/uploads/product.
 *
 * Así la documentación no puede desviarse de la realidad: si
 * alguien cambia el límite de 10 MB, esta página lo dice sola.
 * Si en su lugar se hubieran copiado los números aquí, hoy
 * coincidirían y dentro de tres meses no.
 *
 * Lo lee el formulario del creador, la página pública de
 * requisitos, el panel de administración y la guía. Ninguno
 * tiene su propia copia.
 *
 * No importa Prisma: lo carga el navegador.
 */

/* ══════════════ ARCHIVO DESCARGABLE ══════════════ */

/**
 * Lo que admite el archivo que se vende.
 *
 * Son las mismas constantes de /api/uploads/product. Viven
 * aquí porque ese endpoint corre solo en el servidor y el
 * formulario también las necesita; el endpoint las importa
 * desde aquí, no al revés.
 */
export const MAXIMO_BYTES_ARCHIVO = 100 * 1024 * 1024;

export const EXTENSIONES_ARCHIVO = [
  ".zip",
  ".rar",
  ".7z",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".psd",
  ".ai",
  ".eps",
  ".fig",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

/** Lo que admite el ZIP de una colección. Subconjunto del anterior. */
export const EXTENSIONES_COMPRIMIDO = [".zip", ".rar", ".7z"] as const;

/** Cuántas imágenes de galería se aceptan al crear un recurso. */
export const MAXIMO_IMAGENES_GALERIA = 20;

/* ══════════════ PRESENTACIÓN ══════════════ */

/** Bytes en un texto que se pueda leer. */
export function enMegas(bytes: number): string {
  const megas = bytes / (1024 * 1024);

  return `${Number.isInteger(megas) ? megas : megas.toFixed(1)} MB`;
}

/** `.jpg`, `.png` → `JPG, PNG`. */
export function comoLista(extensiones: readonly string[]): string {
  return extensiones
    .map((e) => e.replace(".", "").toUpperCase())
    .join(", ");
}

/**
 * Una exigencia, tal y como se le enseña a una persona.
 *
 * `medida` en null significa que se acepta cualquier tamaño,
 * y eso también se dice: callarlo deja a quien sube una imagen
 * sin saber si va a fallar.
 */
export type Requisito = {
  clave: string;
  /** Cómo se llama en la interfaz. */
  nombre: string;
  /** Para qué sirve, en una frase. */
  paraQue: string;
  medida: MedidaExigida | null;
  formatos: readonly string[];
  maxBytes: number;
  /** Detalles que no caben en los campos de arriba. */
  notas?: readonly string[];
};

/** Las extensiones que admite un tipo de imagen, con punto. */
function formatosDeImagen(tipo: TipoImagen): string[] {
  return extensionesDe(tipo).map((e) => `.${e}`);
}

/* ══════════════ LOS REQUISITOS ══════════════ */

export const REQUISITO_PORTADA: Requisito = {
  clave: "portada",
  nombre: "Portada del recurso",
  paraQue:
    "La imagen con la que la pieza aparece en la tienda, en Home y en las tarjetas.",
  /*
    Sin medida fija por sí sola: la exige el TIPO de
    publicación. Una story pide 1080 × 1920 y un corporativo
    1080 × 1350; un diseño general acepta cualquier tamaño.
  */
  medida: null,
  formatos: formatosDeImagen("product-image"),
  maxBytes: REGLAS["product-image"].maxBytes,
  notas: [
    "Es obligatoria: sin portada el recurso no se ve en ningún sitio.",
    "Si el tipo de publicación exige medidas, se comprueban al subirla.",
  ],
};

export const REQUISITO_STORY: Requisito = {
  clave: "story",
  nombre: "Story de evento",
  paraQue:
    "Se muestra a pantalla completa en Home, como una story de móvil.",
  medida: STORY,
  formatos: formatosDeImagen("product-image"),
  maxBytes: REGLAS["product-image"].maxBytes,
  notas: [
    "La medida es exacta: otra proporción se vería recortada o con bandas.",
    "Se comprueba en el navegador antes de subir y otra vez en el servidor.",
  ],
};

export const REQUISITO_CORPORATIVO: Requisito = {
  clave: "corporativo",
  nombre: "Pieza corporativa",
  paraQue: "Ocupa el carrusel de Corporativos de la portada.",
  medida: CORPORATIVO,
  formatos: formatosDeImagen("product-image"),
  maxBytes: REGLAS["product-image"].maxBytes,
  notas: [
    "La medida es exacta: el carrusel es 4:5 y una pieza distinta rompe la fila.",
    "Se exige por categoría, aunque el formulario diga otra cosa.",
  ],
};

export const REQUISITO_PREVIEW: Requisito = {
  clave: "preview",
  nombre: "Vista previa",
  paraQue:
    "Lo que ve quien todavía no ha comprado, con marca de agua encima.",
  medida: null,
  formatos: formatosDeImagen("product-image"),
  maxBytes: REGLAS["product-image"].maxBytes,
  notas: [
    "Es opcional.",
    "NUNCA subas aquí el archivo que vendes: el preview es público.",
  ],
};

export const REQUISITO_GALERIA: Requisito = {
  clave: "galeria",
  nombre: "Imágenes de galería",
  paraQue: "Las demás vistas del recurso dentro de su ficha.",
  medida: null,
  formatos: formatosDeImagen("product-image"),
  maxBytes: REGLAS["product-image"].maxBytes,
  notas: [
    `Hasta ${MAXIMO_IMAGENES_GALERIA} imágenes por recurso.`,
    "El orden en que las coloques es el que verá quien mire la ficha.",
  ],
};

export const REQUISITO_AVATAR: Requisito = {
  clave: "avatar",
  nombre: "Foto de perfil",
  paraQue: "Te identifica en tu perfil público y junto a cada recurso.",
  /*
    Sin medida obligatoria: se recorta en círculo, así que una
    imagen cuadrada es lo que mejor queda, pero rechazar las
    demás dejaría a mucha gente sin foto por nada.
  */
  medida: null,
  formatos: formatosDeImagen("creator-avatar"),
  maxBytes: REGLAS["creator-avatar"].maxBytes,
  notas: [
    "Se muestra recortada en círculo: usa una imagen cuadrada para que no pierda nada.",
    "Recomendado 400 × 400 px o más.",
  ],
};

export const REQUISITO_PORTADA_PERFIL: Requisito = {
  clave: "portada-perfil",
  nombre: "Portada de tu perfil",
  paraQue: "La banda ancha que encabeza tu perfil público.",
  medida: null,
  formatos: formatosDeImagen("creator-cover"),
  maxBytes: REGLAS["creator-cover"].maxBytes,
  notas: [
    "Es apaisada: lo importante debe quedar en el centro.",
    "Recomendado 1600 × 500 px o proporciones parecidas.",
  ],
};

export const REQUISITO_ARCHIVO: Requisito = {
  clave: "archivo",
  nombre: "Archivo descargable",
  paraQue: "Lo que recibe quien compra. Se guarda en privado.",
  medida: null,
  formatos: EXTENSIONES_ARCHIVO,
  maxBytes: MAXIMO_BYTES_ARCHIVO,
  notas: [
    "Si el recurso son varios archivos, súbelos en un ZIP.",
    "Nunca se enseña sin comprar: se entrega tras el pago y se comprueba la licencia.",
  ],
};

export const REQUISITO_ZIP_COLECCION: Requisito = {
  clave: "zip-coleccion",
  nombre: "Archivo de la colección",
  paraQue: "Permite descargar toda la colección de una vez.",
  medida: null,
  formatos: EXTENSIONES_COMPRIMIDO,
  maxBytes: MAXIMO_BYTES_ARCHIVO,
  notas: [
    "Es opcional.",
    "Sin él, el sistema arma uno con las piezas de la colección.",
    "Con él, se entrega el tuyo: suele estar mejor ordenado.",
  ],
};

export const REQUISITOS: readonly Requisito[] = [
  REQUISITO_PORTADA,
  REQUISITO_STORY,
  REQUISITO_CORPORATIVO,
  REQUISITO_PREVIEW,
  REQUISITO_GALERIA,
  REQUISITO_ARCHIVO,
  REQUISITO_AVATAR,
  REQUISITO_PORTADA_PERFIL,
  REQUISITO_ZIP_COLECCION,
];

export function requisitoPorClave(clave: string): Requisito | null {
  return REQUISITOS.find((r) => r.clave === clave) ?? null;
}

/**
 * Las tres líneas que resumen un requisito.
 *
 * Es lo que se enseña en el panelito de ⓘ junto al campo, y
 * lo mismo que aparece en la página de requisitos.
 */
export function resumirRequisito(requisito: Requisito): string[] {
  return [
    requisito.medida
      ? `${requisito.medida.ancho} × ${requisito.medida.alto} px (${requisito.medida.proporcion})`
      : "Cualquier medida",
    comoLista(requisito.formatos),
    `Máximo ${enMegas(requisito.maxBytes)}`,
  ];
}

/* ══════════════ REGLAS QUE NO SON ARCHIVOS ══════════════ */

/** Condiciones de una colección o un pack, para documentarlas. */
export type ReglaConjunto = {
  nombre: string;
  minimo: number;
  maximo: number;
  notas: readonly string[];
};

export const REGLA_COLECCION: ReglaConjunto = {
  nombre: "Colección",
  minimo: MINIMO_RECURSOS_COLECCION,
  maximo: MAXIMO_RECURSOS_COLECCION,
  notas: [
    "Cualquier combinación de piezas tuyas ya publicadas: stories, flyers, portadas, perfiles, posts, corporativos…",
    "Portada propia, obligatoria. No se toma prestada la del primer recurso.",
    "Vista previa propia, opcional.",
    "Precio propio: se paga UNA vez por todo el conjunto.",
    "El orden que definas es el que verá quien la compre.",
    "Pasa por revisión antes de publicarse.",
    "Quien la compra recibe cada recurso con su propia descarga y su propia licencia.",
  ],
};

export const REGLA_PACK: ReglaConjunto = {
  nombre: "Pack",
  minimo: MINIMO_RECURSOS_PACK,
  maximo: MAXIMO_RECURSOS_PACK,
  notas: [
    "Agrupa recursos tuyos ya publicados.",
    "Se cobra una sola vez y se reparte entre sus piezas.",
    "No exige revisión aparte: sus recursos ya pasaron por moderación.",
  ],
};

/* ══════════════ ¿CUMPLE? ══════════════ */

/** Lo que se sabe de un recurso para juzgarlo. */
export type RecursoAEvaluar = {
  categoriaSlug: string | null;
  /**
   * Pieza declarada por el creador. Null en los recursos
   * anteriores a que esto se guardara, y fuera de eventos.
   */
  pieceType: TipoPieza | null;
  coverUrl: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  previewUrl: string | null;
  fileUrl: string | null;
  fileFormat: string | null;
  imagenes: number;
};

export type Veredicto = {
  /** Qué es: Evento, Corporativo, Social Media… */
  tipo: string;
  /** Qué pieza declaró el creador, con su nombre. Null si no declaró. */
  pieza: string | null;
  /** Medidas reales de la portada, o null si no se leyeron. */
  medidas: string | null;
  /** Medidas que se le exigen, si su tipo exige alguna. */
  exigido: string | null;
  formato: string | null;
  valido: boolean;
  /** Qué falla. Vacío si está todo bien. */
  problemas: string[];
};

/**
 * ¿Este recurso cumple lo que se le pide?
 *
 * La usa administración al revisar, para no tener que abrir
 * cada imagen y medirla a ojo. Aplica EXACTAMENTE las mismas
 * reglas que rechazan una subida: si aquí sale «válido» y el
 * formulario lo rechazó, o al revés, hay un fallo que arreglar.
 *
 * Lo que no se puede saber no se inventa: una portada sin
 * medidas registradas se declara «sin comprobar», no «válida».
 */
export function evaluarRecurso(recurso: RecursoAEvaluar): Veredicto {
  const problemas: string[] = [];

  /*
    LA MEDIDA SALE DEL TIPO DECLARADO, NO DE LA CATEGORÍA.

    Antes, estando en «eventos» se suponía que la pieza era una
    story y se avisaba por si acaso. Ahora el creador dice qué
    es, así que se le exige exactamente lo de su tipo: a una
    story, 1080 × 1920; a un flyer, nada.

    Corporativos sigue siendo una regla de categoría: ahí la
    medida la impone el carrusel, no quien publica.
  */
  const exigida =
    recurso.categoriaSlug === "corporativos"
      ? CORPORATIVO
      : recurso.pieceType
        ? MEDIDA_DE_PIEZA[recurso.pieceType]
        : null;

  const tipo =
    recurso.categoriaSlug === "eventos"
      ? "Evento"
      : recurso.categoriaSlug === "corporativos"
        ? "Corporativo"
        : recurso.categoriaSlug === "social-media"
          ? "Social Media"
          : recurso.categoriaSlug === "general"
            ? "Diseño general"
            : (recurso.categoriaSlug ?? "Sin categoría");

  if (!recurso.coverUrl) problemas.push("No tiene portada.");

  if (!recurso.fileUrl) {
    problemas.push("No tiene archivo descargable.");
  }

  const medidas =
    recurso.coverWidth && recurso.coverHeight
      ? `${recurso.coverWidth} × ${recurso.coverHeight}`
      : null;

  const incumpleMedida = Boolean(
    exigida &&
      medidas &&
      (recurso.coverWidth !== exigida.ancho ||
        recurso.coverHeight !== exigida.alto)
  );

  if (incumpleMedida && exigida) {
    problemas.push(
      `${
        recurso.pieceType
          ? `Declarado como ${ETIQUETA_PIEZA[recurso.pieceType]}: la portada`
          : "La portada"
      } debería ser ${exigida.ancho} × ${exigida.alto} px (${exigida.proporcion}) y es ${medidas}.`
    );
  }

  /*
    Una pieza de evento sin tipo es de las de antes. Se dice,
    porque quien revisa necesita saber que no hay nada contra
    lo que comprobarla, pero no la invalida.
  */
  if (recurso.categoriaSlug === "eventos" && !recurso.pieceType) {
    problemas.push(
      "No declara qué pieza es. Se creó antes de que el tipo se guardara."
    );
  }

  if (recurso.coverUrl && !medidas) {
    problemas.push("No hay medidas registradas de la portada.");
  }

  return {
    tipo,
    pieza: recurso.pieceType ? ETIQUETA_PIEZA[recurso.pieceType] : null,
    medidas,
    exigido: exigida ? `${exigida.ancho} × ${exigida.alto}` : null,
    formato: recurso.fileFormat ? recurso.fileFormat.toUpperCase() : null,
    /*
      Ahora que el tipo se guarda, incumplir su medida SÍ
      invalida: ya no es una suposición sobre lo que la pieza
      podría ser, es lo que su creador declaró que es.
    */
    valido:
      Boolean(recurso.coverUrl) &&
      Boolean(recurso.fileUrl) &&
      !incumpleMedida,
    problemas,
  };
}
