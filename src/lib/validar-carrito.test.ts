import assert from "node:assert/strict";
import test from "node:test";
import { validarCarrito } from "./validar-carrito";

test("acepta producto individual válido", () => {
  assert.deepEqual(validarCarrito({ items: [{ productId: " p1 ", quantity: 1 }] }), {
    ok: true,
    items: [{ productId: "p1", packId: "", collectionId: "", quantity: 1 }],
  });
});

test("acepta packs y colecciones", () => {
  const result = validarCarrito({ items: [
    { packId: "pack-1", quantity: 1 },
    { collectionId: "col-1", quantity: 1 },
  ] });
  assert.equal(result.ok, true);
});

for (const [name, body] of [
  ["cuerpo vacío", null],
  ["lista vacía", { items: [] }],
  ["línea null", { items: [null] }],
  ["línea string", { items: ["producto"] }],
  ["línea array", { items: [[]] }],
  ["cantidad string", { items: [{ productId: "p1", quantity: "1" }] }],
  ["cantidad fraccionaria", { items: [{ productId: "p1", quantity: 1.5 }] }],
  ["dos tipos", { items: [{ productId: "p1", packId: "a", quantity: 1 }] }],
  ["sin ID", { items: [{ quantity: 1 }] }],
  ["ID no string", { items: [{ productId: 123, quantity: 1 }] }],
  ["duplicado con espacios", { items: [
    { productId: "p1", quantity: 1 }, { productId: " p1 ", quantity: 1 },
  ] }],
  ["una línea inválida entre válidas", { items: [
    { productId: "p1", quantity: 1 }, { productId: "p2", quantity: 0 },
  ] }],
  ["más de 50 líneas", { items: Array.from({ length: 51 }, (_, i) => ({
    productId: `p${i}`, quantity: 1,
  })) }],
] as const) {
  test(`rechaza ${name}`, () => {
    const result = validarCarrito(body);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
  });
}
