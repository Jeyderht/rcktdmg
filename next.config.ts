import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /**
   * Las respuestas de la API no se indexan.
   *
   * robots.txt ya desaconseja rastrear /api, pero robots.txt
   * solo evita el rastreo: una URL enlazada desde fuera puede
   * acabar indexada igualmente. `X-Robots-Tag` viaja en la
   * respuesta y sí lo impide.
   *
   * Es una cabecera de indexación, no de seguridad: quien
   * protege estas rutas sigue siendo el middleware y la
   * comprobación de sesión de cada endpoint.
   */
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },

  // Oculta el indicador flotante de Dev Tools de Next.js.
  // Es la opción oficial en Next 15.5: el propio tipo indica
  // "To disable, set `devIndicators` to `false`".
  devIndicators: false,

  images: {
    /*
      Las imágenes públicas pasan a servirse desde el almacén
      "rcktdmg-media" de Vercel Blob, cuyo host tiene la forma:

        https://<id-del-store>.public.blob.vercel-storage.com

      El identificador del store lo asigna Vercel al crearlo,
      así que aquí se autoriza el subdominio con comodín en vez
      de escribir un host inventado. Cuando el store exista,
      puede fijarse el host exacto con BLOB_PUBLIC_HOSTNAME.

      Los archivos privados NO se sirven por aquí: se entregan
      desde /api/downloads/[id] tras comprobar la compra.
    */
    remotePatterns: [
      {
        protocol: "https",
        hostname:
          process.env.BLOB_PUBLIC_HOSTNAME ||
          "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
