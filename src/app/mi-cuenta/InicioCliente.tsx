"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import AnilloAdmin from "@/components/admin/AnilloAdmin";
import ListaAdmin from "@/components/admin/ListaAdmin";
import BienvenidaCuenta from "@/components/cuenta/BienvenidaCuenta";
import HeroCx, { type DiapositivaCx } from "@/components/cuenta/HeroCx";
import KpiCx from "@/components/cuenta/KpiCx";
import QuickAccess from "@/components/cuenta/QuickAccess";
import RecomendadosCliente from "@/components/cuenta/RecomendadosCliente";
import TarjetaCx from "@/components/cuenta/TarjetaCx";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { useSessionUser } from "@/components/hooks/useSessionUser";
import FilasCategoriaCx from "@/components/cuenta/FilasCategoriaCx";
import { medidaCx } from "@/components/cuenta/medidaCx";
import { fechaMedia, solesMoneda } from "@/lib/formato";
import type { TipoPieza } from "@/lib/tipos-publicacion";

type Download = {
  id: string;
  downloadCount: number;
  status: string;
  product: {
    id: string;
    name: string;
    slug: string;
    coverUrl: string | null;
    /* Ya llegan de /api/downloads: deciden marco y etiqueta. */
    pieceType?: TipoPieza | null;
    category?: { slug: string } | null;
  };
  order: { id: string; createdAt: string; status: string };
};

/** Marco de la miniatura de una categoría: su medida o, si es libre, 4:5. */
const marcoCategoria = (slug: string) => medidaCx({ slug }).proporcion ?? "4 / 5";

/** «9 oct»: fecha corta del pie de las tarjetas pequeñas. */
const fechaCorta = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(new Date(iso)).replace(".", "");

type Order = {
  id: string;
  total: number | string;
  status: string;
  createdAt: string;
  items: { id: string; product: { id: string; name: string; slug: string; coverUrl: string | null } }[];
};

type Seguido = {
  desde: string;
  creador: { id: string; username: string | null; name: string | null; publicName: string | null; avatarUrl: string | null };
};

export type CategoriaCx = {
  slug: string;
  nombre: string;
  recursos: number;
  imagen: string | null;
};

/** Pedidos pagados por mes en los últimos 8 meses (serie real). */
function seriePorMes(orders: Order[], valor: (o: Order) => number): number[] {
  const hoy = new Date();
  const meses = Array.from({ length: 8 }, (_, k) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - 7 + k, 1);
    return `${d.getFullYear()}-${d.getMonth()}`;
  });
  const suma = new Map(meses.map((m) => [m, 0]));
  for (const o of orders) {
    const d = new Date(o.createdAt);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (suma.has(k)) suma.set(k, (suma.get(k) ?? 0) + valor(o));
  }
  return meses.map((m) => suma.get(m) ?? 0);
}

/**
 * Inicio del cliente (/mi-cuenta, solo rol CLIENT): banner con las
 * portadas del slider del Inicio, cifras, sus recursos, creadores que
 * sigue, categorías, recomendados y una franja final. Los datos se
 * cargan como antes (/api/downloads, /api/mis-compras,
 * /api/recomendaciones) más la lista que ya usa /mi-cuenta/siguiendo
 * (/api/seguidores). Un bloque sin datos reales no se pinta.
 */
