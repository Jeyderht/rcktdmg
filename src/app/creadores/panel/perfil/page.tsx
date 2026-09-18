"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  creatorStatus: string | null;
  username: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  publicName: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  isVerified: boolean;
};

export default function CreatorProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [publicName, setPublicName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/creadores/perfil", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo cargar el perfil."
        );
      }

      const loadedProfile: Profile = data.profile;

      setProfile(loadedProfile);

      setName(loadedProfile.name || "");
      setUsername(loadedProfile.username || "");
      setPublicName(loadedProfile.publicName || "");
      setBio(loadedProfile.bio || "");
      setWebsiteUrl(loadedProfile.websiteUrl || "");
      setInstagramUrl(loadedProfile.instagramUrl || "");
      setFacebookUrl(loadedProfile.facebookUrl || "");
      setTiktokUrl(loadedProfile.tiktokUrl || "");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el perfil."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    type: "avatar" | "cover"
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");

    if (type === "avatar") {
      setUploadingAvatar(true);
    } else {
      setUploadingCover(true);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint =
        type === "avatar"
          ? "/api/uploads/creator-avatar"
          : "/api/uploads/creator-cover";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo subir la imagen."
        );
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              ...(type === "avatar"
                ? { avatarUrl: data.avatarUrl }
                : { coverUrl: data.coverUrl }),
            }
          : current
      );

      setMessage(
        type === "avatar"
          ? "Foto de perfil actualizada correctamente."
          : "Portada actualizada correctamente."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo subir la imagen."
      );
    } finally {
      if (type === "avatar") {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }

      event.target.value = "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/creadores/perfil",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            username,
            publicName,
            bio,
            websiteUrl,
            instagramUrl,
            facebookUrl,
            tiktokUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el perfil."
        );
      }

      setProfile(data.profile);

      setName(data.profile.name || "");
      setUsername(data.profile.username || "");
      setPublicName(data.profile.publicName || "");
      setBio(data.profile.bio || "");
      setWebsiteUrl(data.profile.websiteUrl || "");
      setInstagramUrl(data.profile.instagramUrl || "");
      setFacebookUrl(data.profile.facebookUrl || "");
      setTiktokUrl(data.profile.tiktokUrl || "");

      setMessage(
        "Perfil actualizado correctamente."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el perfil."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rk-card p-10">
            <p className="text-sm text-ink/50">
              Cargando perfil...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen px-4 sm:px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-danger/25 bg-danger/10 p-8">
            <p className="font-medium text-danger">
              {error || "No se pudo cargar el perfil."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    publicName.trim() ||
    name.trim() ||
    "Creador";

  const initials =
    displayName.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen px-4 sm:px-5 py-10">
      <div className="mx-auto max-w-5xl">

        {/* ENCABEZADO */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-ink/40">
              Creator Studio
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Mi perfil
            </h1>

            <p className="mt-3 text-ink/50">
              Administra la información pública de tu perfil de creador.
            </p>
          </div>

          <Link
            href="/creadores/panel"
            className="inline-flex w-fit rk-btn rk-btn-glass"
          >
            Volver al panel
          </Link>
        </div>

        {/* PERFIL / PORTADA */}

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-ink/[0.07] bg-surface shadow-sm">

          {/* PORTADA */}

          <div className="relative h-64 overflow-hidden bg-ink/[0.05] sm:h-72">

            {profile.coverUrl ? (
              <img
                src={profile.coverUrl}
                alt={`Portada de ${displayName}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-700 to-neutral-400">
                <span className="text-xs font-medium uppercase tracking-[0.35em] text-onprimary/60">
                  RCKTDMG CREATOR
                </span>
              </div>
            )}

            <div className="absolute right-5 top-5">
              <button
                type="button"
                onClick={() =>
                  coverInputRef.current?.click()
                }
                disabled={uploadingCover}
                className="rk-press rk-glass-on-image rounded-full px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingCover
                  ? "Subiendo..."
                  : profile.coverUrl
                  ? "Cambiar portada"
                  : "Subir portada"}
              </button>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) =>
                  handleImageUpload(event, "cover")
                }
              />
            </div>
          </div>

          {/* INFORMACIÓN SUPERIOR */}

          <div className="relative px-6 pb-7 sm:px-8">

            <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end">

              {/* FOTO */}

              <div className="relative shrink-0">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-[5px] border-surface bg-primary shadow-xl">

                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-semibold text-onprimary">
                      {initials}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    avatarInputRef.current?.click()
                  }
                  disabled={uploadingAvatar}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-ink/10 bg-surface px-4 py-2 text-xs font-medium shadow-sm transition hover:bg-primary hover:text-onprimary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingAvatar
                    ? "Subiendo..."
                    : profile.avatarUrl
                    ? "Cambiar foto"
                    : "Subir foto"}
                </button>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    handleImageUpload(event, "avatar")
                  }
                />
              </div>

              {/* DATOS */}

             <div className="min-w-0 flex-1 pb-1 pt-10 sm:pb-2 sm:pt-0">
                <div className="flex flex-wrap items-center gap-2">

                  <h2 className="text-2xl font-semibold">
                    {displayName}
                  </h2>

                  {profile.isVerified && (
                    <span
                      title="Creador verificado"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-onprimary"
                    >
                      ✓
                    </span>
                  )}

                </div>

                <p className="mt-1 text-sm text-ink/45">
                  @{profile.username || "tuusuario"}
                </p>

                {bio ? (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">
                    {bio}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-ink/40">
                    Completa tu biografía para presentar tu perfil a los clientes.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* MENSAJES */}

        {(message || error) && (
          <div className="mt-6">
            {message && (
              <div className="rounded-2xl border border-success/25 bg-success/12 px-5 py-4 text-sm text-success">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-danger/25 bg-danger/10 px-5 py-4 text-sm text-danger">
                {error}
              </div>
            )}
          </div>
        )}

        {/* INFORMACIÓN DEL PERFIL */}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-6"
        >

          <section className="rounded-[2rem] border border-ink/[0.07] bg-surface p-7 shadow-sm sm:p-8">

            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
              Identidad
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Información del perfil
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">

              {/* NOMBRE */}

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
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                  placeholder="Tu nombre"
                />
              </div>

              {/* USERNAME */}

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium"
                >
                  Nombre de usuario
                </label>

                <div className="flex items-center rounded-2xl border border-ink/10 bg-ink/[0.04]">
                  <span className="pl-4 text-ink/35">
                    @
                  </span>

                  <input
                    id="username"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                          .replace(/^@/, "")
                          .toLowerCase()
                      )
                    }
                    className="w-full bg-transparent px-2 py-3 outline-none"
                    placeholder="tuusuario"
                  />
                </div>

                <p className="mt-2 text-xs text-ink/40">
                  Será tu identificador público en RCKTDMG.
                </p>
              </div>

              {/* NOMBRE PÚBLICO */}

              <div>
                <label
                  htmlFor="publicName"
                  className="mb-2 block text-sm font-medium"
                >
                  Nombre público
                </label>

                <input
                  id="publicName"
                  value={publicName}
                  onChange={(event) =>
                    setPublicName(event.target.value)
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                  placeholder="Nombre que verán los clientes"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Correo electrónico
                </label>

                <input
                  id="email"
                  value={profile.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-2xl border border-ink/10 bg-ink/[0.05] px-4 py-3 text-ink/45 outline-none"
                />

                <p className="mt-2 text-xs text-ink/40">
                  El correo se administra desde tu cuenta.
                </p>
              </div>

            </div>

            {/* BIO */}

            <div className="mt-6">

              <label
                htmlFor="bio"
                className="mb-2 block text-sm font-medium"
              >
                Biografía
              </label>

              <textarea
                id="bio"
                value={bio}
                maxLength={500}
                onChange={(event) =>
                  setBio(event.target.value)
                }
                rows={6}
                className="w-full resize-y rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                placeholder="Cuéntale a los clientes quién eres y qué tipo de recursos creas..."
              />

              <div className="mt-2 text-right text-xs text-ink/40">
                {bio.length}/500
              </div>

            </div>

          </section>

          {/* REDES */}

          <section className="rounded-[2rem] border border-ink/[0.07] bg-surface p-7 shadow-sm sm:p-8">

            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
              Presencia digital
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Redes y enlaces
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">

              <div>
                <label
                  htmlFor="websiteUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  Sitio web
                </label>

                <input
                  id="websiteUrl"
                  value={websiteUrl}
                  onChange={(event) =>
                    setWebsiteUrl(event.target.value)
                  }
                  placeholder="https://tusitio.com"
                  className="w-full rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                />
              </div>

              <div>
                <label
                  htmlFor="instagramUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  Instagram
                </label>

                <input
                  id="instagramUrl"
                  value={instagramUrl}
                  onChange={(event) =>
                    setInstagramUrl(event.target.value)
                  }
                  placeholder="https://instagram.com/..."
                  className="w-full rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                />
              </div>

              <div>
                <label
                  htmlFor="facebookUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  Facebook
                </label>

                <input
                  id="facebookUrl"
                  value={facebookUrl}
                  onChange={(event) =>
                    setFacebookUrl(event.target.value)
                  }
                  placeholder="https://facebook.com/..."
                  className="w-full rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                />
              </div>

              <div>
                <label
                  htmlFor="tiktokUrl"
                  className="mb-2 block text-sm font-medium"
                >
                  TikTok
                </label>

                <input
                  id="tiktokUrl"
                  value={tiktokUrl}
                  onChange={(event) =>
                    setTiktokUrl(event.target.value)
                  }
                  placeholder="https://tiktok.com/@..."
                  className="w-full rounded-2xl border border-ink/10 bg-ink/[0.04] px-4 py-3 outline-none transition focus:border-accent/45"
                />
              </div>

            </div>

          </section>

          {/* VERIFICACIÓN */}

          <section className="rounded-[2rem] border border-ink/[0.07] bg-surface p-7 shadow-sm sm:p-8">

            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
              Estado de creador
            </p>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-lg font-semibold">
                  Verificación
                </h2>

                <p className="mt-1 text-sm text-ink/50">
                  {profile.isVerified
                    ? "Tu perfil está verificado."
                    : "Tu perfil todavía no está verificado."}
                </p>
              </div>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                  profile.isVerified
                    ? "bg-primary text-onprimary"
                    : "bg-ink/[0.05] text-ink/50"
                }`}
              >
                <span>
                  {profile.isVerified ? "✓" : "○"}
                </span>

                {profile.isVerified
                  ? "Creador verificado"
                  : "No verificado"}
              </div>

            </div>

            <p className="mt-5 text-xs leading-5 text-ink/40">
              La verificación es administrada por RCKTDMG y no puede modificarse desde este formulario.
            </p>

          </section>

          {/* BOTONES */}

          <div className="flex flex-wrap items-center gap-3 pb-10">

            <button
              type="submit"
              disabled={
                saving ||
                uploadingAvatar ||
                uploadingCover
              }
              className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-onprimary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>

            <Link
              href="/creadores/panel"
              className="rk-btn rk-btn-glass"
            >
              Cancelar
            </Link>

          </div>

        </form>

      </div>
    </main>
  );
}