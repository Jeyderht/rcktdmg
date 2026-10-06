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
    <footer className="rk-footer">
      <div className="rk-footer-inner">

        {/* LLAMADA A CREADORES · franja de marca */}
        <div className="rk-footer-cta">
          <div>
            <p className="rk-footer-cta-kicker">Para creadores</p>
            <p className="rk-footer-cta-title">
              Publica tus recursos y vende en RCKTDMG
            </p>
          </div>

          <Link href="/creadores/unete" className="rk-btn rk-btn-ink">
            Únete como creador
          </Link>
        </div>

        <div className="rk-footer-main">

          {/* MARCA */}
          <div className="rk-footer-brand">
            <Link href="/" aria-label="RCKTDMG" className="rk-footer-logo">
              <Image
                src="/Isotipo.svg"
                alt=""
                width={240}
                height={240}
                /* Sin pasar por el optimizador: Next rechaza los SVG
                   salvo con dangerouslyAllowSVG. */
                unoptimized
              />
            </Link>

            <p className="rk-footer-text">
              Marketplace de recursos digitales. Compra, descarga
              y crea sin empezar desde cero.
            </p>
          </div>

          {/* NAVEGACIÓN */}
          <div className="rk-footer-nav">
            {SECTIONS.map((section) => (
              <nav key={section.title} aria-label={section.title}>
                <h2 className="rk-footer-title">{section.title}</h2>

                <ul className="rk-footer-links">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="rk-footer-bottom">
          <p>© {year} RCKTDMG. Todos los derechos reservados.</p>
          <p className="rk-footer-sign">Hecho para creadores.</p>
        </div>
      </div>
    </footer>
  );
}
