/**
 * DIAGNÓSTICO TEMPORAL · error de hidratación #418 (PR #39, parte D).
 *
 * Solo se envía en las vistas previas de Vercel (VERCEL_ENV ===
 * "preview"); en producción y en local no llega al navegador. Se
 * quita antes de unir el PR.
 *
 * Cuando React no puede hidratar una parte de la página, descarta el
 * HTML del servidor de esa parte y la vuelve a pintar en el cliente.
 * Este script observa el DOM desde el primer momento y, si salta el
 * error #418, anota qué elementos retira React justo después: esa es
 * la parte que no coincidía.
 *
 * Solo registra la hora y la identidad de los elementos (etiqueta, id,
 * dos clases y los NOMBRES de sus atributos data-*). Nada de texto,
 * valores, datos de usuarios ni de la base de datos.
 */
export const SCRIPT_DIAGNOSTICO_HIDRATACION = `(function () {
  try {
    var t0 = performance.now();
    var retirados = [];
    var errorEn = null;
    var CLAVE = "rk-diag-hidratacion";

    function desc(el) {
      if (!el || el.nodeType !== 1) return "";
      var s = el.nodeName.toLowerCase();
      if (el.id) s += "#" + el.id;
      if (el.classList && el.classList.length) s += "." + Array.prototype.slice.call(el.classList, 0, 2).join(".");
      var datos = [];
      for (var i = 0; i < el.attributes.length; i++) {
        var n = el.attributes[i].name;
        if (n.indexOf("data-") === 0) datos.push(n);
      }
      if (datos.length) s += "[" + datos.slice(0, 3).join(",") + "]";
      return s;
    }

    function ruta(el) {
      var partes = [];
      for (var k = 0; el && el.nodeType === 1 && k < 4; k++, el = el.parentElement) partes.push(desc(el));
      return partes.join(" < ");
    }

    var observador = new MutationObserver(function (lista) {
      var t = Math.round(performance.now() - t0);
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        for (var j = 0; j < m.removedNodes.length; j++) {
          var n = m.removedNodes[j];
          if (n.nodeType !== 1 || /^(SCRIPT|LINK|STYLE|META|TITLE|TEMPLATE)$/.test(n.nodeName)) continue;
          retirados.push({ t: t, el: desc(n), en: ruta(m.target) });
          if (retirados.length > 400) retirados.shift();
        }
      }
    });
    observador.observe(document, { childList: true, subtree: true });
    setTimeout(function () { observador.disconnect(); }, 20000);

    function informar() {
      var tras = retirados.filter(function (r) { return r.t >= errorEn - 50 && r.t <= errorEn + 1500; });
      var resumen = {
        pagina: location.pathname,
        ancho: innerWidth,
        errorMs: errorEn,
        hora: new Date().toISOString(),
        reemplazado: tras.slice(0, 12),
      };
      try { sessionStorage.setItem(CLAVE, JSON.stringify(resumen)); } catch (e) {}
      try { console.info("[diagnóstico hidratación]", resumen); } catch (e) {}

      var caja = document.createElement("div");
      caja.setAttribute("role", "status");
      caja.style.cssText = "position:fixed;left:8px;right:8px;top:8px;z-index:2147483647;max-height:45vh;overflow:auto;padding:10px 12px;border-radius:12px;border:1px solid var(--rk-border-color);background:rgb(var(--rk-background));color:rgb(var(--rk-foreground));font:12px/1.4 ui-monospace,monospace;box-shadow:0 8px 24px rgb(var(--pal-negro) / 0.25)";
      var lineas = ["Diagnóstico de hidratación (solo vista previa)", "Error #418 a los " + errorEn + " ms · " + location.pathname + " · " + innerWidth + " px", "React retiró y volvió a pintar:"];
      if (!tras.length) lineas.push("  (ningún elemento: el error no reemplazó nodos visibles)");
      for (var i = 0; i < Math.min(tras.length, 12); i++) lineas.push("  " + tras[i].t + " ms  " + tras[i].el + "   en " + tras[i].en);
      lineas.push("Toca este recuadro para cerrarlo.");
      caja.textContent = lineas.join("\\n");
      caja.style.whiteSpace = "pre-wrap";
      caja.addEventListener("click", function () { caja.remove(); });
      document.body.appendChild(caja);
    }

    window.addEventListener("error", function (e) {
      var texto = String((e && (e.message || (e.error && e.error.message))) || "");
      if (errorEn !== null || !/418|[Hh]ydrat/.test(texto)) return;
      errorEn = Math.round(performance.now() - t0);
      setTimeout(informar, 1600);
    });
  } catch (e) {}
})();`;
