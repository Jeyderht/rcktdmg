/**
 * Pantalla de carga entre rutas.
 *
 * Next la enseña sola mientras el servidor prepara la página y
 * la retira en cuanto llega: no hay estado propio que pueda
 * quedarse encendido.
 *
 * Minimal: el cohete de la marca solo, en el color del texto
 * (negro en claro, blanco en oscuro), y un arco fino con el
 * degradado de marca que gira alrededor. El cohete es estático:
 * primero aparece de transparente a opacidad 100% y luego el
 * arco nace en 0 (largo y opacidad) y crece mientras gira. Arranca con un pequeño retraso para no parpadear
 * en las navegaciones rápidas. Todo es CSS (sección AX de
 * globals.css) y respeta el movimiento reducido.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70svh] items-center justify-center px-4"
    >
      <div aria-hidden className="rk-cargador">
        <span className="rk-cargador-cohete" />
      </div>

      <span className="sr-only">Cargando…</span>
    </div>
  );
}
