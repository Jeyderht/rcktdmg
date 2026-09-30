"use client";

import { useEffect, useId, useRef, useState } from "react";

import ProductCard, {
  type ProductCardData,
} from "@/components/ProductCard";

/**
 * Tira de sugerencias de la ficha.
 *
 * Los flyers se desplazan solos, despacio y de forma continua,
 * y se detienen en cuanto alguien se acerca: el movimiento está
 * para invitar a mirar, no para competir con el recurso que el
 * cliente vino a ver.
 *
 * CÓMO SE MUEVE, Y POR QUÉ ASÍ
 *
 * Es un contenedor con desbordamiento real y `scrollLeft`, no
 * una pista con `transform`. Cuesta lo mismo —el compositor
 * resuelve las dos igual— pero se gana lo que importa aquí:
 *
 *   · El teclado funciona sin escribir nada. Al tabular, el
 *     navegador trae a la vista el enlace enfocado porque está
 *     dentro de una región desplazable. Con una pista
 *     transformada, el flyer enfocado puede quedarse fuera del
 *     recorte y no hay forma de saberlo desde CSS.
 *   · El dedo y la rueda ya arrastran la tira, sin listeners.
 *   · Quien pide menos movimiento se queda con una tira
 *     normal, que se recorre a mano. No hay que desmontar nada.
 *
 * El bucle avanza por tiempo transcurrido, no por fotograma, de
 * modo que la velocidad es la misma en una pantalla de 60 Hz y
 * en una de 144.
 *
 * LA VUELTA AL PRINCIPIO
 *
 * La lista se pinta dos veces y, al llegar al final de la
 * primera, se resta un periodo exacto a `scrollLeft`. El salto
 * cae sobre contenido idéntico, así que no se ve. La copia va
 * con `inert`: no la lee un lector de pantalla y no recibe foco,
 * porque son los mismos recursos y tabular dos veces por lo
 * mismo es un error, no una función.
 */

/**
 * Píxeles por segundo.
 *
 * Deliberadamente lento: a esta velocidad un flyer tarda unos
 * seis segundos en cruzar su propio ancho, que es tiempo de
 * sobra para reconocerlo y decidir si merece un clic.
 */
const VELOCIDAD = 22;

/**
 * Margen para decidir si hace falta desplazar.
 *
 * Sin él, una tira que sobresale tres píxeles se pondría a
 * desfilar para nada.
 */
const HOLGURA = 8;

