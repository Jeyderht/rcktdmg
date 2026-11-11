/**
 * Pruebas del webhook de Culqi: el importe y la moneda del evento
 * tienen que coincidir con los del pedido antes de darlo por pagado.
 *
 *   npx tsx --test --experimental-test-module-mocks src/app/api/webhooks/culqi/route.test.ts
 *
 * No usa ninguna base de datos: src/lib/prisma.ts reutiliza
 * globalThis.prisma, y aquí se pone un doble en memoria con solo
 * lo que toca el webhook. `fulfillPaidOrder` se sustituye por una
 * versión que marca el pedido como pagado y cuenta las llamadas.
 */

import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

import { compararImporte } from "@/lib/importe-pago";

const SECRETO = "secreto-solo-de-prueba";
process.env.CULQI_WEBHOOK_SECRET = SECRETO;

type Pedido = { id: string; status: string; total: string };
type Aviso = { userId: string; type: string; title: string; body: string | null };

let pedido: Pedido;
let pago: { id: string; orderId: string; transactionId: string; status: string };
let avisos: Aviso[];
let cumplidos: number;

const base = {
  payment: {
    findFirst: async ({ where }: { where: { transactionId: string } }) =>
      where.transactionId === pago.transactionId ? { id: pago.id, orderId: pago.orderId } : null,
    update: async ({ data }: { data: { status: string } }) => {
      pago.status = data.status;
      return pago;
    },
  },
  order: {
    findUnique: async () => ({ status: pedido.status, total: pedido.total }),
  },
  user: {
    findMany: async () => [{ id: "admin-1" }],
  },
  notification: {
    findFirst: async ({ where }: { where: { type: string; body: { contains: string } } }) =>
      avisos.find((a) => a.type === where.type && (a.body ?? "").includes(where.body.contains)) ?? null,
    createMany: async ({ data }: { data: Aviso[] }) => {
      avisos.push(...data);
      return { count: data.length };
    },
  },
};
(globalThis as unknown as { prisma?: unknown }).prisma = base;

mock.module("@/lib/orders", {
  namedExports: {
    fulfillPaidOrder: async () => {
      cumplidos++;
      pedido.status = "PAID";
    },
  },
});

let POST: (req: Request) => Promise<Response>;

function evento(amount: unknown, currency_code: unknown = "PEN") {
  return new Request("http://localhost/api/webhooks/culqi", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-rcktdmg-webhook-secret": SECRETO },
    body: JSON.stringify({
      event: { data: { id: "ord_live_prueba", status: "paid", amount, currency_code } },
    }),
  });
}

describe("compararImporte", () => {
  it("mismo importe en céntimos y PEN → ok", () => {
    assert.deepEqual(compararImporte({ amount: 2500, currency_code: "PEN" }, "25.00"), { ok: true });
  });
  it("redondea como al crear la orden (9.99 → 999)", () => {
    assert.deepEqual(compararImporte({ amount: 999, currency_code: "pen" }, "9.99"), { ok: true });
  });
  it("importe menor → no ok, con los dos importes", () => {
    const r = compararImporte({ amount: 100, currency_code: "PEN" }, "25.00");
    assert.equal(r.ok, false);
    assert.ok(!r.ok && r.motivo === "importe" && r.esperadoCentimos === 2500 && r.recibidoCentimos === 100);
  });
  it("importe ausente o no entero → no ok", () => {
    assert.equal(compararImporte({ currency_code: "PEN" }, "25.00").ok, false);
    assert.equal(compararImporte({ amount: "25.00", currency_code: "PEN" }, "25.00").ok, false);
  });
  it("otra moneda → no ok", () => {
    const r = compararImporte({ amount: 2500, currency_code: "USD" }, "25.00");
    assert.ok(!r.ok && r.motivo === "moneda" && r.monedaRecibida === "USD");
  });
});

describe("POST /api/webhooks/culqi", () => {
  before(async () => {
    ({ POST } = await import("./route"));
  });

  beforeEach(() => {
    pedido = { id: "pedido-1", status: "PENDING", total: "25.00" };
    pago = { id: "pago-1", orderId: "pedido-1", transactionId: "ord_live_prueba", status: "PENDING" };
    avisos = [];
    cumplidos = 0;
  });

  it("importe correcto → pedido pagado y pago aprobado", async () => {
    const r = await POST(evento(2500));
    assert.equal(r.status, 200);
    assert.equal(cumplidos, 1);
    assert.equal(pedido.status, "PAID");
    assert.equal(pago.status, "APPROVED");
    assert.equal(avisos.length, 0);
  });

  it("importe menor → 200 sin reintento, pedido sin pagar y aviso a administración", async () => {
    const r = await POST(evento(100));
    assert.equal(r.status, 200);
    assert.equal(((await r.json()) as { success: boolean }).success, false);
    assert.equal(cumplidos, 0);
    assert.equal(pedido.status, "PENDING");
    assert.equal(pago.status, "PENDING");
    assert.equal(avisos.length, 1);
    assert.match(avisos[0].body ?? "", /pedido-1.*S\/ 25\.00.*S\/ 1\.00/);
  });

  it("importe menor repetido → un solo aviso", async () => {
    await POST(evento(100));
    await POST(evento(100));
    assert.equal(avisos.length, 1);
    assert.equal(cumplidos, 0);
  });

  it("otra moneda → no se paga", async () => {
    const r = await POST(evento(2500, "USD"));
    assert.equal(r.status, 200);
    assert.equal(cumplidos, 0);
    assert.equal(pedido.status, "PENDING");
  });

  it("evento repetido con el pedido ya pagado → idempotente", async () => {
    await POST(evento(2500));
    const r = await POST(evento(2500));
    assert.equal(r.status, 200);
    assert.equal(cumplidos, 1);
    assert.equal(pedido.status, "PAID");
  });

  it("sin firma → 401 y nada cambia", async () => {
    const r = await POST(new Request("http://localhost/api/webhooks/culqi", { method: "POST", body: "{}" }));
    assert.equal(r.status, 401);
    assert.equal(cumplidos, 0);
  });
});
