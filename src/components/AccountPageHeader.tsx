import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type AccountPageHeaderProps = {
  title: string;
  subtitle: string;
  /** Migas mínimas: volver al punto anterior real. */
  backHref?: string;
  backLabel?: string;
  /** Acciones opcionales, alineadas a la derecha en desktop. */
  children?: React.ReactNode;
};

/**
 * Encabezado común de las páginas de Mi cuenta.
 *
 * Evita repetir el mismo bloque en compras, descargas,
 * favoritos y colecciones, y mantiene una jerarquía idéntica
 * en todas: volver → eyebrow → título → subtítulo.
 *
 * El enlace de volver sustituye a los botones grandes que
 * antes duplicaban destinos que ya ofrecen la navegación
 * superior y el dock inferior.
 */
export default function AccountPageHeader({
  title,
  subtitle,
  backHref = "/mi-cuenta",
  backLabel = "Mi cuenta",
  children,
}: AccountPageHeaderProps) {
  return (
    <header className="rk-fade-up">
      <Link
        href={backHref}
        className="rk-press-sm -ml-1 inline-flex items-center gap-1 rounded-full py-1 pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-accent"
      >
        <ChevronLeft size={15} />
        {backLabel}
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
        <div className="min-w-0">
          <h1 className="rk-title text-[1.75rem] sm:text-4xl">
            {title}
          </h1>

          <p className="mt-2.5 max-w-xl text-[15px] leading-7 text-ink/60">
            {subtitle}
          </p>
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-2.5">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
