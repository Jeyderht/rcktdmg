import Image from "next/image";
import Link from "next/link";

/**
 * Pie de página de RCKTDMG.
 *
 * Todos los enlaces apuntan a rutas que existen realmente en
 * src/app. No se incluyen redes sociales porque la marca no
 * las tiene configuradas en ningún sitio del proyecto: no se
 * inventan perfiles.
 */
const SECTIONS: {
  title: string;
  links: { href: string; label: string }[];
}[] = [
  {
    title: "Explorar",
    links: [
      { href: "/tienda", label: "Recursos" },
      { href: "/categorias", label: "Categorías" },
      { href: "/creadores", label: "Creadores" },
      { href: "/planes", label: "Planes" },
    ],
  },
  {
    title: "Tu cuenta",
    links: [
      { href: "/mi-cuenta", label: "Mi cuenta" },
      { href: "/mi-cuenta/compras", label: "Mis compras" },
      { href: "/mi-cuenta/descargas", label: "Mis descargas" },
      { href: "/mi-cuenta/favoritos", label: "Favoritos" },
      { href: "/mi-cuenta/colecciones", label: "Colecciones" },
    ],
  },
  {
    title: "Empezar",
    links: [
      { href: "/registro", label: "Crear cuenta" },
      { href: "/login", label: "Iniciar sesión" },
      { href: "/carrito", label: "Carrito" },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="rk-onyx mt-16">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-5 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">

          {/* MARCA */}
          <div>
            <Link
              href="/"
              aria-label="RCKTDMG"
              className="rk-press-sm inline-flex items-center"
            >
              <span className="flex h-9 w-9 items-center justify-center">
                <Image
                  src="/Isotipo.svg"
                  alt=""
                  width={240}
                  height={240}
                  /* Sin deformar, y sin pasar por el optimizador:
                     Next rechaza los SVG salvo con dangerouslyAllowSVG. */
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-ink/60">
              Marketplace de recursos digitales. Compra, descarga
              y crea sin empezar desde cero.
            </p>
          </div>

          {/* NAVEGACIÓN */}
          <div className="grid gap-8 sm:grid-cols-3">
            {SECTIONS.map((section) => (
              <nav key={section.title} aria-label={section.title}>
                <h2 className="rk-kicker">{section.title}</h2>

                <ul className="mt-4 space-y-0.5">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center rounded-full px-1 text-sm text-ink/60 transition-colors duration-fast hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="rk-divider mt-12" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/60">
            © {year} RCKTDMG. Todos los derechos reservados.
          </p>

          <p className="text-xs text-ink/60">
            Hecho para creadores.
          </p>
        </div>
      </div>
    </footer>
  );
}
