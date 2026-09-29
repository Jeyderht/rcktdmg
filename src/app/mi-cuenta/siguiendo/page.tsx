"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, UserRound } from "lucide-react";

import AccountPageHeader from "@/components/AccountPageHeader";
import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";

type Creador = {
  id: string;
  username: string | null;
  name: string | null;
  publicName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
};

type Seguido = { desde: string; creador: Creador };

/**
 * Creadores a los que sigue el usuario.
 *
 * El listado lo devuelve el servidor a partir de la sesión,
 * así que nadie puede consultar a quién sigue otra persona.
 */
export default function SiguiendoPage() {
  const [siguiendo, setSiguiendo] = useState<Seguido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch("/api/seguidores", {
          cache: "no-store",
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudo cargar la lista."
          );
        }

        if (!cancelado) setSiguiendo(datos.siguiendo ?? []);
      } catch (fallo) {
        if (!cancelado) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No se pudo cargar la lista."
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

  const nombre = (c: Creador) =>
    c.publicName || c.name || (c.username ? `@${c.username}` : "Creador");

  return (
    <>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-5 lg:pb-20 lg:pt-8">
        <AccountPageHeader
          title="Siguiendo"
          subtitle="Creadores cuyo trabajo sigues de cerca."
        />

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
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-rk-sm bg-ink/[0.05]"
              />
            ))}
          </div>
        ) : siguiendo.length === 0 && !error ? (
          <div className="mt-7">
            <EmptyState
              icon={UserRound}
              title="Todavía no sigues a nadie"
              description="Cuando sigas a un creador aparecerá aquí y verás antes sus recursos nuevos."
              action={{ href: "/creadores", label: "Descubrir creadores" }}
            />
          </div>
        ) : (
          <ul className="mt-7 space-y-1.5">
            {siguiendo.map(({ creador, desde }) => {
              const contenido = (
                <>
                  <span className="rk-media relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
                    {creador.avatarUrl ? (
                      <Image
                        src={creador.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-ink/55">
                        {nombre(creador).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      {nombre(creador)}

                      {creador.isVerified && (
                        <BadgeCheck
                          size={14}
                          aria-label="Verificado"
                          className="shrink-0 text-ink/55"
                        />
                      )}
                    </span>

                    <span className="block truncate text-xs text-ink/50">
                      Desde el{" "}
                      {new Date(desde).toLocaleDateString("es-PE", {
                        dateStyle: "medium",
                      })}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={creador.id}>
                  {/*
                    Solo es enlace si el creador conserva su
                    perfil público: si lo perdiera, la fila
                    sigue viéndose pero no lleva a un 404.
                  */}
                  {creador.username ? (
                    <Link
                      href={`/creadores/${creador.username}`}
                      className="rk-press-sm flex min-h-[2.75rem] items-center gap-3.5 rounded-rk-sm border border-line/12 px-4 py-3 transition-colors hover:border-ink/30 hover:bg-ink/[0.03]"
                    >
                      {contenido}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3.5 rounded-rk-sm border border-line/12 px-4 py-3">
                      {contenido}
                    </div>
                  )}
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
