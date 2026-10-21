"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import HeroCx from "@/components/cuenta/HeroCx";
import KpiCx from "@/components/cuenta/KpiCx";
import TarjetaCx from "@/components/cuenta/TarjetaCx";
import { solesMoneda } from "@/lib/formato";

type RecursoReciente = {
  id: string;
  name: string;
  slug: string;
  status: string;
  price: number;
  coverUrl: string | null;
  createdAt: string;
};

type MasVendido = {
  productId: string;
  productName: string;
  productSlug: string;
  sales: number;
  revenue: number;
};

/* Estado del recurso: rótulo y tono de la insignia (rk-cx-st). */
const ESTADO: Record<string, [string, string]> = {
  PUBLISHED: ["Publicado", "rk-cx-st-ok"],
  PENDING_REVIEW: ["En revisión", "rk-cx-st-w"],
  DRAFT: ["Borrador", ""],
  REJECTED: ["Rechazado", ""],
  ARCHIVED: ["Archivado", ""],
};

const ventas = (n: number) => `${n} ${n === 1 ? "venta" : "ventas"}`;

function hace(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

const editar = (id: string) => `/creadores/productos/${id}/editar`;

/**
 * Inicio del Creator Studio con imágenes (como la vista previa):
 * banner con sus últimos recursos, tarjetas KPI, últimos recursos
 * creados y sus más vendidos. Usa los datos que el panel ya carga
 * (/api/creadores/dashboard) y lee el saldo disponible del mismo
 * endpoint que la página de retiros. Debajo (children), el panel de
 * siempre.
 */
export default function InicioCreadorCx({
  nombre,
  stats,
  ventasPorMes,
  recientes,
  masVendidos,
  children,
}: {
  nombre: string;
  stats: { sales: number; followers: number; pendingResources: number };
  ventasPorMes: { month: string; sales: number }[];
  recientes: RecursoReciente[];
  masVendidos: MasVendido[];
  children: ReactNode;
}) {
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/creadores/retiros", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d?.summary) setSaldo(Number(d.summary.availableBalance) || 0);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const ultimos = recientes.slice(0, 4);
  const portada = new Map(recientes.map((p) => [p.id, p.coverUrl]));
  const top = masVendidos.slice(0, 4);

  const hoy = new Date();
  const claveMes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const esteMes = ventasPorMes.find((m) => m.month === claveMes)?.sales ?? 0;
  const serie = ventasPorMes.map((m) => m.sales);

  const diapositivas = ultimos.flatMap((p) =>
    p.coverUrl
      ? [
          {
            id: p.id,
            imagen: p.coverUrl,
            titulo: p.name,
            href: editar(p.id),
            detalle: [nombre, ESTADO[p.status]?.[0] ?? p.status, hace(p.createdAt)].join(" · "),
          },
        ]
      : []
  );

  return (
    <div className="rk-cx">
      <HeroCx
        rotulo="Tu último recurso creado"
        diapositivas={diapositivas}
        tituloVacio="Crea tu primer recurso"
        detalleVacio="Sube tu primer recurso y aparecerá aquí."
        botones={(actual) => (
          <>
            {actual && (
              <Link href={actual.href} className="rk-btn rk-btn-primary">
                Editar recurso
              </Link>
            )}
            <Link
              href="/creadores/panel/nuevo"
              className={actual ? "rk-btn rk-btn-glass" : "rk-btn rk-btn-primary"}
            >
              {actual ? "Nuevo recurso" : "Crear mi primer recurso"}
            </Link>
          </>
        )}
      />

      <div className="rk-cx-w">
        <div className="rk-cx-kp">
          <KpiCx
            rotulo="Para retirar"
            valor={saldo === null ? "—" : solesMoneda(saldo)}
            contexto="saldo disponible"
          />
          <KpiCx
            rotulo="Ventas"
            valor={String(stats.sales)}
            chip={`+${esteMes}`}
            contexto="este mes"
            serie={serie}
          />
          <KpiCx rotulo="Seguidores" valor={String(stats.followers)} contexto="te siguen" />
          <KpiCx rotulo="En revisión" valor={String(stats.pendingResources)} contexto="esperan aprobación" />
        </div>

        {/* ÚLTIMOS RECURSOS CREADOS */}
        {ultimos.length > 0 && (
          <section className="rk-cx-sec" aria-labelledby="rk-cx-ultimos">
            <div className="rk-cx-sh">
              <div>
                <h3 id="rk-cx-ultimos">Últimos recursos creados</h3>
                <p>Ordenados por fecha de creación</p>
              </div>
              <Link href="/creadores/panel/recursos" className="rk-cx-sel">
                Ver todos mis recursos
              </Link>
            </div>
            <ul className="rk-cx-g4">
              {ultimos.map((p) => {
                const [rotulo, tono] = ESTADO[p.status] ?? [p.status, ""];
                return (
                  <li key={p.id}>
                    <TarjetaCx
                      href={p.status === "PUBLISHED" ? `/tienda/${p.slug}` : editar(p.id)}
                      imagen={p.coverUrl}
                      alt={p.name}
                      titulo={p.name}
                      meta={hace(p.createdAt)}
                      pie={solesMoneda(p.price)}
                      esquina={<span className={`rk-cx-st ${tono}`.trim()}>{rotulo}</span>}
                      accion={
                        <Link href={editar(p.id)} className="rk-cx-badge rk-cx-badge-l">
                          Editar
                        </Link>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* TUS MÁS VENDIDOS */}
        {top.length > 0 && (
          <section className="rk-cx-sec" aria-labelledby="rk-cx-vendidos">
            <div className="rk-cx-sh">
              <div>
                <h3 id="rk-cx-vendidos">Tus más vendidos</h3>
                <p>Ranking por ventas</p>
              </div>
            </div>
            <ul className="rk-cx-g4">
              {top.map((p, i) => (
                <li key={p.productId}>
                  <TarjetaCx
                    href={`/tienda/${p.productSlug}`}
                    imagen={portada.get(p.productId) ?? null}
                    alt={p.productName}
                    titulo={p.productName}
                    meta={ventas(p.sales)}
                    pie={solesMoneda(p.revenue)}
                    esquina={<span className="rk-cx-rk">#{i + 1}</span>}
                    accion={
                      <Link href={`/tienda/${p.productSlug}`} className="rk-cx-badge rk-cx-badge-l">
                        Ver ficha
                      </Link>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* GANANCIAS Y ACTIVIDAD: el panel de siempre */}
        <section className="rk-cx-sec" aria-labelledby="rk-cx-ganancias">
          <div className="rk-cx-sh">
            <div>
              <h3 id="rk-cx-ganancias">Ganancias y actividad</h3>
              <p>Resumen financiero y de actividad</p>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
