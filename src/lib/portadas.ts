import { prisma } from "@/lib/prisma";

/**
 * Slider de portadas del inicio.
 *
 * No hay tabla aparte: cada recurso puede tener su portada
 * horizontal (Product.sliderUrl), que sube su creador. El slider
 * muestra los recursos PUBLICADOS que la tienen, los más
 * recientes primero.
 *
 * Como el recurso pasa por revisión antes de publicarse, su
 * portada del slider también.
 */

export const MAX_PORTADAS_HOME = 8;

/** Proporción aceptada: entre 16:10 (1,6) y 2:1 (2,0). 16:9 = 1,78. */
export const PROPORCION_MIN_SLIDER = 1.6;
export const PROPORCION_MAX_SLIDER = 2.0;
export const ANCHO_MIN_SLIDER = 1280;

export type PortadaHome = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  href: string;
  ctaLabel: string;
  categoria: string | null;
  precio: string | null;
};

/**
 * Comprueba que la imagen sirve para el slider: horizontal,
 * cerca de 16:9 y con ancho suficiente para verse nítida.
 * Devuelve el problema en texto, o null si está bien.
 */
export function revisarMedidasSlider(
  medidas: { width: number; height: number } | null
): string | null {
  if (!medidas) {
    return "No se pudo leer el tamaño de la imagen. Prueba con otro archivo JPG, PNG o WEBP.";
  }

  const { width, height } = medidas;
  const proporcion = width / height;

  if (proporcion < PROPORCION_MIN_SLIDER || proporcion > PROPORCION_MAX_SLIDER) {
    return `Debe ser horizontal, 16:9 (por ejemplo 1600 × 900). La tuya mide ${width} × ${height}.`;
  }

  if (width < ANCHO_MIN_SLIDER) {
    return `Debe medir al menos ${ANCHO_MIN_SLIDER} px de ancho. La tuya mide ${width} × ${height}.`;
  }

  return null;
}

export async function portadasActivas(): Promise<PortadaHome[]> {
  const recursos = await prisma.product.findMany({
    where: { status: "PUBLISHED", sliderUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    take: MAX_PORTADAS_HOME,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      sliderUrl: true,
      category: { select: { name: true } },
    },
  });

  return recursos.map((r) => ({
    id: r.id,
    imageUrl: r.sliderUrl as string,
    title: r.name,
    subtitle: null,
    href: `/tienda/${r.slug}`,
    ctaLabel: "Ver recurso",
    categoria: r.category?.name ?? null,
    precio: Number(r.price).toFixed(2),
  }));
}
