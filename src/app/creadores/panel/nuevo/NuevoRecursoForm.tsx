"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import TagsInput from "@/components/TagsInput";
import SubidorImagen, { type EstadoImagen } from "@/components/SubidorImagen";
import {
  STORY,
  TIPOS_PUBLICACION,
  esRecursoSuelto,
  type ClaveTipo,
  type TipoPublicacion,
} from "@/lib/tipos-publicacion";
import {
  LICENCIAS,
  TIPOS_LICENCIA,
  type TipoLicencia,
} from "@/lib/licencias-comun";

import { subirArchivoDeProducto } from "@/lib/storage/client-upload";
import { COLORES } from "@/lib/catalogo";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  FileUp,
  ImageIcon,
  Info,
  UploadCloud,
  X,
} from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Formulario de creación de recurso.
 *
 * La lógica es exactamente la anterior: mismos campos, mismas
 * validaciones y el mismo POST a /api/creadores/productos. Lo
 * que cambia es la organización visual en tres bloques:
 * información, archivos y publicación.
 */
export default function NuevoRecursoForm({
  categories,
}: {
  categories: Category[];
}) {
  /*
    TIPO DE PUBLICACIÓN

    Es lo primero que se elige y lo que manda sobre el resto:
    fija la categoría, decide qué formatos caben y qué medidas
    se exigen. Antes había que deducirlo eligiendo una
    categoría a mano, y nada comprobaba que la pieza tuviera
    el tamaño que su sitio en la web necesita.
  */
  const [claveTipo, setClaveTipo] = useState<ClaveTipo | "">("");
  const [claveFormato, setClaveFormato] = useState("");

  const tipo: TipoPublicacion | null =
    TIPOS_PUBLICACION.find((t) => t.clave === claveTipo) ?? null;

  const formato =
    tipo?.formatos.find((f) => f.clave === claveFormato) ??
    tipo?.formatos[0] ??
    null;

  /*
    La categoría a la que irá el recurso, deducida del tipo.
    Solo para enseñarla: quien decide de verdad es el servidor.
  */
  const categoriaDestino =
    categories.find((c) => c.slug === tipo?.categoriaSlug) ?? null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [accessType, setAccessType] = useState("BOTH");
  const [color, setColor] = useState("");
  const [esPack, setEsPack] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [licenseType, setLicenseType] =
    useState<TipoLicencia>("PERSONAL");
  const [portada, setPortada] = useState<EstadoImagen | null>(null);
  const [preview, setPreview] = useState<EstadoImagen | null>(null);
  const [galeria, setGaleria] = useState<EstadoImagen[]>([]);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingFile(true);
    setError("");
    setMessage("");

    try {
      // Con Blob activo el archivo va directo al almacén
      // privado; en local sigue pasando por el endpoint.
      const subido = await subirArchivoDeProducto(file);

      setFileUrl(subido.fileUrl);
      setFileName(subido.fileName);

      setMessage("Archivo subido correctamente.");
    } catch (error) {
      console.error(error);

      setFileUrl("");
      setFileName("");

      setError(
        error instanceof Error
          ? error.message
          : "No se pudo subir el archivo."
      );
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!tipo || !esRecursoSuelto(tipo)) {
      setError("Elige primero qué tipo de publicación vas a crear.");
      return;
    }

    if (!fileUrl) {
      setError(
        "Debes subir el archivo del producto antes de guardarlo."
      );
      return;
    }

    /*
      La portada NO bloquea el borrador.

      Lo que sale de este formulario es siempre un borrador, y
      un borrador puede estar a medias: se apunta el nombre y
      el precio y la portada se sube después. Exigirla aquí
      obligaba a tenerlo todo listo antes de poder guardar
      nada.

      Quien la exige es enviar a revisión, y lo hace en el
      servidor: ahí sí tiene que estar, y con la medida de su
      categoría.
    */

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/creadores/productos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          /*
            El tipo manda. El servidor resuelve la categoría a
            partir de él y rechaza la petición si `categoryId`
            no es el que le corresponde, así que aquí no hay
            forma de guardar una combinación incoherente.
          */
          tipo: claveTipo,
          categoryId,
          price,
          accessType,
          color: color || null,
          esPack,
          tags,
          licenseType,
          coverUrl: portada?.url ?? "",
          previewUrl: preview?.url ?? "",
          fileUrl,
          /*
            El formato declarado viaja para que el servidor
            aplique las mismas medidas que se comprobaron
            aquí. No se guarda: la pieza queda identificada
            por su categoría y por el tamaño real de su
            portada, que es lo que leen Home y la tienda.
          */
          formato: formato?.clave ?? null,
          /* Galería inicial, en el orden en que se subió. */
          imagenes: galeria.map((imagen) => imagen.url),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo crear el recurso.");
        return;
      }

      setMessage("Recurso creado correctamente.");

      setName("");
      setDescription("");
      setCategoryId("");
      setPrice("");
      setAccessType("BOTH");
      setColor("");
      setEsPack(false);
      setPortada(null);
      setPreview(null);
      setGaleria([]);
      setFileUrl("");
      setFileName("");
      setClaveTipo("");
      setClaveFormato("");
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-5 lg:px-8 lg:pb-20 lg:pt-8">

      {/* ========== CABECERA ========== */}
      <header className="rk-fade-up">
        <Link
          href="/creadores/panel"
          className="rk-press-sm -ml-1 inline-flex min-h-[2.75rem] items-center gap-1 rounded-full pl-1 pr-2.5 text-[13px] font-medium text-ink/60 transition-colors duration-fast ease-rk hover:text-ink"
        >
          <ChevronLeft size={15} />
          Creator Studio
        </Link>

        <h1 className="rk-title mt-3 text-[2rem] sm:text-4xl">
          Nuevo recurso
        </h1>

        <p className="mt-3 max-w-xl text-[15px] leading-7 text-ink/60">
          Completa la información y sube el archivo para
          publicarlo en RCKTDMG.
        </p>
      </header>

      {/* ========== TIPO DE PUBLICACIÓN ========== */}
      <section className="rk-fade-up rk-enter-1 rk-card mt-8 p-5 sm:p-6">
        <p className="rk-eyebrow">Paso 1</p>

        <h2 className="rk-title mt-2 text-xl">Tipo de publicación</h2>

        <p className="mt-2 text-sm leading-6 text-ink/60">
          Decide dónde encaja la pieza y qué medidas se le piden.
        </p>

        <div className="rk-divider mt-4" />

        <div
          role="radiogroup"
          aria-label="Tipo de publicación"
          className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TIPOS_PUBLICACION.map((opcion) => {
            const elegido = opcion.clave === claveTipo;

            /*
              Colección y pack no se crean aquí: se arman con
              recursos YA publicados, así que su sitio es su
              propia pantalla. Se enseñan igualmente para que
              el creador sepa que existen, y llevan allí.
            */
            if (opcion.ruta) {
              return (
                <Link
                  key={opcion.clave}
                  href={opcion.ruta}
                  className="rk-press flex flex-col rounded-rk-md border border-line/12 p-3.5 text-left transition-colors duration-fast ease-rk hover:border-ink/35"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {opcion.nombre}
                    <ArrowUpRight
                      size={13}
                      aria-hidden
                      className="text-ink/45"
                    />
                  </span>

                  <span className="mt-1 text-xs leading-5 text-ink/60">
                    {opcion.descripcion}
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={opcion.clave}
                type="button"
                role="radio"
                aria-checked={elegido}
                onClick={() => {
                  setClaveTipo(opcion.clave);
                  setClaveFormato(opcion.formatos[0]?.clave ?? "");
                  setError("");

                  /*
                    La categoría la fija el tipo. Si no existe
                    en el catálogo se deja vacía y se avisa, en
                    vez de guardar la pieza en un sitio
                    cualquiera.
                  */
                  const destino = categories.find(
                    (c) => c.slug === opcion.categoriaSlug
                  );

                  setCategoryId(destino?.id ?? "");
                }}
                className={`rk-press flex flex-col rounded-rk-md border p-3.5 text-left transition-colors duration-fast ease-rk ${
                  elegido
                    ? "border-foreground bg-ink/[0.04]"
                    : "border-line/12 hover:border-ink/35"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {elegido && <Check size={13} aria-hidden />}
                  {opcion.nombre}
                </span>

                <span className="mt-1 text-xs leading-5 text-ink/60">
                  {opcion.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {/* FORMATO, solo si el tipo ofrece más de uno */}
        {tipo && tipo.formatos.length > 1 && (
          <div className="mt-5">
            <label htmlFor="formato" className="mb-2 block text-sm font-medium">
              Pieza del evento
            </label>

            <select
              id="formato"
              value={formato?.clave ?? ""}
              onChange={(e) => setClaveFormato(e.target.value)}
              className="rk-input w-full"
            >
              {tipo.formatos.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.nombre}
                </option>
              ))}
            </select>

            {formato?.medida && (
              <p className="mt-2 text-xs text-ink/60">
                Se exige {formato.medida.ancho} × {formato.medida.alto} px (
                {formato.medida.proporcion}): es el tamaño con el que se
                muestra a pantalla completa.
              </p>
            )}
          </div>
        )}

        {tipo && !categoryId && (
          <p
            role="alert"
            className="mt-4 rounded-rk-sm border border-warning/30 bg-warning/[0.08] px-3 py-2 text-xs leading-5"
          >
            No existe la categoría «{tipo.categoriaSlug}» en el catálogo.
            Elígela abajo a mano o pide al equipo que la cree.
          </p>
        )}
      </section>

      <form onSubmit={handleSubmit} className="mt-3 space-y-3">

        {/* ========== INFORMACIÓN ========== */}
        <section className="rk-fade-up rk-enter-2 rk-card p-5 sm:p-6">
          <p className="rk-eyebrow">Paso 2</p>

          <h2 className="rk-title mt-2 text-xl">Información</h2>

          <div className="rk-divider mt-4" />

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium"
              >
                Nombre
              </label>

              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Pack Social Media Pro"
                required
                className="rk-input w-full"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Descripción
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué incluye tu recurso y para quién es."
                required
                rows={5}
                className="rk-textarea w-full resize-y"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/*
                CATEGORÍA — SE MUESTRA, NO SE ELIGE

                Antes había aquí un desplegable con todas las
                categorías, y el creador tenía que volver a
                decidir algo que ya había decidido en el primer
                paso. Podía además elegir una que no
                correspondiera al tipo, y entonces el recurso
                acababa con las medidas de una categoría y la
                etiqueta de otra.

                Ahora la categoría se deduce del tipo y se
                enseña para que el creador sepa dónde va a
                quedar su recurso. El servidor la vuelve a
                deducir por su cuenta.
              */}
              <div>
                <span className="mb-2 block text-sm font-medium">
                  Categoría
                </span>

                <p className="rk-input flex w-full items-center justify-between gap-2 text-sm">
                  <span className={categoriaDestino ? "" : "text-ink/45"}>
                    {categoriaDestino?.name ??
                      "Elige antes un tipo de publicación"}
                  </span>

                  {categoriaDestino && (
                    <span className="text-xs text-ink/45">
                      la fija el tipo
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label
                  htmlFor="price"
                  className="mb-2 block text-sm font-medium"
                >
                  Precio
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink/60">
                    S/
                  </span>

                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    required
                    className="rk-input w-full !pl-10 tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="accessType"
                className="mb-2 block text-sm font-medium"
              >
                Tipo de acceso
              </label>

              <select
                id="accessType"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value)}
                className="rk-select w-full"
              >
                <option value="INDIVIDUAL">
                  Compra individual
                </option>

                <option value="PLAN">Incluido en planes</option>

                <option value="BOTH">Compra + planes</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="licenseType"
                className="mb-2 block text-sm font-medium"
              >
                Licencia de uso
              </label>
            
              <select
                id="licenseType"
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value as TipoLicencia)}
                className="rk-select w-full"
              >
                {TIPOS_LICENCIA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {LICENCIAS[tipo].etiqueta}
                  </option>
                ))}
              </select>
            
              <p className="mt-2 text-xs leading-5 text-ink/60">
                {LICENCIAS[licenseType].resumen} Se copia en la
                licencia de cada comprador, y cambiarla no afecta a
                quien ya compró.
              </p>
            </div>

            <div>
              <p className="mb-2 block text-sm font-medium">
                Etiquetas
                <span className="ml-1.5 font-normal text-ink/45">
                  (opcional)
                </span>
              </p>

              <TagsInput valor={tags} onChange={setTags} disabled={loading} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="color"
                  className="mb-2 block text-sm font-medium"
                >
                  Color predominante
                  <span className="ml-1.5 font-normal text-ink/45">
                    (opcional)
                  </span>
                </label>

                <select
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="rk-select w-full"
                >
                  <option value="">Sin especificar</option>

                  {COLORES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-ink/60">
                  Ayuda a que tu recurso aparezca al filtrar por
                  color en la tienda.
                </p>
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium">
                  Tipo de recurso
                </p>

                <label
                  htmlFor="esPack"
                  className="flex cursor-pointer items-start gap-3 rounded-rk-md border border-line/10 p-3.5 transition-colors duration-fast ease-rk hover:border-line/20"
                >
                  <input
                    id="esPack"
                    type="checkbox"
                    checked={esPack}
                    onChange={(e) => setEsPack(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--rk-foreground))]"
                  />

                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      Es un pack
                    </span>

                    <span className="mt-0.5 block text-xs leading-5 text-ink/60">
                      Marca esta casilla si el archivo reúne varios
                      recursos en un solo paquete.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/*
              El formato no se escribe a mano: se toma del archivo
              que subas en el paso 2.
            */}
          </div>
        </section>

        {/* ========== ARCHIVOS ========== */}
        <section className="rk-fade-up rk-enter-3 rk-card p-5 sm:p-6">
          <p className="rk-eyebrow">Paso 3</p>

          <h2 className="rk-title mt-2 text-xl">Archivos</h2>

          <div className="rk-divider mt-4" />

          <div className="mt-5 space-y-5">
            {/* ARCHIVO PRINCIPAL */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Archivo del recurso
              </p>

              <div className="rounded-rk-md border border-dashed border-line/20 bg-ink/[0.02] p-6 text-center transition-colors duration-normal ease-rk hover:border-ink/40">
                <span
                  aria-hidden
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-rk-sm bg-ink/[0.06] text-ink"
                >
                  <UploadCloud size={22} />
                </span>

                <input
                  id="product-file"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />

                <label
                  htmlFor="product-file"
                  className="rk-btn rk-btn-primary mt-4 cursor-pointer rk-btn-compact !px-5 !py-2.5 !text-sm"
                >
                  <FileUp size={15} />
                  {uploadingFile
                    ? "Subiendo archivo..."
                    : "Seleccionar archivo"}
                </label>

                <p className="mt-3 text-xs text-ink/60">
                  Máximo 100 MB
                </p>

                {fileName && (
                  <div className="rk-fade mx-auto mt-5 max-w-md rounded-rk-sm border border-success/25 bg-success/10 p-4 text-left">
                    <p className="rk-eyebrow !text-success/80">
                      Archivo cargado
                    </p>

                    <p className="mt-2 break-all text-sm font-medium">
                      {fileName}
                    </p>

                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 size={13} />
                      Listo para asociar al recurso
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/*
              PORTADA Y PREVIEW

              Se suben aquí, en el mismo paso que el archivo, y
              no pegando la URL de un sitio al que había que
              subirlas antes. La portada es la imagen con la
              que la pieza existe en la web; el preview es lo
              que se enseña protegido.
            */}
            <div className="grid gap-5 sm:grid-cols-2">
              <SubidorImagen
                id="portada"
                etiqueta="Portada"
                /*
                  Qué ficha de requisitos se enseña: la de la
                  story si pide 9:16, la del formato estándar
                  si pide 4:5, y la genérica si no exige
                  medida. Se compara por la medida, no por la
                  categoría: es la medida lo que cambia.
                */
                requisito={
                  formato?.medida === STORY
                    ? "story"
                    : formato?.medida
                      ? "corporativo"
                      : "portada"
                }
                medida={formato?.medida ?? null}
                valor={portada}
                alCambiar={setPortada}
                ayuda={
                  formato?.medida
                    ? `Exacta: ${formato.medida.ancho} × ${formato.medida.alto} px`
                    : "La imagen de la tarjeta y de la tienda"
                }
              />

              <SubidorImagen
                id="preview"
                etiqueta="Vista previa"
                requisito="preview"
                valor={preview}
                alCambiar={setPreview}
                ayuda="Se muestra con marca de agua. Opcional."
              />
            </div>

            {/*
              Sin portada el recurso se guarda igual, pero no
              puede salir del borrador. Se dice aquí, junto al
              campo, y no como un error al pulsar guardar.
            */}
            {!portada && (
              <p className="mt-3 text-[13px] leading-6 text-ink/55">
                Puedes guardar este recurso como borrador y completar
                la portada más adelante.{" "}
                {formato?.medida
                  ? `Para enviarlo a revisión necesitarás una portada de ${formato.medida.ancho} × ${formato.medida.alto} px (${formato.medida.proporcion}).`
                  : "Para enviarlo a revisión necesitarás una portada."}
              </p>
            )}

            {/* GALERÍA */}
            <div>
              <p className="mb-2 text-sm font-medium">Galería</p>

              {galeria.length > 0 && (
                <ul className="mb-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {galeria.map((imagen, indice) => (
                    <li
                      key={imagen.url}
                      className="rk-media relative aspect-square overflow-hidden rounded-rk-sm"
                    >
                      <Image
                        src={imagen.url}
                        alt={`Imagen ${indice + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                        unoptimized
                      />

                      {/* El número dice el orden en que se verán. */}
                      <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[10px] font-semibold tabular-nums text-white">
                        {indice + 1}
                      </span>

                      <div className="absolute bottom-1 right-1 flex gap-1">
                        {indice > 0 && (
                          <button
                            type="button"
                            aria-label={`Adelantar imagen ${indice + 1}`}
                            onClick={() =>
                              setGaleria((lista) => {
                                const copia = [...lista];

                                [copia[indice - 1], copia[indice]] = [
                                  copia[indice],
                                  copia[indice - 1],
                                ];

                                return copia;
                              })
                            }
                            className="rk-press grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                          >
                            <ChevronLeft size={12} aria-hidden />
                          </button>
                        )}

                        <button
                          type="button"
                          aria-label={`Quitar imagen ${indice + 1}`}
                          onClick={() =>
                            setGaleria((lista) =>
                              lista.filter((x) => x.url !== imagen.url)
                            )
                          }
                          className="rk-press grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <SubidorImagen
                id="galeria"
                etiqueta="Imagen de galería"
                requisito="galeria"
                valor={null}
                alCambiar={(imagen) => {
                  if (imagen) setGaleria((lista) => [...lista, imagen]);
                }}
                ayuda="Añade las que quieras, una a una."
              />
            </div>

            <p className="flex items-start gap-2 text-xs leading-5 text-ink/60">
              <ImageIcon size={14} className="mt-0.5 shrink-0" />
              Después de crearlo podrás seguir añadiendo y reordenando
              imágenes desde el propio recurso.
            </p>
          </div>
        </section>

        {/* ========== PUBLICACIÓN ========== */}
        <section className="rk-fade-up rk-enter-4 rk-card p-5 sm:p-6">
          <p className="rk-eyebrow">Paso 4</p>

          <h2 className="rk-title mt-2 text-xl">Publicación</h2>

          <div className="rk-divider mt-4" />

          {/* Comportamiento real del backend, no una promesa. */}
          <p className="mt-5 flex items-start gap-2.5 text-sm leading-6 text-ink/60">
            <Info size={16} className="mt-0.5 shrink-0 text-ink" />
            El recurso se guarda como borrador. Desde “Mis
            recursos” podrás enviarlo a revisión para que el
            equipo lo publique.
          </p>

          {error && (
            <div
              role="alert"
              className="rk-fade mt-5 rounded-rk-sm border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rk-fade mt-5 rounded-rk-sm border border-success/25 bg-success/10 px-4 py-3 text-sm text-success"
            >
              {message}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2.5">
            <Link
              href="/creadores/panel/recursos"
              className="rk-btn rk-btn-glass"
            >
              Mis recursos
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="rk-btn rk-btn-primary"
            >
              {loading ? "Guardando..." : "Guardar recurso"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
