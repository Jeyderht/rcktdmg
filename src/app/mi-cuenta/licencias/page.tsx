"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, ScrollText, ShieldOff } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import {
  LICENCIAS,
  type LicenciaVista,
} from "@/lib/licencias-comun";

/**
 * Licencias del cliente.
 *
 * Cada licencia acredita qué puede hacer con un recurso que
 * compró. Se muestran también las retiradas, con el motivo:
 * una licencia que desaparece sin explicación parece un fallo
 * de la plataforma.
 */
export default function LicenciasPage() {
  const [licencias, setLicencias] = useState<LicenciaVista[]>([]);
  const [vigentes, setVigentes] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch("/api/licencias", {
          cache: "no-store",
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudieron cargar.");
        }

        if (!cancelado) {
          setLicencias(datos.licencias ?? []);
          setVigentes(datos.vigentes ?? 0);
        }
      } catch (fallo) {
        if (!cancelado) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudieron cargar las licencias."
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!copiado) return;

    const t = setTimeout(() => setCopiado(null), 2000);

    return () => clearTimeout(t);
  }, [copiado]);

  async function copiar(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiado(code);
    } catch {
      // Portapapeles bloqueado: el código sigue a la vista.
    }
  }

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", { dateStyle: "long" });

  return (
    <>

      <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-8">
        <AccountPageHeader
          title="Licencias"
          subtitle="Lo que puedes hacer con cada recurso que has comprado."
        />

        {!cargando && !error && licencias.length > 0 && (
          <p className="mt-5 text-[15px] tabular-nums text-ink/60">
            {licencias.length}{" "}
            {licencias.length === 1 ? "licencia" : "licencias"}
            {vigentes !== licencias.length &&
              ` · ${vigentes} vigente${vigentes === 1 ? "" : "s"}`}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-rk-sm border border-danger/25 bg-danger/[0.06] px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {cargando ? (
          <div aria-busy="true" className="mt-7 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-rk-sm bg-ink/[0.05]"
              />
            ))}
          </div>
        ) : licencias.length === 0 && !error ? (
          <div className="mt-7">
            <EmptyState
              icon={ScrollText}
              title="Todavía no tienes licencias"
              description="Cada recurso que compras te otorga una licencia de uso. Aquí podrás consultarlas."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        ) : (
          <ul className="mt-7 space-y-2.5">
            {licencias.map((licencia) => {
              const retirada = licencia.status === "REVOKED";

              const definicion = LICENCIAS[licencia.type];

              const desplegada = abierta === licencia.id;

              return (
                <li
                  key={licencia.id}
                  className={`rounded-rk-md border px-4 py-4 sm:px-5 ${
                    retirada
                      ? "border-danger/25 bg-danger/[0.03]"
                      : "border-line/12"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* PORTADA */}
                    <span className="rk-media relative h-14 w-14 shrink-0 overflow-hidden rounded-rk-sm sm:h-16 sm:w-16">
                      {licencia.producto.coverUrl && (
                        <Image
                          src={licencia.producto.coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tienda/${licencia.producto.slug}`}
                        className="block truncate font-medium underline-offset-4 hover:underline"
                      >
                        {licencia.producto.name}
                      </Link>

                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink/55">
                        <span
                          className={`rk-badge ${
                            retirada
                              ? "rk-badge-danger"
                              : "rk-badge-neutral"
                          }`}
                        >
                          {retirada ? "Retirada" : definicion.etiqueta}
                        </span>

                        <span>Otorgada el {fecha(licencia.grantedAt)}</span>
                      </p>

                      {/* CÓDIGO: identificador para soporte. */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <code className="rounded-rk-sm bg-ink/[0.05] px-2.5 py-1.5 text-[12px] font-medium tracking-wide">
                          {licencia.code}
                        </code>

                        <button
                          type="button"
                          onClick={() => copiar(licencia.code)}
                          aria-label={`Copiar el código ${licencia.code}`}
                          className="rk-press rk-touch flex h-9 w-9 items-center justify-center rounded-full text-ink/50 hover:bg-ink/[0.06] hover:text-ink"
                        >
                          {copiado === licencia.code ? (
                            <Check size={14} aria-hidden />
                          ) : (
                            <Copy size={14} aria-hidden />
                          )}
                        </button>
                      </div>

                      {retirada && (
                        <p className="mt-2.5 flex items-start gap-2 text-xs leading-5 text-danger">
                          <ShieldOff
                            size={14}
                            aria-hidden
                            className="mt-0.5 shrink-0"
                          />
                          {licencia.revokedReason ||
                            "Esta licencia ya no está vigente."}
                        </p>
                      )}

                      {/* CONDICIONES: las que se copiaron al otorgarla. */}
                      <button
                        type="button"
                        onClick={() =>
                          setAbierta(desplegada ? null : licencia.id)
                        }
                        aria-expanded={desplegada}
                        className="rk-press-sm mt-3 inline-flex min-h-[2.75rem] items-center text-[13px] font-medium underline underline-offset-4 hover:opacity-70"
                      >
                        {desplegada
                          ? "Ocultar condiciones"
                          : "Ver condiciones"}
                      </button>

                      {desplegada && (
                        <div className="mt-2 rounded-rk-sm border border-line/12 px-4 py-3.5">
                          <p className="text-[13px] leading-6 text-ink/70">
                            {definicion.resumen}
                          </p>

                          <ul className="mt-2.5 space-y-1.5">
                            {definicion.condiciones.map((c) => (
                              <li
                                key={c}
                                className="flex gap-2 text-[13px] leading-6 text-ink/60"
                              >
                                <span aria-hidden className="text-ink/30">
                                  ·
                                </span>
                                {c}
                              </li>
                            ))}
                          </ul>

                          <p className="mt-3 border-t border-line/10 pt-2.5 text-xs text-ink/45">
                            Pedido {licencia.pedido.id.slice(0, 8)} · S/{" "}
                            {licencia.pedido.precio.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <Footer />
    </>
  );
}
