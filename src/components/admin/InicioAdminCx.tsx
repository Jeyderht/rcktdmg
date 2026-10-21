import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import HeroAdminCx from "@/components/admin/HeroAdminCx";
import KpiCx from "@/components/cuenta/KpiCx";
import TarjetaCx from "@/components/cuenta/TarjetaCx";
import type { AdminStats, IngresoMes } from "@/lib/admin-stats";
import { portadasActivas } from "@/lib/portadas";
import { prisma } from "@/lib/prisma";

const soles = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(n);

const ventas = (n: number) => `${n} ${n === 1 ? "venta" : "ventas"}`;

function hace(fecha: Date) {
  const min = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

/** Ingresos brutos de los últimos 8 meses (serie real de ingresosPorMes). */
function serieBruta(ingresos: Record<string, IngresoMes>): number[] {
  const hoy = new Date();
  return Array.from({ length: 8 }, (_, k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 7 + k, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return ingresos[clave]?.[0] ?? 0;
  });
}

/**
 * Inicio de administración con imágenes (como la vista previa):
 * banner con los más vendidos, tarjetas KPI, recursos más vendidos,
 * top de creadores y cola de revisión. Usa las cifras que /admin ya
 * calcula (getAdminStats, ingresosPorMes) y lee, sin escribir nada,
 * las portadas de esos recursos, los avatares del top y la cola de
 * recursos pendientes. Debajo (children) va el panel de siempre.
 */
export default async function InicioAdminCx({
  stats,
  ingresos,
  children,
}: {
  stats: AdminStats;
  ingresos: Record<string, IngresoMes>;
  children: ReactNode;
}) {
  const top = stats.products.bestSellers.slice(0, 4);
  const topCreadores = stats.creators.byVolume.slice(0, 4);

  const [portadas, recursosTop, avatares, cola] = await Promise.all([
    portadasActivas(),
    top.length
      ? prisma.product.findMany({
          where: { id: { in: top.map((p) => p.id) } },
          select: {
            id: true,
            coverUrl: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
            creator: { select: { name: true, publicName: true } },
          },
        })
      : [],
    topCreadores.length
      ? prisma.user.findMany({
          where: { id: { in: topCreadores.map((c) => c.id) } },
          select: { id: true, avatarUrl: true, publicName: true },
        })
      : [],
    prisma.product.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { updatedAt: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        price: true,
        fileFormat: true,
        updatedAt: true,
        coverUrl: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        creator: { select: { name: true, publicName: true } },
      },
    }),
  ]);

  const slider = new Map(portadas.map((p) => [p.id, p.imageUrl]));
  const datos = new Map(recursosTop.map((r) => [r.id, r]));
  const avatar = new Map(avatares.map((a) => [a.id, a]));
  const creadorDe = (id: string) => {
    const c = datos.get(id)?.creator;
    return c ? c.publicName || c.name || "Creador" : null;
  };
  const portadaDe = (id: string) => {
    const r = datos.get(id);
    return r?.coverUrl || r?.images[0]?.url || null;
  };

  const serie = serieBruta(ingresos);
  const [mesPrevio, mesActual] = [serie[6], serie[7]];
  const variacion = mesPrevio > 0 ? Math.round(((mesActual - mesPrevio) / mesPrevio) * 100) : null;
  const { gross, platformFee } = stats.revenue;
  const pendientes = stats.products.pending;
  const retiros = stats.withdrawals.pendingCount;

  const diapositivas = top.flatMap((p) => {
    const imagen = slider.get(p.id) || portadaDe(p.id);
    return imagen
      ? [
          {
            id: p.id,
            imagen,
            titulo: p.name,
            href: `/tienda/${p.slug}`,
            detalle: [ventas(p.sales), soles(p.revenue), creadorDe(p.id)].filter(Boolean).join(" · "),
          },
        ]
      : [];
  });

  return (
    <div className="rk-cx">
      <HeroAdminCx diapositivas={diapositivas} pendientes={pendientes} />

      <div className="rk-cx-w">
        <div className="rk-cx-kp">
          <KpiCx
            rotulo="Ingresos brutos"
            valor={soles(gross)}
            chip={variacion === null ? undefined : `${variacion >= 0 ? "+" : ""}${variacion}%`}
            contexto={variacion === null ? "total cobrado" : "vs. mes anterior"}
            serie={serie}
          />
          <KpiCx
            rotulo="Comisión"
            valor={soles(platformFee)}
            chip={gross > 0 ? `${Math.round((platformFee / gross) * 100)}%` : undefined}
            contexto="de la plataforma"
          />
          <KpiCx rotulo="Por revisar" valor={String(pendientes)} contexto="recursos pendientes" />
          <KpiCx
            rotulo="Retiros pendientes"
            valor={soles(stats.withdrawals.pendingAmount)}
            chip={String(retiros)}
            contexto={retiros === 1 ? "solicitud" : "solicitudes"}
          />
        </div>

        {/* RECURSOS MÁS VENDIDOS */}
        {top.length > 0 && (
          <section className="rk-cx-sec" aria-labelledby="rk-cx-top">
            <div className="rk-cx-sh">
              <div>
                <h3 id="rk-cx-top">Recursos más vendidos</h3>
                <p>Top de la plataforma por ventas</p>
              </div>
            </div>
            <ul className="rk-cx-g4">
              {top.map((p, i) => (
                <li key={p.id}>
                  <TarjetaCx
                    href={`/tienda/${p.slug}`}
                    imagen={portadaDe(p.id)}
                    alt={p.name}
                    titulo={p.name}
                    meta={[creadorDe(p.id), ventas(p.sales)].filter(Boolean).join(" · ")}
                    pie={soles(p.revenue)}
                    esquina={<span className="rk-cx-rk">#{i + 1}</span>}
                    accion={
                      <Link href={`/admin/recursos/${p.id}`} className="rk-cx-badge rk-cx-badge-l">
                        Administrar
                      </Link>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* TOP CREADORES POR VOLUMEN */}
        {topCreadores.length > 0 && (
          <section className="rk-cx-sec" aria-labelledby="rk-cx-creadores">
            <div className="rk-cx-fol">
              <h3 id="rk-cx-creadores">Top creadores por volumen</h3>
              <ul className="rk-cx-av">
                {topCreadores.map((c, i) => {
                  const a = avatar.get(c.id);
                  const nombre = a?.publicName || c.name;
                  return (
                    <li key={c.id}>
                      <span className="rk-cx-a">
                        <span aria-hidden>
                          {a?.avatarUrl ? (
                            <Image src={a.avatarUrl} alt="" fill className="object-cover" sizes="64px" />
                          ) : (
                            nombre.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        {nombre}
                        <small>
                          #{i + 1} · {soles(c.revenue)}
                        </small>
                      </span>
                    </li>
                  );
                })}
                <li>
                  <Link href="/admin/usuarios?rol=CREATOR" className="rk-cx-a rk-cx-a-mas">
                    <span aria-hidden>→</span>
                    Ver todos
                    <small>creadores</small>
                  </Link>
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* COLA DE REVISIÓN */}
        <section className="rk-cx-sec" aria-labelledby="rk-cx-cola">
          <div className="rk-cx-sh">
            <div>
              <h3 id="rk-cx-cola">Cola de revisión</h3>
              <p>
                {pendientes} {pendientes === 1 ? "recurso espera" : "recursos esperan"} aprobación · más antiguos primero
              </p>
            </div>
            <Link href="/admin/recursos?estado=PENDING_REVIEW" className="rk-cx-sel">
              Ir a Revisiones
            </Link>
          </div>

          {cola.length === 0 ? (
            <p className="rk-cx-q-vacia">No hay recursos esperando revisión.</p>
          ) : (
            <div className="rk-cx-q" role="table" aria-label="Cola de revisión">
              <div className="rk-cx-qh" role="row">
                <span role="columnheader">
                  <span className="sr-only">Portada</span>
                </span>
                <span role="columnheader">Recurso</span>
                <span role="columnheader">Creador</span>
                <span role="columnheader">Actualizado</span>
                <span role="columnheader">Acciones</span>
              </div>
              {cola.map((r) => {
                const imagen = r.coverUrl || r.images[0]?.url;
                return (
                  <div key={r.id} className="rk-cx-qr" role="row">
                    <span className="rk-cx-qi" role="cell">
                      {imagen && <Image src={imagen} alt="" fill className="object-cover" sizes="64px" />}
                    </span>
                    <span role="cell">
                      <b>{r.name}</b>
                      <small>{[r.fileFormat?.toUpperCase(), soles(Number(r.price))].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span role="cell">{r.creator.publicName || r.creator.name || "Creador"}</span>
                    <span role="cell">{hace(r.updatedAt)}</span>
                    <span role="cell" className="rk-cx-qa">
                      <Link href={`/admin/recursos/${r.id}`} className="rk-cx-badge">
                        Revisar
                      </Link>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* PANEL DE ADMINISTRACIÓN: el de siempre */}
        <section className="rk-cx-sec" aria-labelledby="rk-cx-panel">
          <div className="rk-cx-sh">
            <div>
              <h3 id="rk-cx-panel">Panel de administración</h3>
              <p>Ingresos, pedidos, recursos y actividad</p>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
