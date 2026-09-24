import type { $Enums } from "@prisma/client";

/**
 * Colecciones comerciales: parte compartida con el navegador.
 *
 * No toca la base de datos: lo importan el Creator Studio y la
 * página pública. Lo que lee o escribe está en
 * src/lib/colecciones-comerciales.ts, que reexporta todo esto.
 *
 * NO confundir con `Collection`, la lista personal que
 * cualquiera guarda para sí. Esto es un artículo del catálogo.
 */

export type EstadoColeccion = $Enums.CommercialCollectionStatus;

export const ESTADOS_COLECCION = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly EstadoColeccion[];

type Olvidados = Exclude<
  EstadoColeccion,
  (typeof ESTADOS_COLECCION)[number]
>;

const _sinOlvidos: Olvidados extends never ? true : never = true;

void _sinOlvidos;

export const ETIQUETA_ESTADO_COLECCION: Record<EstadoColeccion, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
};

export function esEstadoColeccion(
  valor: unknown
): valor is EstadoColeccion {
  return (
    typeof valor === "string" &&
    (ESTADOS_COLECCION as readonly string[]).includes(valor)
  );
}

export const LARGO_NOMBRE_COLECCION = 80;
export const LARGO_DESCRIPCION_COLECCION = 2000;

/**
 * Mínimo de recursos para PUBLICAR una colección.
 *
 * Es la diferencia de fondo con un pack. Una colección se
 * vende como un cuerpo de trabajo —seis piezas de una misma
 * temática—, no como dos recursos agrupados. Por debajo de
 * este número se puede seguir guardando el borrador, pero no
 * ponerla a la venta.
 */
export const MINIMO_RECURSOS_COLECCION = 6;
export const MAXIMO_RECURSOS_COLECCION = 60;

/** Slug a partir del nombre. Mismo criterio que packs y recursos. */
export function slugificarColeccion(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Ahorro de comprar la colección frente a comprar sus piezas.
 *
 * Devuelve null cuando no hay ahorro: anunciar un descuento
 * que no existe sería publicidad engañosa.
 */
export function calcularAhorroColeccion(
  precioColeccion: number,
  sumaIndividual: number
): { importe: number; porcentaje: number } | null {
  if (
    !Number.isFinite(precioColeccion) ||
    !Number.isFinite(sumaIndividual) ||
    sumaIndividual <= precioColeccion
  ) {
    return null;
  }

  const importe = sumaIndividual - precioColeccion;

  return {
    importe,
    porcentaje: Math.round((importe / sumaIndividual) * 100),
  };
}

/** Colección tal y como viaja de la API al navegador. */
export type ColeccionVista = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverUrl: string | null;
  price: number;
  status: EstadoColeccion;
  createdAt: string;
  creador: {
    nombre: string;
    username: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  productos: {
    id: string;
    name: string;
    slug: string;
    price: number;
    coverUrl: string | null;
    image: { url: string; alt: string | null } | null;
    category: { name: string; slug: string } | null;
  }[];
  /** Suma de los precios individuales. Referencia, no cobro. */
  sumaIndividual: number;
  ahorro: { importe: number; porcentaje: number } | null;
  /** Cuántos recursos faltan para poder publicarla. 0 si ya se puede. */
  faltanParaPublicar: number;
};
