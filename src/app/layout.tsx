import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

import {
  ThemeProvider,
  themeInitScript,
} from "@/components/ThemeProvider";
import RevelarAlEntrar from "@/components/RevelarAlEntrar";
import { SITIO, absoluta, urlBase } from "@/lib/seo";

/*
  Sora, y solo Sora.

  La referencia acaba imponiéndola en toda la interfaz —títulos
  y cuerpo— en su última capa de estilos. Mantener dos familias
  obligaba a decidir en cada componente cuál tocaba, y esa
  decisión se equivocaba sola con el tiempo.

  Tres pesos: 400 para el cuerpo, 500 para controles y 600 para
  los títulos. Ni uno más; cada peso es una descarga.
*/
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sora",
  display: "swap",
});

/**
 * Metadata global.
 *
 * "metadataBase" es la pieza que hace que todo lo demás
 * funcione: con ella, cada página puede declarar su canónica y
 * sus imágenes sociales como rutas relativas y Next las
 * convierte en absolutas. Sin ella, Open Graph queda con URLs
 * relativas que ninguna red social sabe resolver.
 */
export const metadata: Metadata = {
  metadataBase: new URL(urlBase()),

  title: {
    default: SITIO.nombre,
    template: "%s · RCKTDMG",
  },

  description: SITIO.descripcion,

  applicationName: SITIO.nombre,

  /*
    Aquí NO se declara ninguna canónica.

    La metadata se hereda hacia abajo, así que una canónica en
    el layout raíz acabaría en todas las páginas que no
    declaran la suya —el 404, el carrito, el login, la cuenta—
    diciendo que su contenido es en realidad la portada. Cada
    página pública declara la suya con `paginaPublica`; la que
    no la declara es porque no debe tenerla.
  */

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    siteName: SITIO.nombre,
    title: SITIO.nombre,
    description: SITIO.descripcion,
    url: absoluta("/"),
    locale: SITIO.idioma,
  },

  twitter: {
    /*
      "summary" y no "summary_large_image": el sitio todavía
      no tiene una imagen social por defecto, y pedir la
      tarjeta grande sin imagen la deja vacía.
    */
    card: "summary",
    title: SITIO.nombre,
    description: SITIO.descripcion,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Necesario para que env(safe-area-inset-*) funcione
  // en la navegación inferior de iPhone.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/*
          Aplica el tema guardado antes del primer pintado
          para evitar el parpadeo claro → oscuro.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>

      <body className={`${sora.variable} antialiased`}>
        <ThemeProvider>
          {children}

          {/*
            Va después del contenido a propósito: cuando su
            efecto se ejecuta, las secciones ya están en el DOM
            y puede medir cuáles quedan por debajo del pliegue.
          */}
          <RevelarAlEntrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
