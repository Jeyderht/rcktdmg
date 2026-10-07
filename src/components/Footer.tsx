import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import Isotipo from "@/components/Isotipo";

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

/**
 * Medios de pago aceptados. Los logos van en un solo color, el del
 * texto de la web (máscaras de public/pagos/*-mono.svg; los
 * originales a color quedan en la misma carpeta).
 */
const PAGOS = [
  { nombre: "Visa", clase: "visa" },
  { nombre: "Yape", clase: "yape" },
  { nombre: "Plin", clase: "plin" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
      {/* Separador antes del pie: dos líneas con nodos y el isotipo al centro. */}
      <div aria-hidden className="rk-separador">
        <span className="rk-separador-linea" />
        <span className="rk-separador-centro">
          <Isotipo className="h-5 w-5" />
        </span>
        <span className="rk-separador-linea" />
      </div>

    <footer className="rk-footer">
      <div className="rk-footer-inner">

        {/* LLAMADA A CREADORES · tarjeta de marca con el cohete */}
        <div className="rk-footer-cta">
          <Image
            src="/marketing/cohete.svg"
            alt=""
            aria-hidden
            width={260}
            height={260}
            unoptimized
            className="rk-footer-cta-cohete"
          />

          <div className="rk-footer-cta-body">
            <p className="rk-footer-cta-kicker">Para creadores</p>

            <p className="rk-footer-cta-title">
              Publica tus recursos y vende en RCKTDMG
            </p>

            <div className="rk-footer-cta-actions">
              <Link href="/creadores/unete" className="rk-btn rk-btn-ink">
                Únete como creador
              </Link>
            </div>
          </div>
        </div>

        <div className="rk-footer-main">

          {/* MARCA */}
          <div className="rk-footer-brand">
            <Link href="/" aria-label="RCKTDMG" className="rk-footer-logo">
              <Isotipo className="h-7 w-7" />
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

        {/* MÉTODOS DE PAGO · logos en el color de la web */}
        <div className="rk-footer-pagos">
          <h2 className="rk-footer-title">Métodos de pago</h2>

          <ul className="rk-footer-pagos-lista" aria-label="Métodos de pago">
            {PAGOS.map((pago) => (
              <li key={pago.nombre} className={`rk-pago is-${pago.clase}`}>
                <span role="img" aria-label={pago.nombre} className="rk-pago-logo" />
              </li>
            ))}
          </ul>
        </div>

        <div className="rk-footer-bottom">
          <p>© {year} RCKTDMG. Todos los derechos reservados.</p>
        </div>

        {/* Créditos y volver arriba */}
        <div className="rk-footer-extra">
          <p className="rk-footer-by">
            Diseñado por
            <span className="rk-footer-by-marca">
              <Isotipo className="h-4 w-4" />
              Rckt Studio
            </span>
          </p>

          {/* href="#" sube al inicio; el scroll suave lo da el html. */}
          <a href="#" className="rk-footer-top">
            Volver arriba
            <span aria-hidden className="rk-footer-top-ico">
              <ArrowUp />
            </span>
          </a>
        </div>

        {/* Firma de marca: el logo en gris transparente sobre el degradado. */}
        <div aria-hidden className="rk-footer-marca">
          <span className="rk-footer-marca-logo" />
        </div>
      </div>
    </footer>
    </>
  );
}
