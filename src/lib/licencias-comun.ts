import type { $Enums } from "@prisma/client";

/**
 * Licencias: parte compartida con el navegador.
 *
 * No toca la base de datos: lo importan los componentes de
 * cliente. Las funciones que leen o escriben están en
 * src/lib/licencias.ts, que reexporta todo esto.
 */

export type TipoLicencia = $Enums.LicenseType;
export type EstadoLicencia = $Enums.LicenseStatus;

/**
 * Condiciones de cada tipo.
 *
 * Es el texto que se copia en la licencia al otorgarla. Está
 * redactado en términos de lo que la plataforma puede
 * sostener hoy; NO es un contrato revisado por un abogado y
 * conviene que alguien lo valide antes de vender bajo él.
 */
export const LICENCIAS: Record<
  TipoLicencia,
  { etiqueta: string; resumen: string; condiciones: string[] }
> = {
  PERSONAL: {
    etiqueta: "Licencia personal",
    resumen: "Uso personal, sin explotación comercial.",
    condiciones: [
      "Puedes usar el recurso en proyectos propios sin ánimo de lucro.",
      "Puedes modificarlo y adaptarlo para ese uso.",
      "No puedes revenderlo, cederlo ni redistribuirlo, ni modificado.",
      "No puedes usarlo en trabajos por encargo ni en productos que vendas.",
    ],
  },
  COMMERCIAL: {
    etiqueta: "Licencia comercial",
    resumen: "Uso comercial por cuenta propia o de un cliente.",
    condiciones: [
      "Puedes usar el recurso en proyectos comerciales propios o de clientes.",
      "Puedes modificarlo y adaptarlo.",
      "No puedes revenderlo ni redistribuirlo como recurso, ni modificado.",
      "La licencia ampara a una sola persona o empresa.",
    ],
  },
  ENTERPRISE: {
    etiqueta: "Licencia empresarial",
    resumen: "Uso comercial ampliado, incluido el uso corporativo.",
    condiciones: [
      "Puedes usar el recurso en proyectos comerciales sin límite de tiradas.",
      "Puedes compartirlo dentro de tu organización con fines de trabajo.",
      "Puedes modificarlo y adaptarlo.",
      "No puedes revenderlo ni redistribuirlo como recurso, ni modificado.",
    ],
  },
};

export const TIPOS_LICENCIA = [
  "PERSONAL",
  "COMMERCIAL",
  "ENTERPRISE",
] as const satisfies readonly TipoLicencia[];

/* Si el enum gana un tipo que no está arriba, esto no compila. */
type Olvidados = Exclude<
  TipoLicencia,
  (typeof TIPOS_LICENCIA)[number]
>;

const _sinOlvidos: Olvidados extends never ? true : never = true;

void _sinOlvidos;

export function esTipoLicencia(
  valor: unknown
): valor is TipoLicencia {
  return (
    typeof valor === "string" &&
    (TIPOS_LICENCIA as readonly string[]).includes(valor)
  );
}

/** Texto completo que se guarda en la licencia. */
export function condicionesDe(tipo: TipoLicencia): string {
  const def = LICENCIAS[tipo];

  return [def.etiqueta, "", ...def.condiciones.map((c) => `· ${c}`)].join(
    "\n"
  );
}

/** Licencia tal y como viaja de la API al navegador. */
export type LicenciaVista = {
  id: string;
  code: string;
  type: TipoLicencia;
  status: EstadoLicencia;
  terms: string | null;
  grantedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  producto: {
    name: string;
    slug: string;
    coverUrl: string | null;
  };
  pedido: {
    id: string;
    /** Importe de ESTA línea, no del pedido entero. */
    precio: number;
  };
};
