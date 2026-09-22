/**
 * Prueba de conectividad real con Vercel Blob.
 *
 *   node scripts/probar-blob.mjs
 *
 * Qué hace y qué NO hace:
 *
 *  - Sube UN objeto de prueba a cada almacén y lo borra al
 *    terminar, pase lo que pase.
 *  - No toca la base de datos.
 *  - No toca ningún archivo existente.
 *  - No imprime tokens: solo dice si están presentes.
 *
 * Comprueba:
 *   1. Subida pública + URL accesible (HTTP 200) + tipo correcto.
 *   2. Subida privada + que NO sea accesible sin autenticación.
 *   3. Lectura privada por stream desde el servidor.
 *   4. Compatibilidad del host con remotePatterns de next/image.
 *   5. Borrado de los dos objetos de prueba.
 */

import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();

// Carga .env y .env.local sin sobrescribir lo que ya exista.
for (const archivo of [".env", ".env.local"]) {
  const ruta = path.join(RAIZ, archivo);
  if (!fs.existsSync(ruta)) continue;

  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let valor = m[2].trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = valor;
  }
}

const tokenMedia = process.env.BLOB_READ_WRITE_TOKEN;

const tokenFiles = process.env.BLOB_FILES_READ_WRITE_TOKEN;

console.log("\n=== TOKENS (solo presencia, nunca el valor) ===");
console.log(
  `  almacén público  rcktdmg-media : ${tokenMedia ? "PRESENTE" : "AUSENTE"}`
);
console.log(
  `  almacén privado  rcktdmg-files : ${tokenFiles ? "PRESENTE" : "AUSENTE"}`
);

if (!tokenMedia || !tokenFiles) {
  console.log(
    "\nNo se puede probar la conectividad sin los dos tokens."
  );
  console.log(
    "Configúralos en .env.local (o en el entorno) y vuelve a ejecutar:"
  );
  console.log("  BLOB_READ_WRITE_TOKEN=…");
  console.log("  BLOB_FILES_READ_WRITE_TOKEN=…");
  console.log("\nNo se ha subido ni borrado nada.\n");
  process.exit(2);
}

const { put, get, del, head } = await import("@vercel/blob");

// PNG de 1x1 píxel: el objeto de prueba más pequeño posible.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const marca = `prueba-conectividad-${Date.now()}`;
const TEXTO_PRIVADO = `Archivo de prueba de RCKTDMG. Sin datos sensibles. ${marca}`;

const creados = [];
let fallos = 0;

function ok(etiqueta, detalle = "") {
  console.log(`  OK    ${etiqueta}${detalle ? ` — ${detalle}` : ""}`);
}

function mal(etiqueta, detalle = "") {
  fallos += 1;
  console.log(`  FALLO ${etiqueta}${detalle ? ` — ${detalle}` : ""}`);
}

try {
  // ---------------- 1. ALMACÉN PÚBLICO ----------------
  console.log("\n=== 1. ALMACÉN PÚBLICO (rcktdmg-media) ===");

  const publico = await put(
    `pruebas/${marca}.png`,
    PNG,
    {
      access: "public",
      token: tokenMedia,
      contentType: "image/png",
      addRandomSuffix: false,
    }
  );

  creados.push({ url: publico.url, token: tokenMedia, tipo: "público" });

  ok("subida", publico.pathname);
  console.log(`        URL: ${publico.url}`);

  const respuesta = await fetch(publico.url);
  const cuerpo = Buffer.from(await respuesta.arrayBuffer());

  respuesta.status === 200
    ? ok("URL accesible", `HTTP ${respuesta.status}`)
    : mal("URL accesible", `HTTP ${respuesta.status}`);

  respuesta.headers.get("content-type") === "image/png"
    ? ok("content-type", "image/png")
    : mal(
        "content-type",
        respuesta.headers.get("content-type") || "desconocido"
      );

  cuerpo.equals(PNG)
    ? ok("contenido idéntico", `${cuerpo.length} bytes`)
    : mal("contenido idéntico");

  // ------------- 2. COMPATIBILIDAD next/image -------------
  console.log("\n=== 2. next/image (remotePatterns) ===");

  const host = new URL(publico.url).hostname;

  const patron = /^[^.]+\.public\.blob\.vercel-storage\.com$/;

  patron.test(host)
    ? ok(
        "host cubierto por *.public.blob.vercel-storage.com",
        host
      )
    : mal("host NO cubierto por el patrón actual", host);

  // ---------------- 3. ALMACÉN PRIVADO ----------------
  console.log("\n=== 3. ALMACÉN PRIVADO (rcktdmg-files) ===");

  const privado = await put(
    `pruebas/${marca}.txt`,
    Buffer.from(TEXTO_PRIVADO, "utf8"),
    {
      access: "private",
      token: tokenFiles,
      contentType: "text/plain",
      addRandomSuffix: false,
    }
  );

  creados.push({ url: privado.url, token: tokenFiles, tipo: "privado" });

  ok("subida", privado.pathname);
  console.log(`        URL: ${privado.url}`);

  // Acceso directo SIN autenticación: debe fallar.
  const sinAuth = await fetch(privado.url);

  sinAuth.status === 200
    ? mal(
        "el objeto privado es accesible sin autenticación",
        `HTTP ${sinAuth.status}`
      )
    : ok(
        "no accesible sin autenticación",
        `HTTP ${sinAuth.status}`
      );

  // Lectura autenticada desde el servidor.
  const leido = await get(privado.url, {
    access: "private",
    token: tokenFiles,
  });

  if (!leido || leido.statusCode !== 200 || !leido.stream) {
    mal("lectura privada con get()");
  } else {
    const partes = [];
    for await (const trozo of leido.stream) partes.push(trozo);
    const texto = Buffer.concat(partes).toString("utf8");

    texto === TEXTO_PRIVADO
      ? ok(
          "stream privado correcto",
          `${leido.blob.size} bytes, ${leido.blob.contentType}`
        )
      : mal("el contenido leído no coincide");
  }

  // Metadata (la usa la ficha de producto para el tamaño).
  const meta = await head(privado.url, { token: tokenFiles });
  meta?.size === Buffer.byteLength(TEXTO_PRIVADO)
    ? ok("head() devuelve el tamaño real", `${meta.size} bytes`)
    : mal("head() no devuelve el tamaño esperado");
} catch (error) {
  mal(
    "excepción durante la prueba",
    error instanceof Error ? error.message : String(error)
  );
} finally {
  // ---------------- 4. LIMPIEZA ----------------
  console.log("\n=== 4. LIMPIEZA DE OBJETOS DE PRUEBA ===");

  for (const objeto of creados) {
    try {
      await del(objeto.url, { token: objeto.token });
      console.log(`  borrado (${objeto.tipo}): ${objeto.url}`);
    } catch (error) {
      fallos += 1;
      console.log(
        `  NO SE PUDO BORRAR (${objeto.tipo}): ${objeto.url} — ${
          error instanceof Error ? error.message : "error"
        }`
      );
    }
  }

  console.log(
    `\n=== RESULTADO: ${fallos === 0 ? "TODO CORRECTO" : `${fallos} fallo(s)`} ===\n`
  );

  process.exit(fallos === 0 ? 0 : 1);
}
