import type { $Enums } from "@prisma/client";

/**
 * Solicitudes para ser creador: parte compartida con el
 * navegador.
 *
 * No toca la base de datos. Aquí viven las reglas de forma
 * —qué es un username válido, qué largo admite la biografía,
 * qué cuenta como portafolio— para que el formulario y el
 * servidor apliquen exactamente las mismas. La validación que
 * manda es siempre la del servidor; esto solo evita que el
 * usuario descubra un error después de enviar.
 */

export type EstadoSolicitud = $Enums.CreatorApplicationStatus;

export const ESTADOS_SOLICITUD = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const satisfies readonly EstadoSolicitud[];

type Olvidados = Exclude<
  EstadoSolicitud,
  (typeof ESTADOS_SOLICITUD)[number]
>;

const _sinOlvidos: Olvidados extends never ? true : never = true;

void _sinOlvidos;

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export const LARGO_BIO_MINIMO = 40;
export const LARGO_BIO_MAXIMO = 600;
export const LARGO_ESPECIALIDAD = 120;
export const LARGO_NOMBRE_PUBLICO = 60;
export const LARGO_MOTIVO_RECHAZO = 500;
export const MAXIMO_CATEGORIAS_SOLICITUD = 5;

export const LARGO_EXPERIENCIA = 800;
export const LARGO_DESCRIPCION_PORTAFOLIO = 600;

/**
 * Cuántos trabajos se aceptan en un portafolio.
 *
 * Doce es suficiente para juzgar a alguien y poco para que la
 * revisión se vuelva una tarea eterna. Quien tenga más puede
 * dejar además el enlace a su portafolio completo.
 */
export const MAXIMO_TRABAJOS_PORTAFOLIO = 12;
export const LARGO_TITULO_TRABAJO = 80;
export const LARGO_DESCRIPCION_TRABAJO = 300;

/**
 * Nombre de usuario.
 *
 * Minúsculas, números, punto, guion y guion bajo. Es lo que
 * acaba en la URL pública `/creadores/[username]`, así que no
 * puede llevar nada que haya que escapar.
 */
export const USERNAME_PATRON = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const LARGO_USERNAME_MINIMO = 3;
export const LARGO_USERNAME_MAXIMO = 30;

/**
 * Nombres reservados.
 *
 * Son rutas que ya existen bajo /creadores o palabras que
 * harían pasar a alguien por la plataforma.
 */
export const USERNAMES_RESERVADOS = [
  "panel",
  "productos",
  "admin",
  "administrador",
  "rcktdmg",
  "soporte",
  "ayuda",
  "api",
  "null",
  "undefined",
] as const;

export function normalizarUsername(valor: unknown): string {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
}

export function errorDeUsername(valor: string): string | null {
  if (!valor) return "Elige un nombre de usuario.";

  if (valor.length < LARGO_USERNAME_MINIMO) {
    return `El nombre de usuario necesita al menos ${LARGO_USERNAME_MINIMO} caracteres.`;
  }

  if (valor.length > LARGO_USERNAME_MAXIMO) {
    return `El nombre de usuario no puede pasar de ${LARGO_USERNAME_MAXIMO} caracteres.`;
  }

  if (!USERNAME_PATRON.test(valor)) {
    return "Usa solo minúsculas, números, punto, guion o guion bajo, empezando por letra o número.";
  }

  if ((USERNAMES_RESERVADOS as readonly string[]).includes(valor)) {
    return "Ese nombre de usuario está reservado.";
  }

  return null;
}

/**
 * URL pública válida.
 *
 * Se exige http o https de forma explícita: un `javascript:`
 * en un enlace de perfil es un agujero, y un dominio suelto
 * sin esquema no se puede enlazar sin adivinar.
 */
export function esUrlValida(valor: string): boolean {
  try {
    const url = new URL(valor);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizarUrl(valor: unknown): string | null {
  const limpio = String(valor ?? "").trim();

  if (!limpio) return null;

  return esUrlValida(limpio) ? limpio : null;
}

/** Datos del formulario, tal y como viajan al servidor. */
/** Un trabajo del portafolio, tal y como viaja. */
export type TrabajoPortafolio = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
};

export type DatosSolicitud = {
  publicName: string;
  username: string;
  bio: string;
  specialty: string;
  portfolioUrl: string;
  portfolioFileUrl: string;
  categoryIds: string[];
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
};

/** Solicitud tal y como viaja de la API al navegador. */
export type SolicitudVista = {
  id: string;
  estado: EstadoSolicitud;
  publicName: string;
  username: string;
  bio: string;
  specialty: string;
  /** Enlace de portafolio, si lo dio. Público para administración. */
  portfolioUrl: string | null;
  /** Qué es el portafolio, con las palabras del candidato. */
  portfolioDescription: string | null;
  /** Los trabajos presentados, en su orden. */
  trabajos: TrabajoPortafolio[];
  /**
   * true si adjuntó un archivo. La URL NO viaja: vive en el
   * almacén privado y solo se abre desde administración.
   */
  tieneArchivo: boolean;
  experience: string | null;
  /** Cómo quiere verse en su perfil. Son imágenes públicas. */
  avatarUrl: string | null;
  coverUrl: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  otherUrl: string | null;
  categorias: { id: string; name: string; slug: string }[];
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  solicitante: {
    id: string;
    nombre: string;
    email: string;
    avatarUrl: string | null;
  };
};
