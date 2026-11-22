import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { disposicionDescarga } from "./descarga-cabeceras";

describe("Content-Disposition para descargas", () => {
  it("conserva nombres ASCII", () => {
    assert.equal(
      disposicionDescarga("plantilla.psd"),
      'attachment; filename="plantilla.psd"; filename*=UTF-8\'\'plantilla.psd'
    );
  });

  it("codifica nombres Unicode", () => {
    const header = disposicionDescarga("diseño final.psd");
    assert.match(header, /filename="dise_o final.psd"/);
    assert.match(header, /filename\*=UTF-8''dise%C3%B1o%20final.psd/);
  });

  it("neutraliza inyección CRLF y comillas", () => {
    const header = disposicionDescarga('mal"\r\nX-Injected: yes.zip');
    assert.ok(!header.includes("\r"));
    assert.ok(!header.includes("\n"));
    assert.match(header, /filename="mal___X-Injected: yes.zip"/);
  });

  it("elimina separadores de rutas", () => {
    const header = disposicionDescarga("carpeta/archivo\\final.zip");
    assert.match(header, /filename="carpeta_archivo_final.zip"/);
  });
});
