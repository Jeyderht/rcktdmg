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
 * Estado vacio compartido (Mi cuenta, notificaciones, admin…).
 *
 * Icono en vidrio con lengüeta + texto + CTA real. Estilos en
 * globals.css, seccion U (rk-empty).
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action = null,
  secondaryAction = null,
}: EmptyStateProps) {
  return (
    <div className="rk-fade-up rk-empty">
      <span aria-hidden className="rk-empty-icon">
        <Icon />
      </span>

      <h2 className="rk-empty-title">{title}</h2>

      <p className="rk-empty-text">{description}</p>

      {(action || secondaryAction) && (
        <div className="rk-empty-actions">
          {action && (
            <Link href={action.href} className="rk-btn rk-btn-primary">
              {action.label}
            </Link>
          )}

          {secondaryAction && (
            <Link href={secondaryAction.href} className="rk-btn rk-btn-line">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
