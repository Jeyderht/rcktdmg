/**
 * Pruebas del plan del relleno de marca de agua (relleno-marca-agua.ts).
 * No tocan la base ni el almacén.
 *
 *   npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planificarRelleno } from "./relleno-marca-agua";

const COPIA =
  "https://abc.public.blob.vercel-storage.com/product-previews/0f8fad5b-d9cb-469f-a165-70867728950e.jpg";
const VIEJA = "https://abc.public.blob.vercel-storage.com/product-images/a.jpg";
const OTRA = "https://abc.public.blob.vercel-storage.com/product-images/b.jpg";

describe("planificarRelleno", () => {
  it("salta lo que ya es una copia con marca", () => {
    const plan = planificarRelleno([
      { id: "p1", coverUrl: COPIA, previewUrl: null, images: [{ id: "i1", url: COPIA }] },
    ]);

    assert.deepEqual(plan.pendientes, []);
    assert.equal(plan.yaConMarca, 2);
  });

  it("la misma URL en varios campos da una sola copia, con todos sus usos", () => {
    const plan = planificarRelleno([
      { id: "p1", coverUrl: VIEJA, previewUrl: VIEJA, images: [{ id: "i1", url: VIEJA }] },
      { id: "p2", coverUrl: VIEJA, previewUrl: null, images: [] },
    ]);

    assert.equal(plan.pendientes.length, 1);
    assert.deepEqual(plan.pendientes[0].usos, [
      { tipo: "portada", productId: "p1" },
      { tipo: "vistaPrevia", productId: "p1" },
      { tipo: "galeria", productId: "p1", imageId: "i1" },
      { tipo: "portada", productId: "p2" },
    ]);
  });

  it("ignora los campos vacíos y mezcla viejas con copias", () => {
    const plan = planificarRelleno([
      { id: "p1", coverUrl: null, previewUrl: null, images: [] },
      { id: "p2", coverUrl: COPIA, previewUrl: OTRA, images: [] },
    ]);

    assert.deepEqual(plan.pendientes.map((p) => p.url), [OTRA]);
    assert.equal(plan.yaConMarca, 1);
  });
});
