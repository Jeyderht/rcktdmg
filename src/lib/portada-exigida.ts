import { prisma } from "@/lib/prisma";
import { dimensionesDesdeUrl } from "@/lib/dimensiones";
import {
  medidaExigidaPara,
  revisarMedidas,
} from "@/lib/tipos-publicacion";

/**
 * ¿Puede este recurso pasar de borrador?
 *
 * La comprobación vive aquí, y no dentro de un endpoint,
 * porque la usan dos puertas distintas —enviar a revisión y
 * publicar— y porque las medidas que exige cada categoría ya
 * las decide `medidaExigidaPara`. Repetir la regla en cada
 * ruta es como acaban separándose.
 *
 * Qué comprueba y qué NO:
 *
 *   · Solo mira categorías con medida obligatoria. Social
 *     Media y Plantillas no la tienen, así que pasan sin
 *     revisar nada: imponerles un formato sería inventar una
 *     regla que el proyecto no tiene.
 *
 *   · Las medidas guardadas mandan, y solo se lee la imagen
 *     cuando faltan. Los recursos anteriores a que se
 *     guardaran las tienen nulas; para ellos se lee la
 *     cabecera del archivo, que es el dato real, en vez de
 *     dejarlos pasar por no saber.
 *
 *   · NUNCA recorta, redimensiona ni sustituye la imagen. Si
 *     no cumple, se dice y se para. Convertir a la fuerza una
 *     portada horizontal en vertical sería inventar contenido
 *     que el creador no subió.
 *
 * Devuelve el mensaje de error, o null si puede continuar.
 */
export async function revisarPortadaDelRecurso(
  productId: string
): Promise<string | null> {
  const producto = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      coverUrl: true,
      coverWidth: true,
      coverHeight: true,
      pieceType: true,
      category: { select: { slug: true, name: true } },
    },
  });

  if (!producto) return "No se encontró el recurso.";

  const exigida = medidaExigidaPara(
    producto.category?.slug,
    producto.pieceType
  );

  /* Categoría de formato libre: no hay nada que exigir. */
  if (!exigida) return null;

  const nombreCategoria = producto.category?.name ?? "esta categoría";

  if (!producto.coverUrl) {
    return `Los recursos de ${nombreCategoria} necesitan una portada de ${exigida.ancho} × ${exigida.alto} px (${exigida.proporcion}). Sube una antes de continuar.`;
  }

  /*
    Se prefiere lo guardado al subir. Si falta —recursos
    antiguos—, se lee la cabecera del archivo real.
  */
  let reales =
    producto.coverWidth && producto.coverHeight
      ? { ancho: producto.coverWidth, alto: producto.coverHeight }
      : null;

  if (!reales) {
    const leidas = await dimensionesDesdeUrl(producto.coverUrl);

    if (leidas) {
      reales = { ancho: leidas.width, alto: leidas.height };
    }
  }

  const problema = revisarMedidas(exigida, reales);

  if (!problema) return null;

  return `Formato incorrecto para ${nombreCategoria}. ${problema}`;
}
