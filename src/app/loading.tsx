import Image from "next/image";

/**
 * Pantalla de carga entre rutas.
 *
 * Next la enseña sola mientras el servidor prepara la página y
 * la retira en cuanto llega: no hay estado propio que pueda
 * quedarse encendido, que es justo lo que se quería evitar.
 *
 * La marca es la MISMA del navbar —el cuadro con el isotipo y el
 * logotipo—, no un recurso nuevo: así el salto de la carga a
 * la página no cambia de identidad. Ocupa la altura de la
 * ventana menos la cabecera para que el logotipo caiga donde
 * el ojo ya estaba mirando y no dé un brinco al aparecer.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70svh] items-center justify-center px-4"
    >
      <div className="rk-carga flex flex-col items-center gap-4">
        <span className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-rk-sm bg-marca shadow-rk-sm">
            <Image
              src="/Isotipo.svg"
              alt=""
              width={240}
              height={240}
              /* Sin deformar, y sin pasar por el optimizador:
                 Next rechaza los SVG salvo con dangerouslyAllowSVG. */
              className="h-full w-full object-contain p-[12%]"
              unoptimized
            />
          </span>
        </span>

        {/*
          Barra de progreso indeterminada: dice "esto sigue
          vivo" sin prometer un porcentaje que nadie ha medido.
          Se anima con transform, no con width, para que no
          obligue al navegador a recalcular la maquetación en
          cada fotograma.
        */}
        <span
          aria-hidden
          className="rk-carga-barra block h-[3px] w-28 overflow-hidden rounded-full bg-ink/10"
        >
          <span className="rk-carga-pulso block h-full w-1/2 rounded-full bg-primary" />
        </span>

        <span className="sr-only">Cargando…</span>
      </div>
    </div>
  );
}
