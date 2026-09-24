"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Users } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";

type Seguidor = {
  id: string;
  nombre: string;
  avatarUrl: string | null;
  username: string | null;
  isVerified: boolean;
  desde: string;
};

/**
 * Seguidores del creador.
 *
 * Solo muestra lo que el servidor devuelve, que son los
 * seguidores de la sesión actual y nada más. No hay correos
 * ni datos de contacto: son personas ajenas al creador.
 */
export default function SeguidoresPage() {
  const [seguidores, setSeguidores] = useState<Seguidor[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async (p: number) => {
    setCargando(true);

    try {
      const respuesta = await fetch(
        `/api/creadores/seguidores?page=${p}`,
        { cache: "no-store" }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error || "No se pudieron cargar los seguidores."
        );
      }

      setSeguidores(datos.seguidores ?? []);
      setTotal(datos.total ?? 0);
      setPagina(datos.pagina ?? 1);
      setTotalPaginas(datos.totalPaginas ?? 1);
      setError("");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron cargar los seguidores."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(1);
  }, [cargar]);

  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-PE", {
      dateStyle: "medium",
    });

  return (
    <>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

        {/* ========== CABECERA ========== */}
        <header className="rk-fade-up">
          <p className="rk-eyebrow">Creator Studio</p>

          <h1 className="rk-title mt-2.5 text-[2rem] sm:text-4xl">
            Seguidores
          </h1>

          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink/60">
            Personas que siguen tu perfil y ven tus recursos
            nuevos.
          </p>

          {!cargando && !error && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-rk-sm border border-line/15 px-4 py-2 text-sm font-medium tabular-nums">
              <Users size={15} aria-hidden className="text-ink/50" />
              {total} {total === 1 ? "seguidor" : "seguidores"}
            </p>
          )}
        </header>

        <div className="rk-divider mt-7" />

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-rk-sm border border-danger/25 bg-danger/[0.06] px-4 py-3 text-sm text-danger"
          >
            {error}
          </p>
        )}

        {cargando ? (
          <div aria-busy="true" className="mt-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-rk-sm bg-ink/[0.05]"
              />
            ))}
          </div>
        ) : seguidores.length === 0 && !error ? (
          <div className="mt-6">
            <EmptyState
              icon={Users}
              title="Todavía no tienes seguidores"
              description="Cuando alguien siga tu perfil aparecerá aquí. Publicar recursos y completar tu perfil ayuda a que te encuentren."
              action={{
                href: "/creadores/panel/perfil",
                label: "Completar mi perfil",
              }}
            />
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-1.5">
              {seguidores.map((seguidor) => (
                <li
                  key={seguidor.id}
                  className="flex items-center gap-3.5 rounded-rk-sm border border-line/12 px-4 py-3"
                >
                  {/* AVATAR */}
                  <span className="rk-media relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {seguidor.avatarUrl ? (
                      <Image
                        src={seguidor.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-ink/55">
                        {seguidor.nombre.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      {seguidor.nombre}

                      {seguidor.isVerified && (
                        <BadgeCheck
                          size={14}
                          aria-label="Verificado"
                          className="shrink-0 text-ink/55"
                        />
                      )}
                    </p>

                    <p className="truncate text-xs text-ink/50">
                      Desde el {fecha(seguidor.desde)}
                    </p>
                  </div>

                  {/* Solo enlaza si esa persona tiene perfil público. */}
                  {seguidor.username && (
                    <Link
                      href={`/creadores/${seguidor.username}`}
                      className="rk-chip shrink-0"
                    >
                      Ver perfil
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {totalPaginas > 1 && (
              <nav
                aria-label="Paginación de seguidores"
                className="mt-8 flex items-center justify-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => cargar(pagina - 1)}
                  disabled={pagina <= 1}
                  className="rk-btn rk-btn-line !min-w-[2.75rem] !px-3 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>

                <span className="px-2 text-sm tabular-nums text-ink/60">
                  {pagina} de {totalPaginas}
                </span>

                <button
                  type="button"
                  onClick={() => cargar(pagina + 1)}
                  disabled={pagina >= totalPaginas}
                  className="rk-btn rk-btn-line !min-w-[2.75rem] !px-3 disabled:opacity-40"
                  aria-label="Página siguiente"
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
              </nav>
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
