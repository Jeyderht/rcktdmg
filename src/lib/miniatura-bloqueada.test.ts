/**
 * Pruebas de la miniatura de recursos «solo para registrados»
 * (miniatura-bloqueada.ts). No tocan la base ni la red.
 *
 *   npm test
 */

import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import sharp from "sharp";

import {
  generarMiniaturaBloqueada,
  miniaturaDesdeBytes,
} from "./miniatura-bloqueada";
import { PREFIJO_MINIATURA, esMiniaturaValida } from "./vista-recurso";

/** Una «portada» 1080 × 1920 llena de detalle fino: tablero de 4 px. */
async function portadaConDetalle(): Promise<Buffer> {
  const ancho = 1080;
  const alto = 1920;
  const pixeles = Buffer.alloc(ancho * alto * 3);

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const v = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 255 : 0;
      pixeles.fill(v, (y * ancho + x) * 3, (y * ancho + x) * 3 + 3);
    }
  }

  return sharp(pixeles, { raw: { width: ancho, height: alto, channels: 3 } })
    .png()
    .toBuffer();
}

/** Póster 1080 × 1920: fondo oscuro, título enorme y una silueta. */
function portadaConTitulo(titulo: string): Promise<Buffer> {
  const [uno, dos, tres] = titulo.split(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <rect width="1080" height="1920" fill="#1a1030"/>
    <circle cx="540" cy="1250" r="170" fill="#e8c9a0"/>
    <rect x="340" y="1420" width="400" height="500" rx="120" fill="#e8c9a0"/>
    <g font-family="Arial Black, Arial, sans-serif" font-size="200" font-weight="900" fill="#fff" text-anchor="middle">
      <text x="540" y="300">${uno ?? ""}</text>
      <text x="540" y="520">${dos ?? ""}</text>
      <text x="540" y="740">${tres ?? ""}</text>
    </g></svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function bytesDe(uri: string): Buffer {
  return Buffer.from(uri.split(",")[1], "base64");
}

describe("miniaturaDesdeBytes", () => {
  it("devuelve un data URI webp válido y pequeño", async () => {
    const uri = await miniaturaDesdeBytes(await portadaConDetalle());

    assert.ok(uri);
    assert.ok(uri.startsWith(PREFIJO_MINIATURA));
    assert.ok(esMiniaturaValida(uri), "pasa la validación de vista-recurso");
    assert.ok(uri.length <= 4096, `ocupa ${uri.length} caracteres`);
  });

  it("mide 16 px de ancho y conserva la proporción", async () => {
    const uri = await miniaturaDesdeBytes(await portadaConDetalle());
    const meta = await sharp(bytesDe(uri!)).metadata();

    assert.equal(meta.width, 16);
    assert.ok(meta.height! >= 20 && meta.height! <= 32, `alto ${meta.height}`);
  });

  it("no conserva el detalle de la portada", async () => {
    const uri = await miniaturaDesdeBytes(await portadaConDetalle());
    const { data, info } = await sharp(bytesDe(uri!))
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // El tablero va de 0 a 255; tras reducir y desenfocar, solo queda
    // un gris casi uniforme: ningún par de píxeles vecinos se separa.
    let maxSalto = 0;
    for (let i = 1; i < info.width * info.height; i++) {
      maxSalto = Math.max(maxSalto, Math.abs(data[i] - data[i - 1]));
    }
    assert.ok(maxSalto < 24, `salto máximo entre vecinos: ${maxSalto}`);
  });

  it("con un título grande y una figura, solo quedan manchas de color", async () => {
    const uri = await miniaturaDesdeBytes(
      await portadaConTitulo("NOCHE DE PECADO")
    );

    const { data, info } = await sharp(bytesDe(uri!))
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const ancho = info.width;
    const alto = info.height;

    /*
      Las líneas del título no se separan: en la banda superior, el
      brillo por filas no baja entre una línea y la siguiente. Con el
      desenfoque anterior (32 px, sigma 3) esta medida daba 28.
    */
    const filas: number[] = [];
    for (let y = 0; y < Math.floor(alto * 0.42); y++) {
      let suma = 0;
      for (let x = 0; x < ancho; x++) suma += data[y * ancho + x];
      filas.push(suma / ancho);
    }

    let valle = 0;
    for (let i = 1; i < filas.length - 1; i++) {
      const izquierda = Math.max(...filas.slice(0, i));
      const derecha = Math.max(...filas.slice(i + 1));
      valle = Math.max(valle, Math.min(izquierda, derecha) - filas[i]);
    }
    assert.ok(valle < 3, `valle entre líneas del título: ${valle}`);

    /*
      Sin contornos: ni letras ni silueta. Con el desenfoque anterior
      el borde más fuerte era de 59 sobre 255.
    */
    let borde = 0;
    for (let y = 0; y < alto; y++) {
      for (let x = 1; x < ancho; x++) {
        borde = Math.max(
          borde,
          Math.abs(data[y * ancho + x] - data[y * ancho + x - 1])
        );
      }
    }
    assert.ok(borde < 24, `borde horizontal máximo: ${borde}`);
  });

  it("las miniaturas del desenfoque anterior ya no son válidas", () => {
    assert.equal(esMiniaturaValida("data:image/webp;base64,AAAA"), false);
    assert.equal(esMiniaturaValida(`${PREFIJO_MINIATURA}AAAA`), true);
    assert.equal(esMiniaturaValida("https://ejemplo.com/a.jpg"), false);
  });

  it("con bytes que no son imagen devuelve null", async () => {
    assert.equal(await miniaturaDesdeBytes(Buffer.from("no es una imagen")), null);
  });
});

describe("generarMiniaturaBloqueada: de dónde lee", () => {
  const fetchOriginal = globalThis.fetch;
  let pedidas: string[] = [];

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    pedidas = [];
  });

  function vigilarFetch() {
    globalThis.fetch = (async (url: string | URL) => {
      pedidas.push(String(url));
      return new Response(null, { status: 404 });
    }) as typeof fetch;
  }

  it("ignora hosts que no son el almacén público de Blob", async () => {
    vigilarFetch();

    for (const url of [
      "https://ejemplo.com/portada.png",
      "http://abc.public.blob.vercel-storage.com/portada.png",
      "https://public.blob.vercel-storage.com.malo.com/portada.png",
      "https://169.254.169.254/latest/meta-data",
    ]) {
      assert.equal(await generarMiniaturaBloqueada(url), null, url);
    }

    assert.deepEqual(pedidas, []);
  });

  it("sí pide al almacén público de Blob (https)", async () => {
    vigilarFetch();

    await generarMiniaturaBloqueada(
      "https://abc123.public.blob.vercel-storage.com/product-images/x.jpg"
    );

    assert.equal(pedidas.length, 1);
  });

  it("no sale de public/ con rutas locales", async () => {
    for (const ruta of ["/../.env", "/..%2f.env", "/product-images/../../.env"]) {
      assert.equal(await generarMiniaturaBloqueada(ruta), null, ruta);
    }
  });

  it("sin referencia devuelve null", async () => {
    assert.equal(await generarMiniaturaBloqueada(null), null);
    assert.equal(await generarMiniaturaBloqueada(""), null);
  });
});