export default function InicioCliente({
  portadas,
  categorias,
}: {
  portadas: DiapositivaCx[];
  categorias: CategoriaCx[];
}) {
  const { user } = useSessionUser();

  const [downloads, setDownloads] = useState<Download[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [seguidos, setSeguidos] = useState<Seguido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        setError("");

        const [downloadsResponse, ordersResponse] = await Promise.all([
          fetch("/api/downloads", { cache: "no-store" }),
          fetch("/api/mis-compras", { cache: "no-store" }),
        ]);

        const downloadsData = await downloadsResponse.json();
        const ordersData = await ordersResponse.json();

        if (!downloadsResponse.ok) {
          throw new Error(downloadsData.error || "No se pudieron cargar tus descargas.");
        }

        if (!ordersResponse.ok) {
          throw new Error(ordersData.error || "No se pudieron cargar tus compras.");
        }

        setDownloads(downloadsData.downloads || []);
        setOrders(ordersData.orders || []);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "No se pudo cargar tu cuenta.");
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, []);

  // Creadores que sigue: la misma lista de /mi-cuenta/siguiendo.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch("/api/seguidores", { cache: "no-store" });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (!cancelado) setSeguidos(datos.siguiendo ?? []);
      } catch {
        /* Sin la lista, el bloque no se pinta. */
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const paidOrders = orders.filter((order) => order.status === "PAID");
  const activeDownloads = downloads.filter(
    (download) => download.status === "ACTIVE" && download.order.status === "PAID"
  );
  const totalGastado = paidOrders.reduce((suma, order) => suma + Number(order.total), 0);
  const totalDescargas = activeDownloads.reduce((suma, d) => suma + d.downloadCount, 0);

  const contar = (estado: string) => orders.filter((order) => order.status === estado).length;
  const pedidos = [
    { label: "Pagados", valor: contar("PAID") },
    { label: "Pendientes", valor: contar("PENDING") },
    { label: "Cancelados", valor: contar("CANCELED") },
    { label: "Reembolsados", valor: contar("REFUNDED") },
  ];

  const displayName = user?.publicName || user?.name || "";
  const cifra = (n: number) => (loading ? "—" : String(n));
  // Toda la biblioteca, más recientes primero; se agrupa por categoría.
  const recientes = [...activeDownloads].sort(
    (a, b) => +new Date(b.order.createdAt) - +new Date(a.order.createdAt)
  );
  const [destacada, ...otrasCategorias] = categorias;

  return (
    <div className="rk-cx">
      <HeroCx
        rotulo="Nuevo en RcktX"
        diapositivas={portadas}
        tituloVacio="Encuentra tu próximo recurso"
        detalleVacio="Plantillas y flyers listos para usar."
        botones={(actual) =>
          actual ? (
            <>
              <Link href={actual.href} className="rk-btn rk-btn-primary">
                Ver recurso
              </Link>
              <Link href="/tienda" className="rk-btn rk-btn-glass">
                Seguir comprando
              </Link>
            </>
          ) : (
            <Link href="/tienda" target="_blank" rel="noopener noreferrer" className="rk-btn rk-btn-primary">
              Explorar la tienda
            </Link>
          )
        }
      />

      <div className="rk-cx-w">
        <div className="rk-cx-kp">
          <KpiCx
            rotulo="Compras"
            valor={cifra(paidOrders.length)}
            contexto="pedidos pagados"
            serie={loading ? null : seriePorMes(paidOrders, () => 1)}
          />
          <KpiCx rotulo="Descargas" valor={cifra(totalDescargas)} contexto="realizadas" />
          <KpiCx
            rotulo="Invertido"
            valor={loading ? "—" : solesMoneda(totalGastado)}
            contexto="total en recursos"
            serie={loading ? null : seriePorMes(paidOrders, (o) => Number(o.total))}
          />
          <KpiCx rotulo="Recursos" valor={cifra(activeDownloads.length)} contexto="en tu biblioteca" />
        </div>

        {/* La bienvenida, solo justo después de registrarse. */}
        <BienvenidaCuenta nombre={displayName} />

        {error && (
          <div role="alert" className="rk-upload-error rk-fade">
            {error}
          </div>
        )}

        {/* TUS RECURSOS */}
        {recientes.length > 0 && (
          <section className="rk-cx-sec" aria-labelledby="rk-cx-tus-recursos">
            <div className="rk-cx-sh">
              <div>
                <h3 id="rk-cx-tus-recursos">Tus recursos</h3>
                <p>Lo que ya adquiriste, listo para descargar</p>
              </div>
            </div>

            <FilasCategoriaCx
              elementos={recientes.map((d) => {
                const categoria = { slug: d.product.category?.slug ?? null, pieza: d.product.pieceType ?? null };
                return {
                  id: d.id,
                  categoria,
                  tarjeta: (
                    <TarjetaCx
                      href={`/tienda/${d.product.slug}`}
                      imagen={d.product.coverUrl}
                      alt={d.product.name}
                      titulo={d.product.name}
                      categoria={categoria}
                      pie={<time dateTime={d.order.createdAt}>{fechaCorta(d.order.createdAt)}</time>}
                      accion={
                        <Link
                          href="/mi-cuenta/descargas"
                          className="rk-cx-badge"
                          aria-label={`Descargar ${d.product.name}`}
                        >
                          Descargar
                        </Link>
                      }
                    />
                  ),
                };
              })}
            />
          </section>
        )}

        {/* CREADORES QUE SIGUES */}
        {seguidos.length > 0 && (
          <section className="rk-cx-sec rk-cx-fol" aria-labelledby="rk-cx-sigues">
            <h3 id="rk-cx-sigues">Creadores que sigues</h3>

            <ul className="rk-cx-av">
              <li>
                <Link href="/creadores" className="rk-cx-a rk-cx-a-mas">
                  <span aria-hidden>
                    <Plus size={22} />
                  </span>
                  Descubrir
                  <small>creadores</small>
                </Link>
              </li>

              {seguidos.map(({ creador, desde }) => {
                const nombre = creador.publicName || creador.name || (creador.username ? `@${creador.username}` : "Creador");
                const contenido = (
                  <>
                    <span aria-hidden>
                      {creador.avatarUrl ? (
                        <Image src={creador.avatarUrl} alt="" fill className="object-cover" sizes="64px" />
                      ) : (
                        nombre.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    {nombre}
                    <small>desde {fechaMedia(desde)}</small>
                  </>
                );

                return (
                  <li key={creador.id}>
                    {creador.username ? (
                      <Link href={`/creadores/${creador.username}`} className="rk-cx-a">
                        {contenido}
                      </Link>
                    ) : (
                      <span className="rk-cx-a">{contenido}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* CATEGORÍAS POPULARES */}
        {destacada && (
          <section className="rk-cx-sec" aria-labelledby="rk-cx-categorias">
            <div className="rk-cx-sh">
              <div>
                <h3 id="rk-cx-categorias">Categorías populares</h3>
              </div>
            </div>

            <div className={`rk-cx-cat${otrasCategorias.length ? "" : " rk-cx-cat-sola"}`}>
              <Link href={`/tienda?categoria=${encodeURIComponent(destacada.slug)}`} className="rk-cx-big">
                {/* Fondo: la misma imagen desenfocada; el flyer va entero a la derecha. */}
                {destacada.imagen && (
                  <Image src={destacada.imagen} alt="" fill className="rk-cx-big-fondo" sizes="(max-width: 1000px) 100vw, 50vw" />
                )}
                {destacada.imagen && (
                  <span className="rk-cx-big-flyer" style={{ aspectRatio: marcoCategoria(destacada.slug) }}>
                    <Image src={destacada.imagen} alt="" fill className="object-contain" sizes="240px" />
                  </span>
                )}
                <span className="rk-cx-big-tx">
                  <em>{medidaCx({ slug: destacada.slug }).medida}</em>
                  <span className="rk-cx-big-t">{destacada.nombre}</span>
                  <small>
                    {destacada.recursos} {destacada.recursos === 1 ? "recurso" : "recursos"}
                  </small>
                  <span className="rk-btn rk-btn-paper rk-btn-compact">Explorar categoría</span>
                </span>
              </Link>

              {otrasCategorias.length > 0 && (
                <ul className="rk-cx-side">
                  {otrasCategorias.slice(0, 3).map((c) => (
                    <li key={c.slug}>
                      <Link href={`/tienda?categoria=${encodeURIComponent(c.slug)}`} className="rk-cx-row">
                        <span className="rk-cx-row-i" style={{ aspectRatio: marcoCategoria(c.slug) }}>
                          {c.imagen && <Image src={c.imagen} alt="" fill className="object-contain" sizes="140px" />}
                        </span>
                        <span className="rk-cx-row-tx">
                          <em>{medidaCx({ slug: c.slug }).medida}</em>
                          <b>{c.nombre}</b>
                          <small>
                            {c.recursos} {c.recursos === 1 ? "recurso" : "recursos"}
                          </small>
                          <span className="rk-chip">Ver categoría</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* RECOMENDADOS (mismo fetch de siempre) */}
        <RecomendadosCliente variante="cx" />

        {/* ¿BUSCAS ALGO MÁS? */}
        <section className="rk-cx-cta2" aria-label="Explorar la tienda">
          <div>
            <b>¿Buscas algo más?</b>
            <span>Explora todo el catálogo de RcktX.</span>
          </div>
          <Link href="/tienda" target="_blank" rel="noopener noreferrer" className="rk-btn rk-btn-paper">
            Explorar la tienda
          </Link>
        </section>

        {/* APARIENCIA */}
        <section className="rk-card rk-cx-apariencia" aria-label="Apariencia">
          <div>
            <p className="rk-eyebrow">Apariencia</p>
            <p className="mt-1.5 text-sm text-ink/60">Elige el tema de la interfaz.</p>
          </div>
          <ThemeToggle conSistema />
        </section>

        {/* LO DE SIEMPRE, AL FINAL: pedidos, últimas compras y accesos */}
        <section className="rk-cx-sec" aria-labelledby="rk-cx-actividad">
          <div className="rk-cx-sh">
            <div>
              <h3 id="rk-cx-actividad">Tu actividad</h3>
              <p>Pedidos y últimas compras</p>
            </div>
          </div>

          {/* rk-dash solo aquí: el anillo y la lista del admin se
              pintan con su CSS, que también restiliza los botones. */}
          <div className="rk-dash rk-cx-actividad">
            <AnilloAdmin titulo="Pedidos" unidad="pedidos" partes={pedidos} vacio="Sin pedidos" cargando={loading} />
            <ListaAdmin
              titulo="Últimas compras"
              icono="venta"
              filas={paidOrders.slice(0, 5).map((order) => ({
                id: order.id,
                titulo: order.items[0]?.product.name || "Pedido",
                subtitulo:
                  fechaMedia(order.createdAt) +
                  (order.items.length > 1 ? ` · y ${order.items.length - 1} más` : ""),
                valor: solesMoneda(Number(order.total)),
                href: "/mi-cuenta/compras",
              }))}
            />
          </div>
        </section>

        <QuickAccess user={user} />
      </div>
    </div>
  );
}
