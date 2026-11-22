import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { importesDePedidoValidos } from "./importes-pedido";

const d = (value: string) => new Prisma.Decimal(value);
const lineas = [{ price: d("19.90"), quantity: 1 }, { price: d("15.00"), quantity: 2 }];

test("acepta suma exacta sin descuento", () => {
  assert.equal(importesDePedidoValidos(lineas, d("49.90"), d("0"), d("49.90")), true);
});
test("acepta descuento aplicado correctamente", () => {
  assert.equal(importesDePedidoValidos(lineas, d("49.90"), d("9.90"), d("40.00")), true);
});
test("rechaza subtotal manipulado", () => {
  assert.equal(importesDePedidoValidos(lineas, d("49.00"), d("0"), d("49.00")), false);
});
test("rechaza total manipulado", () => {
  assert.equal(importesDePedidoValidos(lineas, d("49.90"), d("0"), d("0.01")), false);
});
test("rechaza descuento negativo", () => {
  assert.equal(importesDePedidoValidos(lineas, d("49.90"), d("-1"), d("50.90")), false);
});
test("rechaza total negativo", () => {
  assert.equal(importesDePedidoValidos(lineas, d("49.90"), d("60"), d("-10.10")), false);
});
test("rechaza pedidos vacíos", () => {
  assert.equal(importesDePedidoValidos([], d("0"), d("0"), d("0")), false);
});
for (const cantidad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
  test(`rechaza cantidad inválida: ${cantidad}`, () => {
    assert.equal(importesDePedidoValidos([{ price: d("1"), quantity: cantidad }], d("1"), d("0"), d("1")), false);
  });
}
test("rechaza precios negativos", () => {
  assert.equal(importesDePedidoValidos([{ price: d("-1"), quantity: 1 }], d("-1"), d("0"), d("-1")), false);
});
