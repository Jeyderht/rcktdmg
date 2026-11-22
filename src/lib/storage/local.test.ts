import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { esRutaPrivadaLocal, nombreDeArchivoLocal } from "./local";

describe("Referencias privadas de recursos de diseño", () => {
  it("acepta PSD y ZIP en almacenamiento privado", () => {
    assert.equal(nombreDeArchivoLocal("/storage/products/plantilla.psd"), "plantilla.psd");
    assert.equal(nombreDeArchivoLocal("/storage/products/recursos.zip"), "recursos.zip");
  });

  it("mantiene compatibilidad con referencias antiguas", () => {
    assert.equal(nombreDeArchivoLocal("/api/download-file/mockup.ai"), "mockup.ai");
    assert.equal(esRutaPrivadaLocal("/api/download-file/mockup.ai"), true);
  });

  it("admite nombres Unicode codificados", () => {
    assert.equal(nombreDeArchivoLocal("/storage/products/dise%C3%B1o%20final.psd"), "diseño final.psd");
  });

  it("rechaza traversal y separadores codificados", () => {
    for (const ref of [
      "/storage/products/../secreto.psd",
      "/storage/products/%2e%2e%2fsecreto.psd",
      "/storage/products/carpeta%5Csecreto.zip",
      "/storage/products/%2Fetc%2Fpasswd",
    ]) {
      assert.equal(nombreDeArchivoLocal(ref), null, ref);
    }
  });

  it("rechaza bytes de control y codificación inválida", () => {
    for (const ref of [
      "/storage/products/dise%C3%B1o%00.psd",
      "/storage/products/archivo%0A.psd",
      "/storage/products/archivo%7F.zip",
      "/storage/products/%ZZ.psd",
      "/storage/products/",
    ]) {
      assert.equal(nombreDeArchivoLocal(ref), null, ref);
    }
  });

  it("no reconoce rutas públicas como almacenamiento privado", () => {
    assert.equal(esRutaPrivadaLocal("/images/preview.psd"), false);
  });
});
