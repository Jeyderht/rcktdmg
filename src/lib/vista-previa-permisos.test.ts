/**
 * Pruebas de permisos de «vista previa libre» (vista-previa-permisos.ts).
 *
 *   npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_RECURSOS_POR_CAMBIO,
  autorizarCambio,
  esErrorCambio,
  leerPeticion,
} from "./vista-previa-permisos";

const RECURSOS = [
  { id: "cmrecursoana00000000001", creatorId: "ana" },
  { id: "cmrecursoana00000000002", creatorId: "ana" },
  { id: "cmrecursoleo00000000001", creatorId: "leo" },
];
const [ANA_1, ANA_2, LEO_1] = RECURSOS.map((r) => r.id);

describe("autorizarCambio", () => {
  it("visitante sin sesión → 403", () => {
    const r = autorizarCambio(null, [ANA_1], RECURSOS);
    assert.ok(esErrorCambio(r));
    assert.equal(r.status, 403);
  });

  it("CLIENT → 403, aunque el recurso exista", () => {
    const r = autorizarCambio({ userId: "ana", role: "CLIENT" }, [ANA_1], RECURSOS);
    assert.ok(esErrorCambio(r));
    assert.equal(r.status, 403);
  });

  it("creador en su propio recurso → permitido", () => {
    const r = autorizarCambio({ userId: "ana", role: "CREATOR" }, [ANA_1], RECURSOS);
    assert.deepEqual(r, { ok: true });
  });

  it("creador en varios recursos suyos → permitido", () => {
    const r = autorizarCambio({ userId: "ana", role: "CREATOR" }, [ANA_1, ANA_2], RECURSOS);
    assert.deepEqual(r, { ok: true });
  });

  it("creador ajeno → 403", () => {
    const r = autorizarCambio({ userId: "ana", role: "CREATOR" }, [LEO_1], RECURSOS);
    assert.ok(esErrorCambio(r));
    assert.equal(r.status, 403);
  });

  it("creador con uno suyo y uno ajeno → 403 (no se cambia ninguno)", () => {
    const r = autorizarCambio({ userId: "ana", role: "CREATOR" }, [ANA_1, LEO_1], RECURSOS);
    assert.ok(esErrorCambio(r));
    assert.equal(r.status, 403);
  });

  it("creador con un id que no existe → 403 (no revela si existe)", () => {
    const r = autorizarCambio({ userId: "ana", role: "CREATOR" }, ["cmnoexiste000000000001"], RECURSOS);
    assert.ok(esErrorCambio(r));
    assert.equal(r.status, 403);
  });

  it("ADMIN en recursos de cualquiera → permitido", () => {
    const r = autorizarCambio({ userId: "admin", role: "ADMIN" }, [ANA_1, LEO_1], RECURSOS);
    assert.deepEqual(r, { ok: true });
  });
});

describe("leerPeticion", () => {
  it("acepta ids y un booleano, sin duplicados", () => {
    assert.deepEqual(leerPeticion({ ids: [ANA_1, ANA_1, LEO_1], previewLibre: false }), {
      ids: [ANA_1, LEO_1],
      previewLibre: false,
    });
  });

  const malas: [string, unknown][] = [
    ["sin cuerpo", null],
    ["previewLibre no booleano", { ids: [ANA_1], previewLibre: "false" }],
    ["sin ids", { previewLibre: true }],
    ["ids vacío", { ids: [], previewLibre: true }],
    ["id con caracteres raros", { ids: ["../../etc"], previewLibre: true }],
    ["id no texto", { ids: [42], previewLibre: true }],
  ];

  for (const [nombre, cuerpo] of malas) {
    it(`${nombre} → 400`, () => {
      const r = leerPeticion(cuerpo);
      assert.ok(esErrorCambio(r));
      assert.equal(r.status, 400);
    });
  }

  it(`más de ${MAX_RECURSOS_POR_CAMBIO} recursos → 400`, () => {
    const ids = Array.from({ length: MAX_RECURSOS_POR_CAMBIO + 1 }, (_, i) => `cmrecurso${String(i).padStart(15, "0")}`);
    const r = leerPeticion({ ids, previewLibre: false });
    assert.ok(esErrorCambio(r));
    assert.equal(r.status, 400);
  });
});
