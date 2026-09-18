import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";

import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Planes",
  description:
    "Planes de suscripción de RCKTDMG para descargar recursos digitales.",
};

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    where: {
      active: true,
    },
    orderBy: {
      monthlyPrice: "asc",
    },
  });

  return (
    <>
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

        {/* ENCABEZADO */}
        <section className="rk-enter">
          <div className="rk-glass rounded-[2rem] px-6 py-10 text-center sm:rounded-[2.5rem] sm:px-10 sm:py-12">
            <p className="rk-eyebrow">RCKTDMG</p>

            <h1 className="mt-2.5 text-[2rem] font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Planes
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-ink/50">
              Las suscripciones estarán disponibles próximamente.
              Mientras tanto puedes comprar cualquier recurso de
              forma individual.
            </p>
          </div>
        </section>

        {/* PLANES */}
        {plans.length === 0 ? (
          <div className="rk-enter rk-enter-1 rk-card mt-5 px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">
              Todavía no hay planes configurados
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/45">
              Los planes se configuran desde administración.
            </p>

            <Link href="/tienda" className="rk-btn rk-btn-primary mt-7">
              Explorar recursos
            </Link>
          </div>
        ) : (
          <div className="rk-enter rk-enter-1 mt-5 grid gap-4 md:grid-cols-3">
            {plans.map((plan, index) => {
              const featured =
                plans.length > 1 &&
                index === Math.floor(plans.length / 2);

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-[1.75rem] p-6 sm:p-7 ${
                    featured
                      ? "rk-float bg-primary text-onprimary"
                      : "rk-card"
                  }`}
                >
                  {featured && (
                    <>
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/35 blur-3xl"
                      />

                      <span className="relative mb-4 inline-flex w-fit rounded-full bg-onprimary/15 px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
                        Recomendado
                      </span>
                    </>
                  )}

                  <div className="relative">
                    <h2 className="text-lg font-semibold">
                      {plan.name}
                    </h2>

                    {plan.description && (
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          featured ? "text-onprimary/60" : "text-ink/50"
                        }`}
                      >
                        {plan.description}
                      </p>
                    )}

                    <p className="mt-6 text-4xl font-semibold tracking-tight">
                      S/ {Number(plan.monthlyPrice).toFixed(0)}
                      <span
                        className={`text-base font-normal ${
                          featured ? "text-onprimary/50" : "text-ink/40"
                        }`}
                      >
                        /mes
                      </span>
                    </p>

                    <p
                      className={`mt-1 text-sm ${
                        featured ? "text-onprimary/50" : "text-ink/45"
                      }`}
                    >
                      S/ {Number(plan.yearlyPrice).toFixed(0)} al año
                    </p>

                    {plan.downloadLimit !== null && (
                      <p
                        className={`mt-5 flex items-center gap-2 text-sm ${
                          featured ? "text-onprimary/70" : "text-ink/55"
                        }`}
                      >
                        <Check size={15} className="shrink-0" />
                        Hasta {plan.downloadLimit} descargas al mes
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled
                    title="Las suscripciones estarán disponibles próximamente"
                    className={`rk-btn relative mt-8 w-full !py-3 ${
                      featured
                        ? "bg-onprimary text-primary"
                        : "bg-primary text-onprimary"
                    }`}
                  >
                    Próximamente
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ALTERNATIVA DISPONIBLE HOY */}
        <div className="rk-enter rk-enter-2 rk-card mt-5 p-7 text-center sm:p-9">
          <h2 className="text-lg font-semibold">
            Compra recursos de forma individual
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/45">
            Paga solo por lo que necesitas y descárgalo al instante
            desde tu cuenta.
          </p>

          <Link href="/tienda" className="rk-btn rk-btn-primary mt-6">
            Ir a la tienda
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </>
  );
}
