import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";

import { conDestino } from "@/lib/redireccion";
import type { BloqueoTarjeta } from "@/lib/vista-recurso";

/**
 * La galería de la ficha cuando el recurso es solo para registrados
 * y lo mira un visitante sin sesión.
 *
 * Ocupa el mismo sitio y con el mismo marco que ProductGallery
 * (misma caja y misma proporción), así que la página no salta entre
 * un estado y otro. No hay imagen real: el servidor no la envía. Se
 * ve la miniatura desenfocada o, sin ella, el fondo neutro del
 * marco; encima, el candado, el aviso y los dos accesos, que
 * vuelven a esta ficha al terminar.
 */
export default function FichaBloqueada({
  ficha,
  proporcion,
  bloqueo,
}: {
  /** Ruta de esta ficha, para volver a ella tras entrar o registrarse. */
  ficha: string;
  proporcion: string | null;
  bloqueo: BloqueoTarjeta;
}) {
  return (
    <div className="rk-card mx-auto w-full max-w-[16rem] overflow-hidden rounded-rk-xl p-2 sm:max-w-sm lg:max-w-none">
      <div
        className="rk-media relative overflow-hidden rounded-rk-lg"
        style={{ aspectRatio: proporcion ?? "1080 / 1350" }}
      >
        {bloqueo.miniatura && (
          <Image
            src={bloqueo.miniatura}
            alt=""
            aria-hidden
            fill
            unoptimized
            className="object-cover"
          />
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="rk-glass-on-image inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium">
            <Lock size={13} aria-hidden />
            Vista previa para miembros
          </p>

          <div className="flex w-full max-w-[13rem] flex-col gap-2">
            <Link
              href={conDestino("/registro", ficha)}
              className="rk-btn rk-btn-primary"
            >
              Regístrate gratis
            </Link>

            {/*
              Vidrio sobre imagen (§56): sobre la miniatura, el botón de
              línea dejaba el texto claro sobre fondo claro en oscuro.
            */}
            <Link
              href={conDestino("/login", ficha)}
              className="rk-btn rk-press rk-glass-on-image"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
