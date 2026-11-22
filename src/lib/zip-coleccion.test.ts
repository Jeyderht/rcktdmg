import assert from "node:assert/strict";
import test from "node:test";
import { nombreDeEntrada, MAXIMO_BYTES_ZIP, MAXIMO_PIEZAS_ZIP } from "./zip-coleccion";

test("ZIP entry names cannot escape the archive root", () => {
  const name = nombreDeEntrada(2, "../../private\\\\secret:\\u0000", "PSD");
  assert.equal(name.startsWith("02 - "), true);
  assert.equal(name.endsWith(".psd"), true);
  assert.equal(name.includes("/"), false);
  assert.equal(name.includes("\\\\"), false);
  assert.equal(name.includes(":"), false);
  assert.equal(name.includes("\\u0000"), false);
});

test("ZIP entry names have safe fallbacks and formats", () => {
  assert.equal(nombreDeEntrada(1, "   ", null), "01 - recurso-1");
  assert.equal(nombreDeEntrada(3, "Mockup", "../../svg"), "03 - Mockup.svg");
});

test("automatic ZIP limits are explicit and bounded", () => {
  assert.equal(MAXIMO_PIEZAS_ZIP, 25);
  assert.equal(MAXIMO_BYTES_ZIP, 120 * 1024 * 1024);
});
