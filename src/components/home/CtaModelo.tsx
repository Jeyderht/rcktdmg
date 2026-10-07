import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, ShieldCheck, Tag } from "lucide-react";

/**
 * CTA final del inicio, estilo «hero con modelo».
 *
 * Usa los componentes del sistema (rk-card, rk-kicker,
 * rk-display, rk-btn, rk-card-glass, rk-chip) para que siga
 * los temas claro y oscuro. Solo el círculo de marca, la foto
 * recortada y la colocación de las tarjetas tienen CSS propio
 * (sección AV de globals.css).
 */
export default function CtaModelo() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-5 lg:px-8 lg:pb-24">
      <div className="rk-card rk-fade-up relative overflow-hidden rounded-rk-xl px-5 pt-14 text-center sm:px-10 lg:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full rk-halo-marca blur-[90px]"
        />

        <div className="relative z-[2]">
          <p className="rk-kicker justify-center">Descarga permanente</p>

          <h2 className="rk-display mx-auto mt-5 max-w-3xl !text-[clamp(2.1rem,6vw,3.6rem)]">
            Tu próximo proyecto{" "}
            <span className="rk-cta-modelo-grad">empieza aquí.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-ink/60">
            Plantillas premium para diseñadores y agencias. Elige, paga
            en soles y descarga al instante.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/tienda" className="rk-btn rk-btn-primary">
              Ir a la tienda
              <ArrowRight size={16} aria-hidden />
            </Link>

            <Link href="/registro" className="rk-btn rk-btn-line">
              Crear cuenta
            </Link>
          </div>

          <p className="mt-5 text-[13px] text-ink/55">
            Para diseñadores, agencias y freelancers
          </p>
        </div>

        {/* Modelo sobre el círculo de marca, con tarjetas de vidrio. */}
        <div className="rk-cta-modelo-stage">
          <div aria-hidden className="rk-cta-modelo-circle" />

          <Image
            src="/marketing/modelo-cta.webp"
            alt="Diseñadora de RCKTDMG con su tableta gráfica"
            width={820}
            height={1081}
            sizes="(min-width: 1024px) 400px, 70vw"
            className="rk-cta-modelo-img"
          />

          <div className="rk-card-glass rk-cta-modelo-card is-left">
            <span className="rk-cta-modelo-ico">
              <Download size={16} aria-hidden />
            </span>
            <span className="rk-cta-modelo-txt text-left">
              <b className="block text-[13px] font-semibold">Descarga inmediata</b>
              <small className="block text-[11px] text-ink/55">Justo al pagar</small>
            </span>
          </div>

          <div className="rk-card-glass rk-cta-modelo-card is-right">
            <span className="rk-cta-modelo-ico rk-cta-modelo-only-movil">
              <Tag size={16} aria-hidden />
            </span>
            <span className="rk-cta-modelo-txt text-left">
              <small className="block text-[11px] text-ink/55">Plantillas desde</small>
              <b className="block text-[22px] font-semibold tracking-tight tabular-nums">
                <span className="mr-0.5 text-xs text-ink/55">S/</span>25.00
              </b>
              <span className="mt-2 flex gap-1.5">
                <span className="rk-chip">Eventos</span>
                <span className="rk-chip">Corporativos</span>
              </span>
            </span>
          </div>

          <div className="rk-card-glass rk-cta-modelo-card is-bottom">
            <span className="rk-cta-modelo-ico">
              <ShieldCheck size={16} aria-hidden />
            </span>
            <span className="rk-cta-modelo-txt text-left">
              <b className="block text-[13px] font-semibold">Licencia de uso</b>
              <small className="block text-[11px] text-ink/55">Compra segura</small>
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
