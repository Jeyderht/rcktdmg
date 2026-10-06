"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";

import EditorPortafolio from "@/components/EditorPortafolio";
import SubidorImagen, { type EstadoImagen } from "@/components/SubidorImagen";
import {
  LARGO_BIO_MAXIMO,
  LARGO_BIO_MINIMO,
  LARGO_DESCRIPCION_PORTAFOLIO,
  LARGO_ESPECIALIDAD,
  LARGO_EXPERIENCIA,
  LARGO_NOMBRE_PUBLICO,
  MAXIMO_CATEGORIAS_SOLICITUD,
  errorDeUsername,
  normalizarUsername,
  type SolicitudVista,
  type TrabajoPortafolio,
} from "@/lib/solicitudes-comun";

type Categoria = { id: string; name: string; slug: string };

/**
 * Formulario para pedir ser creador.
 *
 * Valida lo mismo que el servidor, con las mismas constantes,
 * para avisar antes de enviar. La validación que manda sigue
 * siendo la del servidor: esto solo evita un viaje perdido.
 *
 * El portafolio es obligatorio y admite dos formas —enlace o
 * archivo—, porque no todo el mundo tiene web y no todo el
 * mundo quiere subir un PDF.
 */
export default function SolicitudForm({
  categorias,
  solicitudPrevia,
}: {
  categorias: Categoria[];
  solicitudPrevia: SolicitudVista | null;
}) {
  const router = useRouter();

  const rechazada = solicitudPrevia?.estado === "REJECTED";

  const [publicName, setPublicName] = useState(
    rechazada ? solicitudPrevia.publicName : ""
  );
  const [username, setUsername] = useState(
    rechazada ? solicitudPrevia.username : ""
  );
  const [bio, setBio] = useState(rechazada ? solicitudPrevia.bio : "");
  const [specialty, setSpecialty] = useState(
    rechazada ? solicitudPrevia.specialty : ""
  );
  const [portfolioUrl, setPortfolioUrl] = useState(
    rechazada ? (solicitudPrevia.portfolioUrl ?? "") : ""
  );
  const [portfolioFileUrl, setPortfolioFileUrl] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const [elegidas, setElegidas] = useState<string[]>(
    rechazada ? solicitudPrevia.categorias.map((c) => c.id) : []
  );

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [otherUrl, setOtherUrl] = useState("");

  const [experience, setExperience] = useState(
    rechazada ? (solicitudPrevia.experience ?? "") : ""
  );

  /*
    Cómo quiere verse en su perfil. Se piden AQUÍ y no después
    de aprobar: administración juzga la candidatura entera, y
    un perfil sin cara no se puede valorar.
  */
  const [avatar, setAvatar] = useState<EstadoImagen | null>(null);
  const [portadaPerfil, setPortadaPerfil] = useState<EstadoImagen | null>(null);

  const [portfolioDescription, setPortfolioDescription] = useState(
    rechazada ? (solicitudPrevia.portfolioDescription ?? "") : ""
  );

  /*
    Al corregir una solicitud rechazada se recuperan los
    trabajos que ya había presentado: rehacerlos desde cero
    sería castigar dos veces por el mismo motivo.
  */
  const [trabajos, setTrabajos] = useState<TrabajoPortafolio[]>(
    rechazada ? solicitudPrevia.trabajos : []
  );

  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  const errorUsername = username ? errorDeUsername(username) : null;

  function alternarCategoria(id: string) {
    setElegidas((antes) =>
      antes.includes(id)
        ? antes.filter((x) => x !== id)
        : antes.length >= MAXIMO_CATEGORIAS_SOLICITUD
          ? antes
          : [...antes, id]
    );
  }

  async function subirPortafolio(archivo: File) {
    setSubiendo(true);
    setError("");

    try {
      const datos = new FormData();

      datos.append("file", archivo);

      const respuesta = await fetch("/api/uploads/portafolio", {
        method: "POST",
        body: datos,
      });

      const json = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(json.error || "No se pudo subir el archivo.");
      }

      setPortfolioFileUrl(json.portfolioFileUrl);
      setNombreArchivo(json.fileName);
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo subir."
      );
    } finally {
      setSubiendo(false);
    }
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    if (enviando) return;

    setError("");

    if (!portfolioUrl.trim() && !portfolioFileUrl && trabajos.length === 0) {
      setError(
        "Añade tu portafolio: sube al menos un trabajo, o deja un enlace o un archivo."
      );
      return;
    }

    /* Se avisa antes de enviar de lo que el servidor va a rechazar. */
    const incompleto = trabajos.findIndex(
      (t) => !t.title.trim() || (!t.imageUrl && !t.linkUrl)
    );

    if (incompleto >= 0) {
      setError(
        `El trabajo ${incompleto + 1} necesita un título y una imagen o un enlace.`
      );
      return;
    }

    setEnviando(true);

    try {
      const respuesta = await fetch("/api/creadores/solicitud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicName,
          username: normalizarUsername(username),
          bio,
          specialty,
          portfolioUrl: portfolioUrl.trim(),
          portfolioFileUrl,
          categoryIds: elegidas,
          portfolioDescription: portfolioDescription.trim(),
          portfolioItems: trabajos,
          experience: experience.trim(),
          avatarUrl: avatar?.url ?? "",
          coverUrl: portadaPerfil?.url ?? "",
          websiteUrl: websiteUrl.trim(),
          instagramUrl: instagramUrl.trim(),
          facebookUrl: facebookUrl.trim(),
          tiktokUrl: tiktokUrl.trim(),
          otherUrl: otherUrl.trim(),
        }),
      });

      const json = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(json.error || "No se pudo enviar la solicitud.");
      }

      setEnviada(true);

      router.refresh();
    } catch (fallo) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo enviar."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <div className="rk-tile rounded-rk-lg p-8 text-center">
        <CheckCircle2
          size={32}
          aria-hidden
          className="mx-auto text-ink/50"
        />

        <h2 className="rk-title mt-4 text-xl">Solicitud enviada</h2>

        <p className="mx-auto mt-2 max-w-md text-[15px] leading-7 text-ink/60">
          La revisaremos y te avisaremos por notificación. Mientras
          tanto tu cuenta sigue funcionando igual.
        </p>

        <Link href="/" className="rk-btn rk-btn-line mt-6">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-7">
      {rechazada && solicitudPrevia?.rejectionReason && (
        <div className="rk-upload-error rk-card">
          <p className="text-sm font-medium">
            Tu solicitud anterior no fue aprobada
          </p>

          <p className="mt-1 text-[13px] leading-6 text-ink/70">
            {solicitudPrevia.rejectionReason}
          </p>

          <p className="mt-2 text-[13px] text-ink/55">
            Hemos rellenado el formulario con lo que enviaste para que
            solo tengas que corregir lo necesario.
          </p>
        </div>
      )}

      {/* ══════════ PERFIL ══════════ */}
      <fieldset className="space-y-4">
        <legend className="rk-eyebrow">Tu perfil</legend>

        <div>
          <label htmlFor="publicName" className="rk-label">
            Nombre público
          </label>

          <input
            id="publicName"
            value={publicName}
            onChange={(e) => setPublicName(e.target.value)}
            maxLength={LARGO_NOMBRE_PUBLICO}
            required
            placeholder="Cómo quieres aparecer en la tienda"
            className="rk-input mt-1.5 w-full"
          />
        </div>

        <div>
          <label htmlFor="username" className="rk-label">
            Nombre de usuario
          </label>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm text-ink/45">rcktdmg.com/creadores/</span>

            <input
              id="username"
              value={username}
              onChange={(e) =>
                setUsername(normalizarUsername(e.target.value))
              }
              required
              placeholder="tunombre"
              aria-invalid={Boolean(errorUsername)}
              className="rk-input w-full flex-1"
            />
          </div>

          {errorUsername && (
            <p className="rk-upload-error mt-1.5">{errorUsername}</p>
          )}
        </div>

        <div>
          <label htmlFor="specialty" className="rk-label">
            En qué te especializas
          </label>

          <input
            id="specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            maxLength={LARGO_ESPECIALIDAD}
            required
            placeholder="Flyers de eventos, identidad corporativa…"
            className="rk-input mt-1.5 w-full"
          />
        </div>

        <div>
          <label htmlFor="bio" className="rk-label">
            Biografía
          </label>

          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={LARGO_BIO_MAXIMO}
            required
            rows={4}
            placeholder="Quién eres y qué haces."
            className="rk-textarea mt-1.5 w-full"
          />

          <p className="mt-1.5 text-[13px] tabular-nums text-ink/50">
            {bio.length} / {LARGO_BIO_MAXIMO}
            {bio.length < LARGO_BIO_MINIMO &&
              ` · mínimo ${LARGO_BIO_MINIMO}`}
          </p>
        </div>
      </fieldset>

      {/* ══════════ CATEGORÍAS ══════════ */}
      <fieldset>
        <legend className="rk-eyebrow">
          Categorías en las que publicarás
        </legend>

        <p className="mt-1.5 text-[13px] text-ink/55">
          Elige hasta {MAXIMO_CATEGORIAS_SOLICITUD}. Son las del
          catálogo: no se pueden crear nuevas.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {categorias.map((categoria) => {
            const elegida = elegidas.includes(categoria.id);

            return (
              <button
                key={categoria.id}
                type="button"
                onClick={() => alternarCategoria(categoria.id)}
                aria-pressed={elegida}
                className={`rk-press-sm inline-flex min-h-[2.75rem] items-center rounded-full border px-4 text-sm transition-colors duration-fast ${
                  elegida
                    ? "border-ink bg-ink text-surface"
                    : "border-line/15 hover:border-ink/40"
                }`}
              >
                {categoria.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ══════════ PORTAFOLIO ══════════ */}
      <fieldset className="space-y-4">
        <legend className="rk-eyebrow">Portafolio (obligatorio)</legend>

        <p className="text-[13px] leading-6 text-ink/55">
          Necesitamos ver tu trabajo para revisar la solicitud. Vale
          cualquiera de las tres formas: subir tus piezas, dejar un
          enlace o adjuntar un archivo.
        </p>

        <EditorPortafolio trabajos={trabajos} alCambiar={setTrabajos} />

        <div>
          <label
            htmlFor="portfolioDescription"
            className="rk-label"
          >
            Sobre tu portafolio
          </label>

          <textarea
            id="portfolioDescription"
            value={portfolioDescription}
            onChange={(e) => setPortfolioDescription(e.target.value)}
            maxLength={LARGO_DESCRIPCION_PORTAFOLIO}
            rows={3}
            placeholder="Qué tipo de trabajo haces y qué vas a publicar en RCKTDMG."
            className="rk-textarea mt-1.5 w-full"
          />

          <p className="mt-1.5 text-[13px] text-ink/50">
            Opcional. Ayuda a entender lo que estamos viendo.
          </p>
        </div>

        <div className="rk-divider" />

        <div>
          <label htmlFor="portfolioUrl" className="rk-label">
            Enlace
          </label>

          <input
            id="portfolioUrl"
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://behance.net/tuperfil"
            className="rk-input mt-1.5 w-full"
          />

          <p className="mt-1.5 text-[13px] text-ink/50">
            Behance, Dribbble, tu web o tu Instagram profesional.
          </p>
        </div>

        <div>
          <span className="text-sm font-medium">Archivo</span>

          <label className="rk-upload mt-1.5 justify-center">
            {subiendo ? (
              <>
                <Loader2 size={15} aria-hidden className="animate-spin" />
                Subiendo…
              </>
            ) : nombreArchivo ? (
              <>
                <CheckCircle2 size={15} aria-hidden />
                {nombreArchivo}
              </>
            ) : (
              <>
                <Upload size={15} aria-hidden />
                Subir PDF, ZIP o imagen (máx. 15 MB)
              </>
            )}

            <input
              type="file"
              accept=".pdf,.zip,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={(e) => {
                const archivo = e.target.files?.[0];

                if (archivo) void subirPortafolio(archivo);
              }}
            />
          </label>

          <p className="mt-1.5 text-[13px] text-ink/50">
            El archivo es privado: solo lo ve quien revisa tu solicitud.
          </p>
        </div>
      </fieldset>

      {/* ══════════ TU PERFIL ══════════ */}
      <fieldset className="space-y-4">
        <legend className="rk-eyebrow">Tu perfil</legend>

        <p className="text-[13px] leading-6 text-ink/55">
          Así te verá la gente si aprobamos tu solicitud. Puedes
          cambiarlo después desde tu panel.
        </p>

        <div>
          <label htmlFor="experience" className="rk-label">
            Experiencia
          </label>

          <textarea
            id="experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            maxLength={LARGO_EXPERIENCIA}
            rows={3}
            placeholder="Años trabajando, clientes, estudios, premios…"
            className="rk-textarea mt-1.5 w-full"
          />

          <p className="mt-1.5 text-[13px] text-ink/50">
            Opcional. Si estás empezando, cuéntalo igual.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SubidorImagen
            id="avatar-solicitud"
            etiqueta="Foto de perfil"
            requisito="avatar"
            valor={avatar}
            alCambiar={setAvatar}
            ayuda="Cuadrada. Se recorta en círculo."
          />

          <SubidorImagen
            id="portada-solicitud"
            etiqueta="Portada de tu perfil"
            requisito="portada-perfil"
            valor={portadaPerfil}
            alCambiar={setPortadaPerfil}
            ayuda="Apaisada. Encabeza tu perfil público."
          />
        </div>
      </fieldset>

      {/* ══════════ REDES ══════════ */}
      <fieldset className="space-y-4">
        <legend className="rk-eyebrow">Enlaces (opcional)</legend>

        {(
          [
            ["websiteUrl", "Sitio web", websiteUrl, setWebsiteUrl],
            ["instagramUrl", "Instagram", instagramUrl, setInstagramUrl],
            ["facebookUrl", "Facebook", facebookUrl, setFacebookUrl],
            ["tiktokUrl", "TikTok", tiktokUrl, setTiktokUrl],
            ["otherUrl", "Otra red", otherUrl, setOtherUrl],
          ] as const
        ).map(([id, etiqueta, valor, asignar]) => (
          <div key={id}>
            <label htmlFor={id} className="text-sm font-medium">
              {etiqueta}
            </label>

            <input
              id={id}
              type="url"
              value={valor}
              onChange={(e) => asignar(e.target.value)}
              placeholder="https://…"
              className="rk-input mt-1.5 w-full"
            />
          </div>
        ))}
      </fieldset>

      {error && (
        <p role="alert" className="rk-upload-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={enviando || subiendo}
          className="rk-btn rk-btn-primary disabled:opacity-60"
        >
          {enviando ? (
            <>
              <Loader2 size={16} aria-hidden className="animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar solicitud"
          )}
        </button>

        <p className="text-[13px] leading-6 text-ink/55">
          Enviarla no te convierte en creador: la revisamos primero.
        </p>
      </div>
    </form>
  );
}
