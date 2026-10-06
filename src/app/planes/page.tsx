import Link from "next/link";
import type { Metadata } from "next";

import { paginaPublica } from "@/lib/seo";
import { ArrowRight, Sparkles } from "lucide-react";

import EmptyState from "@/components/EmptyState";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PlanesLista from "./PlanesLista";
import PreguntasFrecuentes from "@/components/PreguntasFrecuentes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = paginaPublica({
  titulo: "Planes",
  descripcion:
    "Planes de suscripción de RCKTDMG para descargar recursos digitales.",
  ruta: "/planes",
});

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
          <div className="rk-glass rounded-rk-xl px-6 py-10 text-center sm:px-10 sm:py-12">
            <p className="rk-eyebrow">RCKTDMG</p>

            <h1 className="mt-2.5 text-[2rem] font-semibold leading-tight sm:text-4xl lg:text-5xl">
              Planes
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-ink/60">
              Las suscripciones estarán disponibles próximamente.
              Mientras tanto puedes comprar cualquier recurso de
              forma individual.
            </p>
          </div>
        </section>

        {/* PLANES */}
        {plans.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Sparkles}
              title="Todavía no hay planes configurados"
              description="Los planes se configuran desde administración. Mientras tanto puedes comprar recursos por separado."
              action={{ href: "/tienda", label: "Explorar recursos" }}
            />
          </div>
        ) : (
          <>
          {/* Tarjetas con interruptor Mensual / Anual (cliente) */}
          <PlanesLista
            plans={plans.map((plan) => ({
              id: plan.id,
              name: plan.name,
              description: plan.description ?? null,
              monthlyPrice: Number(plan.monthlyPrice),
              yearlyPrice: Number(plan.yearlyPrice),
              downloadLimit: plan.downloadLimit ?? null,
            }))}
          />

          {/* COMPARACIÓN: solo datos reales de cada plan */}
          <section className="rk-fade-up rk-enter-2 mt-10">
            <h2 className="mb-4 text-center text-xl font-semibold tracking-tight">
              Compara los planes
            </h2>

            <div
              className="rk-compare"
              style={{ ["--rk-cmp-cols" as string]: plans.length }}
              role="table"
              aria-label="Comparación de planes"
            >
              <div className="rk-compare-row rk-compare-head" role="row">
                <span role="columnheader" />
                {plans.map((plan, index) => {
                  const featured =
                    plans.length > 1 &&
                    index === Math.floor(plans.length / 2);

                  return (
                    <span key={plan.id} role="columnheader">
                      <span className="rk-compare-plan">{plan.name}</span>
                      <b>
                        <sup>S/</sup>
                        {Number(plan.monthlyPrice).toFixed(0)}
                      </b>
                      <em>
                        Por mes
                        <br />
                        S/ {Number(plan.yearlyPrice).toFixed(0)} al año
                      </em>
                      <button
                        type="button"
                        disabled
                        className={`rk-btn ${
                          featured ? "rk-btn-primary" : "rk-btn-glass"
                        }`}
                      >
                        <span className="rk-compare-btn-text">Pronto</span>
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
              </div>

              <div className="rk-compare-row rk-compare-group" role="row">
                <span role="rowheader">Lo esencial</span>
              </div>

              <div className="rk-compare-row" role="row">
                <span role="rowheader">Descargas al mes</span>
                {plans.map((plan) => (
                  <span key={plan.id} role="cell">
                    <i className="rk-compare-val">
                      {plan.downloadLimit !== null
                        ? plan.downloadLimit
                        : "Ilimitadas"}
                    </i>
                  </span>
                ))}
              </div>

              <div className="rk-compare-row" role="row">
                <span role="rowheader">Compras individuales</span>
                {plans.map((plan) => (
                  <span key={plan.id} role="cell">
                    <i
                      className="rk-compare-yes"
                      role="img"
                      aria-label="Incluido"
                    />
                  </span>
                ))}
              </div>

            </div>
          </section>
          </>
        )}

        {/* ALTERNATIVA DISPONIBLE HOY */}
        <div className="rk-fade-up rk-enter-2 rk-card mt-10 p-6 text-center sm:p-8">
          <h2 className="text-lg font-semibold">
            Compra recursos de forma individual
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/60">
            Paga solo por lo que necesitas y descárgalo al instante
            desde tu cuenta.
          </p>

          <Link href="/tienda" className="rk-btn rk-btn-primary mt-6">
            Ir a la tienda
            <ArrowRight size={16} />
          </Link>
        </div>

        <PreguntasFrecuentes className="!px-0" />
      </main>

      <Footer />
    </>
  );
}