export default function SugerenciasFlyers({
  productos,
}: {
  productos: ProductCardData[];
}) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const lista = useRef<HTMLUListElement | null>(null);

  /*
    Arranca quieto y solo desfila si de verdad hay más flyers
    que hueco. Con tres recursos en una pantalla ancha no sobra
    nada que mostrar, y moverlos sería movimiento sin motivo.
  */
  const [desfilando, setDesfilando] = useState(false);

  /*
    Motivos por los que está parado, no un booleano: se
    solapan. Si alguien pasa el ratón y además cambia de
    pestaña, al volver el puntero sigue encima y la tira debe
    seguir quieta. Con un booleano, el último en soltarlo la
    arrancaría.
  */
  const pausas = useRef<Set<string>>(new Set());

  const idTitulo = useId();

  /* ¿Hace falta desfilar? Lo dice la medida, no una suposición. */
  useEffect(() => {
    const caja = contenedor.current;
    const ul = lista.current;

    if (!caja || !ul) return;

    const menosMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const medir = () => {
      if (menosMovimiento.matches) {
        setDesfilando(false);
        return;
      }

      setDesfilando(ul.scrollWidth > caja.clientWidth + HOLGURA);
    };

    medir();

    /*
      Se observan la caja y la lista original. La copia es
      hermana, así que añadirla no cambia el ancho de ninguna de
      las dos y la medición no se realimenta.
    */
    const observador = new ResizeObserver(medir);
    observador.observe(caja);
    observador.observe(ul);
    menosMovimiento.addEventListener("change", medir);

    return () => {
      observador.disconnect();
      menosMovimiento.removeEventListener("change", medir);
    };
  }, []);

  /* El desfile. Solo existe mientras haga falta. */
  useEffect(() => {
    if (!desfilando) return;

    const caja = contenedor.current;
    const ul = lista.current;

    if (!caja || !ul) return;

    /*
      Se copia la referencia a una variable del efecto. El
      conjunto se crea una vez y nunca se reemplaza, pero la
      limpieza debe operar sobre el mismo objeto que registró
      las pausas, no sobre lo que haya en la referencia cuando
      le toque ejecutarse.
    */
    const motivos = pausas.current;

    const pista = ul.parentElement;

    /*
      El periodo es el ancho de una lista MÁS el hueco que la
      separa de su copia. Sin sumar el hueco, cada vuelta
      adelantaría esos píxeles y la tira iría desalineándose
      hasta que el salto se notara.
    */
    const hueco = pista
      ? Number.parseFloat(getComputedStyle(pista).columnGap) || 0
      : 0;

    let periodo = ul.offsetWidth + hueco;
    let anterior = 0;
    let fotograma = 0;

    /*
      LA POSICIÓN VIVE AQUÍ, EN COMA FLOTANTE

      A esta velocidad cada fotograma avanza una fracción de
      píxel, y `scrollLeft` redondea lo que se le asigna. Leerlo
      de vuelta para sumarle la fracción siguiente devolvía cero,
      se le sumaba otro tercio de píxel, volvía a redondear a
      cero, y la tira se quedaba clavada sin que nada fallara a
      la vista.

      Acumulando aquí, el redondeo solo afecta a lo que se pinta,
      que es donde no importa.
    */
    let posicion = caja.scrollLeft;

    const paso = (ahora: number) => {
      if (anterior === 0) anterior = ahora;

      /*
        Se recorta el salto: al volver de otra pestaña o de un
        bloqueo, el tiempo transcurrido puede ser de segundos y
        sin tope la tira daría un brinco.
      */
      const transcurrido = Math.min(ahora - anterior, 64) / 1000;
      anterior = ahora;

      if (motivos.size > 0) {
        /*
          Parada: manda quien mira. Si arrastró la tira con el
          dedo o con la rueda, se adopta su posición para
          continuar desde ahí en lugar de tirar de ella de
          vuelta.
        */
        posicion = caja.scrollLeft;
      } else if (periodo > 0) {
        posicion += VELOCIDAD * transcurrido;

        if (posicion >= periodo) posicion -= periodo;

        caja.scrollLeft = posicion;
      }

      fotograma = requestAnimationFrame(paso);
    };

    fotograma = requestAnimationFrame(paso);

    const observador = new ResizeObserver(() => {
      periodo = ul.offsetWidth + hueco;
    });
    observador.observe(ul);

    const marcar = (motivo: string, activo: boolean) => {
      if (activo) motivos.add(motivo);
      else motivos.delete(motivo);
    };

    /*
      Estado inicial de la pestaña: puede estar ya en segundo
      plano cuando se monta, y `visibilitychange` solo avisa de
      los cambios, nunca del punto de partida.
    */
    marcar("oculta", document.hidden);

    const entraPuntero = () => marcar("puntero", true);
    const salePuntero = () => marcar("puntero", false);
    const entraFoco = () => marcar("foco", true);
    const saleFoco = () => marcar("foco", false);
    const empiezaArrastre = () => marcar("arrastre", true);
    const acabaArrastre = () => marcar("arrastre", false);
    const cambiaVisibilidad = () => marcar("oculta", document.hidden);

    caja.addEventListener("pointerenter", entraPuntero);
    caja.addEventListener("pointerleave", salePuntero);
    caja.addEventListener("focusin", entraFoco);
    caja.addEventListener("focusout", saleFoco);
    caja.addEventListener("pointerdown", empiezaArrastre);
    /* El dedo puede levantarse fuera de la tira. */
    window.addEventListener("pointerup", acabaArrastre);
    window.addEventListener("pointercancel", acabaArrastre);
    document.addEventListener("visibilitychange", cambiaVisibilidad);

    /* Fuera de pantalla no se mueve: no lo ve nadie. */
    const mirilla = new IntersectionObserver(
      (entradas) => marcar("fuera", !entradas[0]?.isIntersecting),
      { threshold: 0 }
    );
    mirilla.observe(caja);

    return () => {
      cancelAnimationFrame(fotograma);
      observador.disconnect();
      mirilla.disconnect();
      caja.removeEventListener("pointerenter", entraPuntero);
      caja.removeEventListener("pointerleave", salePuntero);
      caja.removeEventListener("focusin", entraFoco);
      caja.removeEventListener("focusout", saleFoco);
      caja.removeEventListener("pointerdown", empiezaArrastre);
      window.removeEventListener("pointerup", acabaArrastre);
      window.removeEventListener("pointercancel", acabaArrastre);
      document.removeEventListener("visibilitychange", cambiaVisibilidad);
      motivos.clear();
    };
  }, [desfilando]);

  /*
    El ancho del flyer.
    En móvil se mide en vw para que quepan dos y se intuya un
    tercero; desde tablet pasa a una medida fija, porque ahí la
    tira ya vive dentro de una columna y no del ancho de la
    pantalla.
  */
  const anchoPieza = "w-[42vw] shrink-0 sm:w-36 lg:w-40";

  const piezas = (copia: boolean) =>
    productos.map((producto) => (
      <li
        key={copia ? `copia-${producto.id}` : producto.id}
        className={`rk-desfile-pieza ${anchoPieza}`}
      >
        <ProductCard product={producto} showFavorite={false} />
      </li>
    ));

  return (
    <section
      className="rk-card mt-4 p-4 sm:p-5"
      aria-labelledby={idTitulo}
    >
      <h2 id={idTitulo} className="text-sm font-semibold">
        También te puede interesar
      </h2>

      {/*
        Sale de los márgenes de la tarjeta para que los flyers
        se desvanezcan contra su borde, y los recupera como
        relleno para que el primero siga alineado con el título.
      */}
      <div
        ref={contenedor}
        className="rk-desfile -mx-4 mt-3 px-4 sm:-mx-5 sm:px-5"
        role="group"
        aria-label="Otros recursos publicados"
      >
        <div className="rk-desfile-pista">
          <ul ref={lista} className="rk-desfile-lista">
            {piezas(false)}
          </ul>

          {desfilando && (
            <ul className="rk-desfile-lista" aria-hidden="true" inert>
              {piezas(true)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
