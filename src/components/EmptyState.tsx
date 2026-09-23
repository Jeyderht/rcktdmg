import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type EmptyStateAction = {
  href: string;
  label: string;
};

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** CTA real. Solo se pinta si el destino existe. */
  action?: EmptyStateAction | null;
  secondaryAction?: EmptyStateAction | null;
};

/**
 * Estado vacio compartido por las paginas de Mi cuenta.
 *
 * Es icono + texto + CTA real: sin ilustraciones externas y
 * sin datos de ejemplo. Asi todos los vacios de la cuenta se
 * ven igual y ninguno promete algo que no existe.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action = null,
  secondaryAction = null,
}: EmptyStateProps) {
  return (
    <div className="rk-fade-up rk-card px-6 py-14 text-center sm:py-16">
      <div
        aria-hidden
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-rk-md bg-ink/[0.06] text-ink"
      >
        <Icon size={26} />
      </div>

      <h2 className="rk-title mt-5 text-xl">{title}</h2>

      <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-ink/60">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
          {action && (
            <Link href={action.href} className="rk-btn rk-btn-primary">
              {action.label}
            </Link>
          )}

          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="rk-btn rk-btn-glass"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
