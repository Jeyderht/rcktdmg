import { CheckCircle2 } from "lucide-react";

import {
  REGLA_COLECCION,
  REGLA_PACK,
  REQUISITOS,
  comoLista,
  enMegas,
  type ReglaConjunto,
  type Requisito,
} from "@/lib/requisitos-contenido";

/**
 * Los requisitos, pintados.
 *
 * Se usa en la página pública que ve el creador y en la del
 * panel de administración. El mismo componente en los dos
 * sitios, para que nadie pueda leer una versión distinta de
 * las reglas según dónde mire.
 *
 * Los números NO están escritos aquí: salen de
 * requisitos-contenido.ts, que a su vez los toma de donde se
 * aplican de verdad.
 */
function Ficha({ requisito }: { requisito: Requisito }) {
  return (
    <article className="rk-card p-5">
      <h3 className="text-[15px] font-semibold">{requisito.nombre}</h3>

      <p className="mt-1.5 text-[13px] leading-6 text-ink/60">
        {requisito.paraQue}
      </p>

      <dl className="mt-4 space-y-1.5 text-[13px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink/55">Medidas</dt>
          <dd className="text-right font-medium tabular-nums">
            {requisito.medida
              ? `${requisito.medida.ancho} × ${requisito.medida.alto} px`
              : "Cualquiera"}
          </dd>
        </div>

        {requisito.medida && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink/55">Proporción</dt>
            <dd className="text-right font-medium">
              {requisito.medida.proporcion}
            </dd>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink/55">Formatos</dt>
          <dd className="text-right font-medium">
            {comoLista(requisito.formatos)}
          </dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink/55">Peso máximo</dt>
          <dd className="text-right font-medium tabular-nums">
            {enMegas(requisito.maxBytes)}
          </dd>
        </div>
      </dl>

      {requisito.notas && requisito.notas.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {requisito.notas.map((nota) => (
            <li
              key={nota}
              className="flex gap-2 text-[13px] leading-6 text-ink/60"
            >
              <CheckCircle2
                size={13}
                aria-hidden
                className="mt-1.5 shrink-0 text-ink/40"
              />
              {nota}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function FichaConjunto({ regla }: { regla: ReglaConjunto }) {
  return (
    <article className="rk-card p-5">
      <h3 className="text-[15px] font-semibold">{regla.nombre}</h3>

      <p className="mt-1.5 text-[13px] tabular-nums text-ink/60">
        De {regla.minimo} a {regla.maximo} recursos.
      </p>

      <ul className="mt-4 space-y-1.5">
        {regla.notas.map((nota) => (
          <li
            key={nota}
            className="flex gap-2 text-[13px] leading-6 text-ink/60"
          >
            <CheckCircle2
              size={13}
              aria-hidden
              className="mt-1.5 shrink-0 text-ink/40"
            />
            {nota}
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function TablaRequisitos() {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="rk-title text-xl sm:text-2xl">
          Imágenes y archivos
        </h2>

        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink/60">
          Todo lo que se sube pasa por estas reglas. Se comprueban en tu
          navegador antes de enviar y otra vez en el servidor, así que si
          algo no cumple te enteras al momento y no después de publicar.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REQUISITOS.map((requisito) => (
            <Ficha key={requisito.clave} requisito={requisito} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="rk-title text-xl sm:text-2xl">
          Colecciones y packs
        </h2>

        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink/60">
          Formas de vender varias piezas juntas. Las dos se arman con
          recursos tuyos que ya estén publicados.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <FichaConjunto regla={REGLA_COLECCION} />
          <FichaConjunto regla={REGLA_PACK} />
        </div>
      </section>
    </div>
  );
}
