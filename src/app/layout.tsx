import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

import {
  ThemeProvider,
  themeInitScript,
} from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RCKTDMG",
    template: "%s · RCKTDMG",
  },
  description: "Marketplace de recursos digitales",
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

      <body className={`${inter.variable} ${sora.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
