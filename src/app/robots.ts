import type { MetadataRoute } from "next";

import { absoluta, urlBase } from "@/lib/seo";

/**
 * robots.txt
 *
 * CRITERIO
 *
 * Solo se bloquea aquí lo que un buscador no debería llegar a
 * pedir: las zonas privadas, que además exigen sesión, y la
 * API.
 *
 * Las páginas públicas que no queremos indexar —carrito,
 * login, registro, colecciones compartidas— NO se bloquean:
 * llevan `noindex` en su metadata, y para que un buscador lea
 * ese `noindex` primero tiene que poder rastrear la página.
 * Bloquearlas aquí conseguiría lo contrario de lo que se
 * busca.
 *
 * robots.txt tampoco es un mecanismo de autorización: lo que
 * protege de verdad esas rutas es el middleware.
 */
export default function robots(): MetadataRoute.Robots {
  const base = urlBase();

  const esLocal = base.includes("localhost");

  /*
    En local se desaconseja todo el rastreo: un entorno de
    desarrollo no tiene por qué aparecer en ningún índice si
    alguna vez queda expuesto.
  */
  if (esLocal) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Zonas privadas: exigen sesión y no tienen valor público.
          "/admin",
          "/mi-cuenta",
          "/creadores/panel",
          "/creadores/productos",
          "/checkout",
          "/notificaciones",
          // Endpoints, no páginas.
          "/api/",
        ],
      },
    ],
    sitemap: absoluta("/sitemap.xml"),
    host: base,
  };
}
