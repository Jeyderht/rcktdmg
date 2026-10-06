import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Llamada a convertirse en creador.
 *
 * Solo se enseña a quien todavía no publica. A un creador o a
 * un administrador proponerle "empieza a vender" sería ruido,
 * así que la portada no la pinta para ellos.
 *
 * El texto describe lo que se puede hacer, sin cifras de
 * ventas, sin ingresos prometidos y sin ventajas inventadas:
 * no tenemos ese dato y afirmarlo sería publicidad engañosa.
 */
export default function ConvierteteEnCreador({
  rol,
}: {
  /** Rol de la sesión, o null si no hay sesión iniciada. */
  rol: string | null;
}) {
  if (rol === "CREATOR" || rol === "ADMIN") return null;

  return (
    <section className="border-t border-line/10">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-5 lg:px-8 lg:py-20">
        <div className="rk-footer-cta rk-fade-up gap-6 p-7 sm:p-10 lg:gap-10">
          <div className="max-w-2xl">
            <p className="rk-footer-cta-kicker">Publica en RCKTDMG</p>

            <h2 className="rk-footer-cta-title" style={{ maxWidth: "none" }}>
              Conviértete en creador
            </h2>

            <p className="mt-3 text-[15px] leading-7" style={{ opacity: 0.7 }}>
              Convierte tus diseños en recursos y véndelos en RCKTDMG.
              Envías tu portafolio, lo revisamos y, si encaja, abrimos
              tu perfil público con tu nombre y tus enlaces.
            </p>
          </div>

          <Link
            href="/creadores/unete"
            className="rk-btn rk-btn-ink shrink-0"
          >
            Enviar mi solicitud
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
