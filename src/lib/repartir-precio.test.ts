import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { repartirPrecio } from "./repartir-precio";

for (const pesos of [[1, 1, 1, 1], [0, 0, 0, 0], [100, 0, 5, 2]]) {
  test(`reparte dos céntimos sin líneas negativas con pesos ${pesos}`, () => {
    const total = new Prisma.Decimal("0.02");
    const partes = repartirPrecio(total, pesos.map(peso => ({ price: new Prisma.Decimal(peso) })));
    assert.equal(partes.length, pesos.length);
    assert.ok(partes.every(parte => parte.gte(0) && parte.decimalPlaces() <= 2));
    assert.ok(partes.reduce((suma, parte) => suma.add(parte), new Prisma.Decimal(0)).equals(total));
  });
}
