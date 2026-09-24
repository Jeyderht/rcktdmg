import type { $Enums } from "@prisma/client";

/**
 * Packs: parte compartida con el navegador.
 *
 * No toca la base de datos: lo importan el Creator Studio y la
 * página pública. Las funciones que leen o escriben están en
 * src/lib/packs.ts, que reexporta todo esto.
 */

export type EstadoPack = $Enums.PackStatus;

export const ESTADOS_PACK = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const satisfies readonly EstadoPack[];

type Olvidados = Exclude<EstadoPack, (typeof ESTADOS_PACK)[number]>;

const _sinOlvidos: Olvidados extends never ? true : never = true;

void _sinOlvidos;

export const ETIQUETA_ESTADO: Record<EstadoPack, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export function esEstadoPack(valor: unknown): valor is EstadoPack {
  return (
    typeof valor === "string" &&
    (ESTADOS_PACK as readonly string[]).includes(valor)
  );
}

export const LARGO_NOMBRE_PACK = 80;
export const LARGO_DESCRIPCION_PACK = 2000;

/** Mínimo de recursos para que un pack tenga sentido. */
export const MINIMO_RECURSOS_PACK = 2;
export const MAXIMO_RECURSOS_PACK = 50;

/**
 * Slug a partir del nombre.
 *
 * Mismo criterio que usan los recursos, para que las URLs de
 * /packs y /tienda se lean igual.
 */
export function slugificarPack(valor: string): string {
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
 * Ahorro de comprar el pack frente a comprar sus piezas.
 *
 * Devuelve null cuando no hay ahorro: si el pack cuesta lo
 * mismo o más que la suma, anunciar un descuento sería mentir.
 */
export function calcularAhorro(
  precioPack: number,
  sumaIndividual: number
): { importe: number; porcentaje: number } | null {
  if (
    !Number.isFinite(precioPack) ||
    !Number.isFinite(sumaIndividual) ||
    sumaIndividual <= precioPack
  ) {
    return null;
  }

  const importe = sumaIndividual - precioPack;

  return {
    importe,
    porcentaje: Math.round((importe / sumaIndividual) * 100),
  };
}

/** Pack tal y como viaja de la API al navegador. */
export type PackVista = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverUrl: string | null;
  price: number;
  status: EstadoPack;
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
};
