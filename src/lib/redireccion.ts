/**
 * Destino de vuelta tras iniciar sesión o registrarse (`?redirect=`).
 *
 * Solo se acepta una ruta INTERNA de esta web. Todo lo demás se
 * descarta, para que nadie pueda fabricar un enlace a /login que,
 * tras entrar, lleve a otro sitio (redirección abierta).
 *
 * Antes bastaba con «empieza por / y no por //», y eso dejaba pasar
 * `/\evil.com`: los navegadores leen la barra invertida como «/» y
 * acababan en evil.com. Ahora se rechaza:
 *
 *   - lo que no empiece por una sola «/» (//, /\, esquemas como
 *     https: o javascript:, rutas relativas);
 *   - cualquier barra invertida, también codificada (%5c);
 *   - una segunda barra codificada al principio (/%2f…);
 *   - espacios, saltos de línea y cualquier carácter de control,
 *     que algunos navegadores eliminan antes de interpretar la URL;
 *   - lo que, una vez resuelto, salga de este mismo origen;
 *   - /login y /registro, que solo darían vueltas.
 *
 * Se usa igual en el navegador y en el servidor: no depende de
 * window ni de nada de Node.
 */

/** Origen ficticio para resolver la ruta sin depender del dominio real. */
const ORIGEN = "https://rcktx.invalid";

const LARGO_MAXIMO = 2048;

/** Destinos que no tienen sentido como vuelta: llevarían al mismo formulario. */
const RUTAS_DE_ENTRADA = ["/login", "/registro"];

/**
 * La ruta interna normalizada (ruta + consulta + ancla) si es segura,
 * o null si no lo es.
 */
export function destinoInterno(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (valor.length === 0 || valor.length > LARGO_MAXIMO) return null;

  // Espacios, saltos de línea y caracteres de control, en cualquier sitio.
  if (/[\s\x00-\x1f\x7f]/.test(valor)) return null;

  // Una sola barra al principio; nunca dos ni «/\».
  if (!valor.startsWith("/") || valor.startsWith("//")) return null;

  // Ninguna barra invertida, ni literal ni codificada.
  if (valor.includes("\\") || /%5c/i.test(valor)) return null;

  // Una segunda barra codificada al principio: /%2f…
  if (/^\/%2f/i.test(valor)) return null;

  let url: URL;

  try {
    url = new URL(valor, ORIGEN);
  } catch {
    return null;
  }

  // Resuelta, tiene que seguir en el mismo origen.
  if (url.origin !== ORIGEN) return null;
  if (url.pathname.startsWith("//")) return null;

  if (RUTAS_DE_ENTRADA.some((r) => url.pathname === r || url.pathname.startsWith(`${r}/`))) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** El destino de `?redirect=` de una URL o cadena de búsqueda, ya validado. */
export function destinoDeBusqueda(busqueda: string): string | null {
  return destinoInterno(new URLSearchParams(busqueda).get("redirect"));
}

/** `ruta?redirect=<destino>` si hay destino válido; si no, la ruta tal cual. */
export function conDestino(ruta: string, destino: string | null): string {
  return destino ? `${ruta}?redirect=${encodeURIComponent(destino)}` : ruta;
}
