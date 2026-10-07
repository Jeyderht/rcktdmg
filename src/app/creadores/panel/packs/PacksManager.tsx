"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Layers, Pencil, Plus } from "lucide-react";

import { formatPrice } from "@/lib/pricing";
import {
  ETIQUETA_ESTADO,
  LARGO_NOMBRE_PACK,
  type PackVista,
} from "@/lib/packs-comun";
import { IconoBasura } from "@/components/iconos";

type ProductoPropio = {
  id: string;
  name: string;
  price: number;
  coverUrl: string | null;
};

/**
 * Packs del creador.
 *
 * Solo se ofrecen para incluir los recursos PROPIOS y
 * PUBLICADOS. El servidor lo vuelve a comprobar al guardar:
 * esta lista es una comodidad, no la barrera.
 */
export default function PacksManager() {
  const [packs, setPacks] = useState<PackVista[]>([]);
  const [productos, setProductos] = useState<ProductoPropio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const [editando, setEditando] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [elegidos, setElegidos] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const [rp, rr] = await Promise.all([
        fetch("/api/packs?mios=1", { cache: "no-store" }),
        fetch("/api/creadores/productos/mis-recursos", {
          cache: "no-store",
        }),
      ]);

      const dp = await rp.json();

      if (!rp.ok) throw new Error(dp.error || "No se pudieron cargar.");

      setPacks(dp.packs ?? []);

      if (rr.ok) {
        const dr = await rr.json();

        setProductos(
          (dr.products ?? [])
            .filter(
              (p: { status: string }) => p.status === "PUBLISHED"
            )
            .map((p: ProductoPropio & { price: string | number }) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price),
              coverUrl: p.coverUrl,
            }))
        );
      }

      setError("");
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudieron cargar los packs."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!aviso) return;

    const t = setTimeout(() => setAviso(""), 4000);

    return () => clearTimeout(t);
  }, [aviso]);

  function limpiar() {
    setName("");
    setDescription("");
    setPrice("");
    setElegidos([]);
    setEditando(null);
    setAbierto(false);
    setError("");
  }

  function abrirEdicion(pack: PackVista) {
    setEditando(pack.id);
    setName(pack.name);
    setDescription(pack.description);
    setPrice(String(pack.price));
    setElegidos(pack.productos.map((p) => p.id));
    setAbierto(true);
  }

  const suma = elegidos.reduce((total, id) => {
    const p = productos.find((x) => x.id === id);

    return total + (p ? p.price : 0);
  }, 0);

  const precioNumero = Number(price);

  const ahorro =
    Number.isFinite(precioNumero) && suma > precioNumero
      ? suma - precioNumero
      : null;

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();

    if (guardando) return;

    setGuardando(true);
    setError("");

    const cuerpo = {
      name,
      description,
      price,
      productIds: elegidos,
    };

    try {
      const respuesta = await fetch(
        editando ? `/api/packs/${editando}` : "/api/packs",
        {
          method: editando ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo guardar.");
      }

      setAviso(editando ? "Pack actualizado." : "Pack creado en borrador.");
      limpiar();
      await cargar();
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo guardar."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(
    pack: PackVista,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  ) {
    try {
      const respuesta = await fetch(`/api/packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pack.name,
          description: pack.description,
          price: pack.price,
          status,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo cambiar el estado.");
      }

      setAviso(`Pack ${ETIQUETA_ESTADO[status].toLowerCase()}.`);
      await cargar();
    } catch (fallo) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo cambiar el estado."
      );
    }
  }

  async function eliminar(pack: PackVista) {
    const confirmado = window.confirm(
      `¿Eliminar el pack “${pack.name}”?\n\nSi ya se vendió alguna vez, se archivará en lugar de borrarse para no dejar compras sin origen.`
    );

    if (!confirmado) return;

    try {
      const respuesta = await fetch(`/api/packs/${pack.id}`, {
        method: "DELETE",
      });

      if (!respuesta.ok) {
        const datos = await respuesta.json();
        throw new Error(datos.error || "No se pudo eliminar.");
      }

      setAviso("Pack eliminado.");
      await cargar();
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo eliminar."
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          {cargando
            ? "Cargando…"
            : packs.length === 0
              ? "Todavía no has creado ningún pack."
              : `${packs.length} ${packs.length === 1 ? "pack" : "packs"}`}
        </p>

        {!abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rk-btn rk-btn-ink"
          >
            <Plus size={15} aria-hidden />
            Nuevo pack
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rk-upload-error mt-4"
        >
          {error}
        </p>
      )}

      {aviso && (
        <p
          role="status"
          className="mt-4 rounded-rk-sm border border-line/15 bg-ink/[0.04] px-4 py-3 text-sm"
        >
          {aviso}
        </p>
      )}

      {/* ══════ FORMULARIO ══════ */}
      {abierto && (
        <form onSubmit={guardar} className="rk-tile mt-5 p-5 sm:p-6">
          <p className="rk-kicker">
            {editando ? "Editar pack" : "Nuevo pack"}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="pack-name"
                className="rk-label mb-2 block"
              >
                Nombre
              </label>

              <input
                id="pack-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={LARGO_NOMBRE_PACK}
                disabled={guardando}
                className="rk-input w-full"
              />
            </div>

            <div>
              <label
                htmlFor="pack-price"
                className="rk-label mb-2 block"
              >
                Precio del pack (S/)
              </label>

              <input
                id="pack-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                disabled={guardando}
                className="rk-input w-full"
              />

              <p className="mt-2 text-xs leading-5 text-ink/55">
                Lo decides tú. Suelto costaría{" "}
                <span className="tabular-nums">{formatPrice(suma)}</span>
                {ahorro !== null && (
                  <>
                    {" · ahorro de "}
                    <span className="tabular-nums">
                      {formatPrice(ahorro)}
                    </span>
                  </>
                )}
                .
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="pack-desc"
              className="rk-label mb-2 block"
            >
              Descripción
            </label>

            <textarea
              id="pack-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={guardando}
              className="rk-textarea w-full"
            />
          </div>

          {/* RECURSOS */}
          <div className="mt-5">
            <p className="rk-label mb-2 block">
              Recursos incluidos
            </p>

            {productos.length === 0 ? (
              <p className="rounded-rk-sm border border-line/15 px-4 py-3.5 text-sm leading-6 text-ink/60">
                No tienes recursos publicados. Solo pueden entrar en un
                pack recursos tuyos que ya estén publicados.
              </p>
            ) : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto rounded-rk-sm border border-line/12 p-2">
                {productos.map((producto) => {
                  const marcado = elegidos.includes(producto.id);

                  return (
                    <li key={producto.id}>
                      <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-rk-sm px-2.5 py-2 transition-colors hover:bg-ink/[0.04]">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() =>
                            setElegidos((previos) =>
                              marcado
                                ? previos.filter((x) => x !== producto.id)
                                : [...previos, producto.id]
                            )
                          }
                          className="h-4 w-4 shrink-0 accent-[rgb(var(--rk-foreground))]"
                        />

                        <span className="rk-media relative h-9 w-9 shrink-0 overflow-hidden rounded-rk-sm">
                          {producto.coverUrl && (
                            <Image
                              src={producto.coverUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="36px"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm">
                          {producto.name}
                        </span>

                        <span className="shrink-0 text-xs tabular-nums text-ink/50">
                          {formatPrice(producto.price)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-2 text-xs tabular-nums text-ink/55">
              {elegidos.length} seleccionados
            </p>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={limpiar}
              className="rk-btn rk-btn-line"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="rk-btn rk-btn-ink disabled:opacity-50"
            >
              {guardando
                ? "Guardando…"
                : editando
                  ? "Guardar cambios"
                  : "Crear pack"}
            </button>
          </div>
        </form>
      )}

      {/* ══════ LISTA ══════ */}
      {cargando ? (
        <div aria-busy="true" className="mt-5 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-rk-sm bg-ink/[0.05]"
            />
          ))}
        </div>
      ) : packs.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {packs.map((pack) => (
            <li
              key={pack.id}
              className="rounded-rk-sm border border-line/12 px-4 py-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    {pack.status === "PUBLISHED" ? (
                      <Link
                        href={`/packs/${pack.slug}`}
                        className="truncate font-medium underline-offset-4 hover:underline"
                      >
                        {pack.name}
                      </Link>
                    ) : (
                      <span className="truncate font-medium">
                        {pack.name}
                      </span>
                    )}

                    <span
                      className={`rk-badge ${
                        pack.status === "PUBLISHED"
                          ? "rk-badge-success"
                          : pack.status === "ARCHIVED"
                            ? "rk-badge-warning"
                            : "rk-badge-neutral"
                      }`}
                    >
                      {ETIQUETA_ESTADO[pack.status]}
                    </span>
                  </p>

                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs tabular-nums text-ink/55">
                    <span className="font-medium text-ink/75">
                      {formatPrice(pack.price)}
                    </span>

                    <span>
                      {pack.productos.length}{" "}
                      {pack.productos.length === 1 ? "recurso" : "recursos"}
                    </span>

                    {pack.ahorro && (
                      <span>−{pack.ahorro.porcentaje}%</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {pack.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => cambiarEstado(pack, "PUBLISHED")}
                      className="rk-btn rk-btn-ink"
                    >
                      Publicar
                    </button>
                  )}

                  {pack.status === "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => cambiarEstado(pack, "ARCHIVED")}
                      className="rk-btn rk-btn-line"
                    >
                      Archivar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => abrirEdicion(pack)}
                    aria-label={`Editar ${pack.name}`}
                    className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-ink/[0.06] hover:text-ink"
                  >
                    <Pencil size={15} aria-hidden />
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminar(pack)}
                    aria-label={`Eliminar ${pack.name}`}
                    className="rk-press flex h-11 w-11 items-center justify-center rounded-rk-sm text-ink/60 hover:bg-danger/10 hover:text-danger"
                  >
                    <IconoBasura size={15} aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !abierto && (
          <div className="mt-5 rounded-rk-sm border border-line/12 px-5 py-10 text-center">
            <div
              aria-hidden
              className="rk-empty-icon mx-auto"
            >
              <Layers size={20} className="text-ink/55" />
            </div>

            <p className="mt-3 text-sm leading-6 text-ink/60">
              Agrupa varios de tus recursos en un pack y véndelos
              juntos por un precio único.
            </p>
          </div>
        )
      )}
    </div>
  );
}
