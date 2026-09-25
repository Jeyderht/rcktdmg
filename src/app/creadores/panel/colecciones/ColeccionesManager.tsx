"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  GripVertical,
  Library,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";

import EmptyState from "@/components/EmptyState";
import SubirPortada from "@/components/SubirPortada";
import SubidorImagen from "@/components/SubidorImagen";
import SubidorArchivo, {
  type ArchivoGuardado,
} from "@/components/SubidorArchivo";
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
  /* Medidas reales de la portada. Nulas si no se pudieron leer. */
  coverWidth: number | null;
  coverHeight: number | null;
  category: { name: string; slug: string } | null;
};

const TONO: Record<EstadoColeccion, string> = {
  DRAFT: "rk-badge-neutral",
  PENDING_REVIEW: "rk-badge-warning",
  PUBLISHED: "rk-badge-success",
  REJECTED: "rk-badge-danger",
  ARCHIVED: "rk-badge-neutral",
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
  const [preview, setPreview] = useState<string | null>(null);
  const [zip, setZip] = useState<ArchivoGuardado | null>(null);

  /*
    El ORDEN importa: es el que verá quien compre la colección,
    así que `elegidos` es una lista ordenada, no un conjunto.
  */
  const [elegidos, setElegidos] = useState<string[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [arrastrado, setArrastrado] = useState<number | null>(null);

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
    setPreview(null);
    setZip(null);
    setElegidos([]);
    setBusqueda("");
    setFiltroCategoria("");
    setError("");
  }

  function abrirEdicion(coleccion: ColeccionVista) {
    setEditando(coleccion.id);
    setNombre(coleccion.name);
    setDescripcion(coleccion.description);
    setPrecio(String(coleccion.price));
    setPortada(coleccion.coverUrl);
    setPreview(coleccion.previewUrl);
    /*
      Del ZIP guardado solo se conoce la referencia: el nombre
      y el peso vivían en el navegador de quien lo subió. Se
      enseña con un nombre genérico para que se vea que está.
    */
    setZip(
      coleccion.zipUrl
        ? { url: coleccion.zipUrl, nombre: "Archivo de la colección", bytes: 0 }
        : null
    );
    setElegidos(coleccion.productos.map((p) => p.id));
    setBusqueda("");
    setFiltroCategoria("");
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
      previewUrl: preview ?? "",
      zipUrl: zip?.url ?? "",
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

  /** Categorías presentes entre los recursos, para el filtro. */
  const categoriasDisponibles = [
    ...new Set(
      recursos.map((r) => r.category?.name).filter(Boolean) as string[]
    ),
  ].sort();

  /*
    Lo que queda por añadir: ni lo ya elegido, ni lo que no
    case con la búsqueda o el filtro.
  */
  const consulta = busqueda.trim().toLowerCase();

  const disponibles = recursos.filter(
    (r) =>
      !elegidos.includes(r.id) &&
      (!consulta || r.name.toLowerCase().includes(consulta)) &&
      (!filtroCategoria || r.category?.name === filtroCategoria)
  );

  /**
   * Cambia un recurso de sitio dentro de la colección.
   *
   * La usan por igual el arrastre de escritorio y las flechas
   * de móvil, para que las dos formas ordenen exactamente
   * igual. Un índice fuera de la lista no hace nada.
   */
  function mover(desde: number | null, hasta: number) {
    if (desde === null || desde === hasta) return;

    setElegidos((antes) => {
      if (hasta < 0 || hasta >= antes.length) return antes;

      const copia = [...antes];
      const [pieza] = copia.splice(desde, 1);

      copia.splice(hasta, 0, pieza);

      return copia;
    });
  }

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

              <p className="mt-0.5 text-[12px] text-ink/55">
                Compra única: un solo pago por todo el conjunto.
              </p>

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

          {/*
            TRES ARCHIVOS DISTINTOS, y se dice cuál es cuál.

            PORTADA  → el cartel en tienda, Home y tarjetas.
            PREVIEW  → la muestra de lo que hay dentro.
            ZIP      → el archivo privado que se descarga.

            Confundirlos es el error fácil, así que cada uno
            lleva escrito para qué sirve.
          */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <SubirPortada
              valor={portada}
              alCambiar={setPortada}
              ayuda="El cartel de la colección en la tienda. NO cuenta como uno de los recursos."
            />

            <SubidorImagen
              id="col-preview"
              etiqueta="Vista previa"
              valor={
                preview ? { url: preview, ancho: null, alto: null } : null
              }
              alCambiar={(imagen) => setPreview(imagen?.url ?? null)}
              ayuda="Muestra de lo que incluye. Se enseña protegida."
            />
          </div>

          <div className="mt-5">
            <SubidorArchivo
              id="col-zip"
              etiqueta="Archivo de la colección"
              valor={zip}
              alCambiar={setZip}
              ayuda="Opcional: un ZIP con todo. Sin él, cada recurso se descarga por separado."
            />
          </div>

          {/* ══════════ RECURSOS ══════════ */}
          <fieldset className="mt-7">
            <legend className="text-sm font-medium">
              Recursos incluidos
            </legend>

            <p className="mt-1 text-[13px] text-ink/55">
              Cualquier combinación de piezas tuyas ya publicadas:
              stories, flyers, portadas, perfiles, posts, corporativos…
            </p>

            {/* ── LO ELEGIDO, EN ORDEN ── */}
            <div className="mt-4 rounded-rk-md border border-line/12 p-3.5">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                <span className="tabular-nums">
                  {elegidos.length} recurso{elegidos.length === 1 ? "" : "s"}
                </span>

                <span className="rk-badge rk-badge-neutral">Compra única</span>

                {faltan > 0 && (
                  <span className="font-normal text-ink/55">
                    faltan {faltan} para poder publicarla
                  </span>
                )}
              </p>

              {elegidos.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink/55">
                  Todavía no has añadido ninguno.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {elegidos.map((id, indice) => {
                    const recurso = recursos.find((r) => r.id === id);

                    if (!recurso) return null;

                    return (
                      <li
                        key={id}
                        draggable
                        onDragStart={() => setArrastrado(indice)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          mover(arrastrado, indice);
                          setArrastrado(null);
                        }}
                        onDragEnd={() => setArrastrado(null)}
                        className={`flex items-center gap-2.5 rounded-rk-sm border border-line/12 bg-ink/[0.02] p-2 transition-opacity duration-fast ${
                          arrastrado === indice ? "opacity-40" : ""
                        }`}
                      >
                        {/*
                          El asa solo sirve en escritorio. En
                          táctil ordenan las flechas de al lado,
                          que hacen exactamente lo mismo: un
                          arrastre con el dedo dentro de una
                          página que ya hace scroll es una
                          pelea perdida.
                        */}
                        <span
                          aria-hidden
                          className="hidden shrink-0 cursor-grab text-ink/35 sm:block"
                        >
                          <GripVertical size={15} />
                        </span>

                        <span className="w-4 shrink-0 text-center text-[11px] font-semibold tabular-nums text-ink/45">
                          {indice + 1}
                        </span>

                        <span className="rk-media relative h-11 w-11 shrink-0 overflow-hidden rounded-rk-sm">
                          {recurso.coverUrl && (
                            <Image
                              src={recurso.coverUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {recurso.name}
                          </span>

                          <span className="block truncate text-[11px] tabular-nums text-ink/55">
                            {recurso.category?.name ?? "Sin categoría"}
                            {recurso.coverWidth && recurso.coverHeight
                              ? ` · ${recurso.coverWidth}×${recurso.coverHeight}`
                              : ""}
                            {` · ${formatPrice(Number(recurso.price))}`}
                          </span>
                        </span>

                        <span className="flex shrink-0 items-center gap-1">
                          <Link
                            href={`/tienda/${recurso.slug}`}
                            target="_blank"
                            aria-label={`Previsualizar ${recurso.name}`}
                            className="rk-press grid h-9 w-9 place-items-center rounded-rk-sm text-ink/55 transition-colors duration-fast hover:bg-ink/[0.06] hover:text-ink"
                          >
                            <Eye size={14} aria-hidden />
                          </Link>

                          <button
                            type="button"
                            onClick={() => mover(indice, indice - 1)}
                            disabled={indice === 0}
                            aria-label={`Subir ${recurso.name}`}
                            className="rk-press grid h-9 w-9 place-items-center rounded-rk-sm text-ink/55 transition-colors duration-fast hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
                          >
                            <ChevronUp size={15} aria-hidden />
                          </button>

                          <button
                            type="button"
                            onClick={() => mover(indice, indice + 1)}
                            disabled={indice === elegidos.length - 1}
                            aria-label={`Bajar ${recurso.name}`}
                            className="rk-press grid h-9 w-9 place-items-center rounded-rk-sm text-ink/55 transition-colors duration-fast hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30"
                          >
                            <ChevronDown size={15} aria-hidden />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setElegidos((antes) =>
                                antes.filter((x) => x !== id)
                              )
                            }
                            aria-label={`Quitar ${recurso.name}`}
                            className="rk-press grid h-9 w-9 place-items-center rounded-rk-sm text-ink/55 transition-colors duration-fast hover:bg-danger/10 hover:text-danger"
                          >
                            <X size={15} aria-hidden />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* ── BUSCADOR Y FILTRO ── */}
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  size={14}
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
                />

                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar entre tus recursos"
                  aria-label="Buscar entre tus recursos"
                  className="rk-input w-full !pl-9"
                />
              </div>

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                aria-label="Filtrar por categoría"
                className="rk-input w-auto"
              >
                <option value="">Todas las categorías</option>

                {categoriasDisponibles.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {recursos.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink/60">
                Todavía no tienes recursos publicados.
              </p>
            ) : disponibles.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink/60">
                {elegidos.length === recursos.length
                  ? "Ya los has añadido todos."
                  : "Ningún recurso coincide con la búsqueda."}
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {disponibles.map((recurso) => (
                  <li key={recurso.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setElegidos((antes) => [...antes, recurso.id])
                      }
                      className="rk-press flex w-full min-h-[3.5rem] items-center gap-3 rounded-rk-sm border border-line/15 p-2.5 text-left transition-colors duration-fast hover:border-ink/30"
                    >
                      <span className="rk-media relative h-11 w-11 shrink-0 overflow-hidden rounded-rk-sm">
                        {recurso.coverUrl && (
                          <Image
                            src={recurso.coverUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {recurso.name}
                        </span>

                        <span className="block truncate text-[11px] tabular-nums text-ink/55">
                          {recurso.category?.name ?? "Sin categoría"}
                          {recurso.coverWidth && recurso.coverHeight
                            ? ` · ${recurso.coverWidth}×${recurso.coverHeight}`
                            : ""}
                          {` · ${formatPrice(Number(recurso.price))}`}
                        </span>
                      </span>

                      <Plus size={16} aria-hidden className="shrink-0 text-ink/45" />
                    </button>
                  </li>
                ))}
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
              Guardar borrador
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

              {/*
                MOTIVO DEL RECHAZO

                Se enseña entero, porque es lo único que le dice
                al creador qué tiene que arreglar. Al editarla,
                la colección vuelve a borrador y el motivo
                desaparece: hablaba de una versión que ya no
                existe.
              */}
              {coleccion.status === "REJECTED" && coleccion.rejectionReason && (
                <p className="mt-3 rounded-rk-sm border border-danger/25 bg-danger/10 px-3 py-2 text-[13px] leading-5 text-danger">
                  <span className="font-medium">Motivo del rechazo: </span>
                  {coleccion.rejectionReason}
                </p>
              )}

              {coleccion.status === "PENDING_REVIEW" && (
                <p className="mt-3 text-[13px] text-ink/60">
                  En revisión. El equipo la publicará o te dirá qué
                  cambiar.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {/*
                  Una colección en revisión o publicada no se
                  edita por detrás: primero se rechaza o se
                  archiva.
                */}
                {(coleccion.status === "DRAFT" ||
                  coleccion.status === "REJECTED" ||
                  coleccion.status === "ARCHIVED") && (
                  <button
                    type="button"
                    onClick={() => abrirEdicion(coleccion)}
                    className="rk-btn rk-btn-line !px-4 !py-2 !text-[13px]"
                  >
                    Editar
                  </button>
                )}

                {(coleccion.status === "DRAFT" ||
                  coleccion.status === "REJECTED") && (
                  <button
                    type="button"
                    disabled={
                      enCurso === coleccion.id ||
                      coleccion.faltanParaPublicar > 0
                    }
                    onClick={() =>
                      llamar(
                        `/api/colecciones-comerciales/${coleccion.id}/enviar-revision`,
                        { method: "POST" },
                        coleccion.id
                      )
                    }
                    className="rk-btn rk-btn-ink !px-4 !py-2 !text-[13px] disabled:opacity-60"
                  >
                    {enCurso === coleccion.id ? (
                      <Loader2 size={14} aria-hidden className="animate-spin" />
                    ) : (
                      <Send size={14} aria-hidden />
                    )}
                    Enviar a revisión
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
