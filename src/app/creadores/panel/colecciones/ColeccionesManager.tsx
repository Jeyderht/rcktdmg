"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Check,
  ExternalLink,
  Library,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import EmptyState from "@/components/EmptyState";
import SubirPortada from "@/components/SubirPortada";
import { formatPrice } from "@/lib/pricing";
import {
  ETIQUETA_ESTADO_COLECCION,
  LARGO_DESCRIPCION_COLECCION,
  LARGO_NOMBRE_COLECCION,
  MINIMO_RECURSOS_COLECCION,
  calcularAhorroColeccion,
  type ColeccionVista,
  type EstadoColeccion,
} from "@/lib/colecciones-comerciales-comun";

type Recurso = {
  id: string;
  name: string;
  slug: string;
  price: string;
  status: string;
  coverUrl: string | null;
};

const TONO: Record<EstadoColeccion, string> = {
  DRAFT: "rk-badge-neutral",
  PUBLISHED: "rk-badge-success",
  ARCHIVED: "rk-badge-warning",
};

/**
 * Colecciones comerciales del creador.
 *
 * Una colección reúne recursos propios ya publicados y se
 * vende como una sola compra. Para publicarla hacen falta al
 * menos {MINIMO_RECURSOS_COLECCION} recursos: la comprobación
 * de verdad la hace el servidor, y aquí se avisa antes para no
 * mandar a nadie contra un error.
 */
