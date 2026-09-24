import { Star } from "lucide-react";

import { NOTA_MAXIMA } from "@/lib/resenas-comun";

/**
 * Estrellas de solo lectura.
 *
 * Es un componente de servidor: no tiene estado ni eventos.
 * Para puntuar está `SelectorEstrellas`, que sí es de cliente.
 *
 * Las medias se representan rellenando la estrella parcial con
 * un recorte, no redondeando: un 4,2 y un 4,8 no deben verse
 * igual.
 */
export default function Estrellas({
  valor,
  tamano = 14,
  className = "",
}: {
  /** Media de 0 a 5. */
  valor: number;
  tamano?: number;
  className?: string;
}) {
  const acotado = Math.max(0, Math.min(NOTA_MAXIMA, valor));

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${acotado.toFixed(1).replace(".", ",")} de ${NOTA_MAXIMA}`}
    >
      {Array.from({ length: NOTA_MAXIMA }).map((_, indice) => {
        // Porción rellena de ESTA estrella: 1, 0, o algo entre medias.
        const relleno = Math.max(0, Math.min(1, acotado - indice));

        return (
          <span
            key={indice}
            aria-hidden
            className="relative inline-flex shrink-0"
            style={{ width: tamano, height: tamano }}
          >
            <Star
              size={tamano}
              className="absolute inset-0 text-ink/20"
              strokeWidth={1.75}
            />

            {relleno > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${relleno * 100}%` }}
              >
                <Star
                  size={tamano}
                  className="fill-ink text-ink"
                  strokeWidth={1.75}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
