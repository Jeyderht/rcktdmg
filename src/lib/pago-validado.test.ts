import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { pagoAprobadoParaPedido } from "./pago-validado";

const total = new Prisma.Decimal("49.90");

test("no permite acreditar pedidos sin pago", () => {
  assert.equal(pagoAprobadoParaPedido(null, total, "production"), false);
});

test("pago aprobado", () => {
  assert.equal(
    pagoAprobadoParaPedido({ status: "APPROVED", provider: "MERCADOPAGO", amount: new Prisma.Decimal("49.90") }, total, "production"),
    true
  );
});

test("pendiente", () => {
  assert.equal(
    pagoAprobadoParaPedido({ status: "PENDING", provider: "MERCADOPAGO", amount: new Prisma.Decimal("49.90") }, total, "production"),
    false
  );
});

test("importe incorrecto", () => {
  assert.equal(
    pagoAprobadoParaPedido({ status: "APPROVED", provider: "MERCADOPAGO", amount: new Prisma.Decimal("49.89") }, total, "production"),
    false
  );
});

test("prueba en producción", () => {
  assert.equal(
    pagoAprobadoParaPedido({ status: "APPROVED", provider: "TEST", amount: new Prisma.Decimal("49.90") }, total, "production"),
    false
  );
});

test("prueba en desarrollo", () => {
  assert.equal(
    pagoAprobadoParaPedido({ status: "APPROVED", provider: "TEST", amount: new Prisma.Decimal("49.90") }, total, "development"),
    true
  );
});