export default function ColeccionesManager() {
  const [colecciones, setColecciones] = useState<ColeccionVista[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [enCurso, setEnCurso] = useState<string | null>(null);

  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [portada, setPortada] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setCargando(true);

    try {
      const [rc, rp] = await Promise.all([
        fetch("/api/colecciones-comerciales", { cache: "no-store" }),
        fetch("/api/creadores/productos/mis-recursos", {
          cache: "no-store",
        }),
      ]);

      const dc = await rc.json();
      const dp = await rp.json();

      if (!rc.ok) throw new Error(dc.error || "No se pudieron cargar.");

      setColecciones(dc.colecciones);

      // Solo los publicados pueden entrar en una colección.
      setRecursos(
        rp.ok
          ? (dp.products as Recurso[]).filter(
              (p) => p.status === "PUBLISHED"
            )
          : []
      );
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudieron cargar."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function abrirNueva() {
    setEditando("nueva");
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setPortada(null);
    setElegidos([]);
    setError("");
  }

  function abrirEdicion(coleccion: ColeccionVista) {
    setEditando(coleccion.id);
    setNombre(coleccion.name);
    setDescripcion(coleccion.description);
    setPrecio(String(coleccion.price));
    setPortada(coleccion.coverUrl);
    setElegidos(coleccion.productos.map((p) => p.id));
    setError("");
  }

  async function llamar(
    url: string,
    opciones: RequestInit,
    clave: string
  ): Promise<boolean> {
    setEnCurso(clave);
    setError("");

    try {
      const respuesta = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...opciones,
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo completar.");
      }

      await cargar();

      return true;
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo completar."
      );

      return false;
    } finally {
      setEnCurso(null);
    }
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();

    const cuerpo = JSON.stringify({
      name: nombre,
      description: descripcion,
      price: Number(precio),
      coverUrl: portada ?? "",
      productIds: elegidos,
    });

    const ok =
      editando === "nueva"
        ? await llamar(
            "/api/colecciones-comerciales",
            { method: "POST", body: cuerpo },
            "guardar"
          )
        : await llamar(
            `/api/colecciones-comerciales/${editando}`,
            { method: "PATCH", body: cuerpo },
            "guardar"
          );

    if (ok) setEditando(null);
  }

  /* Suma de los recursos elegidos, para enseñar el ahorro en vivo. */
  const sumaElegidos = recursos
    .filter((r) => elegidos.includes(r.id))
    .reduce((total, r) => total + Number(r.price), 0);

  const ahorroPrevisto = calcularAhorroColeccion(
    Number(precio),
    sumaElegidos
  );

  const faltan = Math.max(0, MINIMO_RECURSOS_COLECCION - elegidos.length);

  return (
    <div>
      {/* ══════════ FORMULARIO ══════════ */}
      {editando ? (
        <form onSubmit={guardar} className="rk-card p-5 sm:p-6">
          <h2 className="rk-title text-lg">
            {editando === "nueva" ? "Nueva colección" : "Editar colección"}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="col-nombre" className="text-sm font-medium">
                Nombre
              </label>

              <input
                id="col-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={LARGO_NOMBRE_COLECCION}
                required
                placeholder="Colección inmobiliaria"
                className="rk-input mt-1.5 w-full"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="col-desc" className="text-sm font-medium">
                Descripción
              </label>

              <textarea
                id="col-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={LARGO_DESCRIPCION_COLECCION}
                required
                rows={3}
                placeholder="Qué cubre la colección y para quién es."
                className="rk-textarea mt-1.5 w-full"
              />
            </div>

            <div>
              <label htmlFor="col-precio" className="text-sm font-medium">
                Precio de la colección (S/)
              </label>

              <input
                id="col-precio"
                type="number"
                min="0.01"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
                className="rk-input mt-1.5 w-full"
              />
            </div>

            {/* El desglose se calcula en vivo con precios reales. */}
            <div className="rounded-rk-sm border border-line/12 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-ink/60">Valor individual</span>
                <span className="tabular-nums">
                  {formatPrice(sumaElegidos)}
                </span>
              </div>

              <div className="mt-1 flex justify-between gap-3">
                <span className="text-ink/60">Ahorro</span>
                <span className="tabular-nums">
                  {ahorroPrevisto
                    ? `${formatPrice(ahorroPrevisto.importe)} · ${ahorroPrevisto.porcentaje}%`
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <SubirPortada
              valor={portada}
              alCambiar={setPortada}
              ayuda="Es la imagen de la colección en la tienda. NO cuenta como uno de los recursos."
            />
          </div>

          {/* ══════════ RECURSOS ══════════ */}
          <fieldset className="mt-6">
            <legend className="text-sm font-medium">
              Recursos incluidos
            </legend>

            <p className="mt-1 text-[13px] text-ink/55">
              Solo tus recursos publicados. Elegidos: {elegidos.length}
              {faltan > 0 &&
                ` · faltan ${faltan} para poder publicarla`}
            </p>

            {recursos.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink/60">
                Todavía no tienes recursos publicados.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {recursos.map((recurso) => {
                  const elegido = elegidos.includes(recurso.id);

                  return (
                    <li key={recurso.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setElegidos((antes) =>
                            antes.includes(recurso.id)
                              ? antes.filter((x) => x !== recurso.id)
                              : [...antes, recurso.id]
                          )
                        }
                        aria-pressed={elegido}
                        className={`rk-press flex w-full min-h-[3.5rem] items-center gap-3 rounded-rk-sm border p-2.5 text-left transition-colors duration-fast ${
                          elegido
                            ? "border-ink bg-ink/[0.04]"
                            : "border-line/15 hover:border-ink/30"
                        }`}
                      >
                        <span className="rk-media relative h-10 w-10 shrink-0 overflow-hidden rounded-rk-sm">
                          {recurso.coverUrl && (
                            <Image
                              src={recurso.coverUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {recurso.name}
                          </span>

                          <span className="block text-[12px] tabular-nums text-ink/55">
                            {formatPrice(Number(recurso.price))}
                          </span>
                        </span>

                        {elegido && (
                          <Check size={16} aria-hidden className="shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={enCurso === "guardar"}
              className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px] disabled:opacity-60"
            >
              {enCurso === "guardar" ? (
                <Loader2 size={15} aria-hidden className="animate-spin" />
              ) : (
                <Check size={15} aria-hidden />
              )}
              Guardar
            </button>

            <button
              type="button"
              onClick={() => setEditando(null)}
              className="rk-btn rk-btn-line !px-5 !py-2.5 !text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={abrirNueva}
          className="rk-btn rk-btn-ink !px-5 !py-2.5 !text-[13px]"
        >
          <Plus size={15} aria-hidden />
          Nueva colección
        </button>
      )}

      {error && !editando && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      {/* ══════════ LISTA ══════════ */}
      {cargando ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-ink/55">
          <Loader2 size={15} aria-hidden className="animate-spin" />
          Cargando…
        </p>
      ) : colecciones.length === 0 && !editando ? (
        <div className="mt-8">
          <EmptyState
            icon={Library}
            title="Todavía no tienes colecciones"
            description={`Reúne al menos ${MINIMO_RECURSOS_COLECCION} de tus recursos publicados y véndelos como un conjunto.`}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {colecciones.map((coleccion) => (
            <li key={coleccion.id} className="rk-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">
                    {coleccion.name}
                  </p>

                  <p className="mt-0.5 text-[13px] tabular-nums text-ink/55">
                    {coleccion.productos.length} recursos ·{" "}
                    {formatPrice(coleccion.price)}
                    {coleccion.ahorro &&
                      ` · ahorro ${coleccion.ahorro.porcentaje}%`}
                  </p>
                </div>

                <span className={`rk-badge ${TONO[coleccion.status]}`}>
                  {ETIQUETA_ESTADO_COLECCION[coleccion.status]}
                </span>
              </div>

              {coleccion.faltanParaPublicar > 0 && (
                <p className="mt-3 text-[13px] text-ink/60">
                  Faltan {coleccion.faltanParaPublicar} recursos para
                  poder publicarla.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => abrirEdicion(coleccion)}
                  className="rk-btn rk-btn-line !px-4 !py-2 !text-[13px]"
                >
                  Editar
                </button>

                {coleccion.status !== "PUBLISHED" && (
                  <button
                    type="button"
                    disabled={enCurso === coleccion.id}
                    onClick={() =>
                      llamar(
                        `/api/colecciones-comerciales/${coleccion.id}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({ status: "PUBLISHED" }),
                        },
                        coleccion.id
                      )
                    }
                    className="rk-btn rk-btn-ink !px-4 !py-2 !text-[13px] disabled:opacity-60"
                  >
                    <Send size={14} aria-hidden />
                    Publicar
                  </button>
                )}

                {coleccion.status === "PUBLISHED" && (
                  <>
                    <Link
                      href={`/colecciones-comerciales/${coleccion.slug}`}
                      className="rk-btn rk-btn-line !px-4 !py-2 !text-[13px]"
                    >
                      <ExternalLink size={14} aria-hidden />
                      Ver ficha
                    </Link>

                    <button
                      type="button"
                      disabled={enCurso === coleccion.id}
                      onClick={() =>
                        llamar(
                          `/api/colecciones-comerciales/${coleccion.id}`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({ status: "ARCHIVED" }),
                          },
                          coleccion.id
                        )
                      }
                      className="rk-btn rk-btn-line !px-4 !py-2 !text-[13px] disabled:opacity-60"
                    >
                      <Archive size={14} aria-hidden />
                      Archivar
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={enCurso === coleccion.id}
                  onClick={() =>
                    llamar(
                      `/api/colecciones-comerciales/${coleccion.id}`,
                      { method: "DELETE" },
                      coleccion.id
                    )
                  }
                  aria-label="Eliminar colección"
                  className="rk-press rk-touch grid h-10 w-10 place-items-center rounded-full text-danger hover:bg-danger/10"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
