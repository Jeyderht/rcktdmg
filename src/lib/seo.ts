import type { Metadata } from "next";

/**
 * Capa SEO de RcktX.
 *
 * Reúne en un solo sitio la URL base, las URLs canónicas y las
 * directivas de indexación, para que ninguna página tenga que
 * decidirlas por su cuenta.
 */

/**
 * URL pública del sitio.
 *
 * Se resuelve por orden de fiabilidad y NO se codifica ningún
 * dominio en el código:
 *
 *   1. APP_URL              · ya existe en .env, es la que manda
 *   2. NEXT_PUBLIC_APP_URL  · por si se prefiere exponerla al cliente
 *   3. VERCEL_PROJECT_PRODUCTION_URL · dominio estable de producción
 *   4. VERCEL_URL           · URL del despliegue concreto
 *   5. localhost            · desarrollo
 *
 * Las dos de Vercel van DESPUÉS a propósito: `VERCEL_URL` cambia
 * en cada despliegue y usarla como canónica crearía una URL
 * distinta por deploy. Sirve de red de seguridad, no de
 * preferencia.
 *
 * PENDIENTE DE PRODUCCIÓN: hoy `APP_URL` solo está definida en
 * local. Para que las canónicas, el sitemap y Open Graph
 * apunten al dominio real hay que definir `APP_URL` en las
 * variables de entorno de Vercel. No se ha tocado nada allí.
 */
export function urlBase(): string {
  const candidatas = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const valor of candidatas) {
    const limpio = valor?.trim();

    if (!limpio) continue;

    // Las variables de Vercel llegan sin protocolo.
    const conEsquema = /^https?:\/\//.test(limpio)
      ? limpio
      : `https://${limpio}`;

    return conEsquema.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export const SITIO = {
  nombre: "RcktX",
  /*
    Descripción factual: lo que el sitio hace, sin superlativos
    ni ventajas inventadas.
  */
  descripcion:
    "Marketplace de recursos digitales. Plantillas y packs creados por diseñadores, listos para descargar y usar en tus proyectos.",
  idioma: "es_PE",
} as const;

/** URL absoluta a partir de una ruta interna. */
export function absoluta(ruta: string): string {
  if (!ruta.startsWith("/")) return `${urlBase()}/${ruta}`;

  return `${urlBase()}${ruta}`;
}

/**
 * Imagen para redes sociales.
 *
 * Devuelve null si no hay imagen real. NUNCA se inventa una
 * URL ni se usa una referencia del almacén privado: solo
 * entran URLs del almacén público, que son las que ya se
 * muestran en la web.
 */
export function imagenSocial(
  url: string | null | undefined
): string | null {
  if (!url) return null;

  const limpio = url.trim();

  if (!limpio) return null;

  /*
    El almacén privado guarda los archivos que se venden bajo
    `products/`. Esa referencia no puede acabar en una etiqueta
    og:image: no es una imagen y, sobre todo, no es pública.
  */
  if (limpio.includes("/products/")) return null;

  if (/^https?:\/\//.test(limpio)) return limpio;

  // Las rutas internas se vuelven absolutas.
  return limpio.startsWith("/") ? absoluta(limpio) : null;
}

/** Directiva para páginas que no deben indexarse. */
export const NO_INDEXAR: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};

/**
 * Metadata de una página pública indexable.
 *
 * `canonical` se pasa como ruta y Next la resuelve contra
 * `metadataBase`, definida en el layout raíz.
 */
export function paginaPublica({
  titulo,
  descripcion,
  ruta,
  imagen,
  tipo = "website",
}: {
  titulo: string;
  descripcion: string;
  ruta: string;
  imagen?: string | null;
  tipo?: "website" | "article" | "profile";
}): Metadata {
  const og = imagenSocial(imagen);

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      type: tipo,
      title: titulo,
      description: descripcion,
      url: absoluta(ruta),
      siteName: SITIO.nombre,
      locale: SITIO.idioma,
      ...(og ? { images: [{ url: og }] } : {}),
    },
    twitter: {
      // Sin imagen la tarjeta grande queda vacía; se degrada.
      card: og ? "summary_large_image" : "summary",
      title: titulo,
      description: descripcion,
      ...(og ? { images: [og] } : {}),
    },
  };
}

/** Metadata de una página que existe pero no debe indexarse. */
export function paginaPrivada(titulo: string): Metadata {
  return {
    title: titulo,
    robots: NO_INDEXAR,
  };
}

/**
 * Metadata de un recurso que no existe.
 *
 * Se usa cuando `generateMetadata` no encuentra el contenido:
 * la página devolverá 404, pero mientras tanto no debe
 * anunciar un título que parezca válido ni ser indexable.
 */
export function noEncontrado(que: string): Metadata {
  return {
    title: `${que} no encontrado`,
    robots: NO_INDEXAR,
  };
}

/* ══════════════ DATOS ESTRUCTURADOS ══════════════ */

/**
 * Mínimo de reseñas para publicar `aggregateRating`.
 *
 * Con una sola opinión, una media de 5 estrellas en los
 * resultados de búsqueda transmite una confianza que el dato
 * no respalda. Por debajo de este umbral el campo se omite
 * entero en lugar de publicarse con poco fundamento.
 */
export const MINIMO_RESENAS_SCHEMA = 3;

export type Miga = { nombre: string; ruta: string };

/**
 * BreadcrumbList a partir de las migas REALES de la página.
 *
 * Quien llama pasa los niveles que de verdad se ven; aquí no
 * se inventa jerarquía.
 */
export function migasSchema(migas: Miga[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migas.map((miga, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: miga.nombre,
      item: absoluta(miga.ruta),
    })),
  };
}
