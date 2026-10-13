import Link from "next/link";

import PreviewProtegido from "@/components/PreviewProtegido";
import { ASPECTO_CORPORATIVO, type TarjetaHome } from "@/lib/home";
import { formatPrice } from "@/lib/pricing";

/**
 * Pestaña «General» del catálogo del inicio.
 *
 * La misma tira que Stories, en el formato de estas piezas
 * (4:5), y cada una lleva a su ficha. Solo piezas corporativas
 * reales: sin ninguna, la pestaña no se pinta (page.tsx).
 */
export default function TiraGeneral({
  recursos,
}: {
  recursos: TarjetaHome[];
}) {
  return (
    <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {recursos.map((recurso) => (
        <li key={recurso.id} className="snap-start">
          <Link
            href={`/tienda/${recurso.slug}`}
            className="rk-press group block w-[8.5rem] text-left sm:w-[10rem]"
          >
            <span
              className="rk-frame relative block w-full overflow-hidden rounded-rk-md"
              style={{ aspectRatio: ASPECTO_CORPORATIVO }}
            >
              {recurso.imagen && (
                <PreviewProtegido
                  src={recurso.imagen}
                  alt={recurso.name}
                  sizes="(max-width: 640px) 40vw, 11rem"
                  className="transition-transform duration-normal ease-rk group-hover:scale-[1.03]"
                  esquina="arriba-derecha"
                />
              )}

              <span className="rk-glass-on-image absolute bottom-2 left-2 right-2 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                {formatPrice(recurso.price)}
              </span>
            </span>

            <span className="mt-2 block truncate px-0.5 text-[13px] font-medium">
              {recurso.name}
            </span>

            <span className="block truncate px-0.5 text-[12px] text-ink/55">
              {recurso.creador.nombre}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
