"use client";

import Link from "next/link";

import HeroCx, { type DiapositivaCx } from "@/components/cuenta/HeroCx";

/**
 * Banner del inicio de administración. Va aparte porque los botones
 * de HeroCx dependen de la portada visible (estado del cliente) y la
 * página del admin es de servidor: aquí solo llegan datos.
 */
export default function HeroAdminCx({
  diapositivas,
  pendientes,
}: {
  diapositivas: DiapositivaCx[];
  pendientes: number;
}) {
  return (
    <HeroCx
      rotulo="Más vendidos"
      diapositivas={diapositivas}
      tituloVacio="Todavía no hay ventas"
      detalleVacio="Cuando se venda un recurso aparecerá aquí."
      botones={(actual) => (
        <>
          {actual && (
            <Link href={actual.href} className="rk-btn rk-btn-primary">
              Ver recurso
            </Link>
          )}
          <Link href="/admin/recursos?estado=PENDING_REVIEW" className="rk-btn rk-btn-glass">
            Revisar pendientes ({pendientes})
          </Link>
        </>
      )}
    />
  );
}
