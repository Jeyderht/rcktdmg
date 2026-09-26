import { permanentRedirect } from "next/navigation";

/**
 * La página vive ahora en /creadores/unete.
 *
 * Esta ruta se conserva porque está en el sitemap, en avisos
 * ya enviados y probablemente en enlaces compartidos. Redirige
 * de forma permanente en vez de devolver un 404: romper una
 * dirección que ya circula no le arregla nada a nadie.
 */
export default function ConvierteteEnCreadorPage() {
  permanentRedirect("/creadores/unete");
}
