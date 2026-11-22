import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";

import { acreditarPedido } from "./orders";

const db = new PrismaClient();
class Rollback extends Error {}

before(async () => {
  const [{ host }] = await db.$queryRaw<{ host: string | null }[]>`SELECT host(inet_server_addr()) AS host`;
  assert.ok(host === null || host === "127.0.0.1" || host === "::1", "Usa una base de pruebas local");
});
after(() => db.$disconnect());

test("la acreditación genera una descarga y una licencia, y conserva revocaciones al reintentar", async () => {
  await assert.rejects(db.$transaction(async tx => {
    const buyer = await tx.user.findFirstOrThrow({ where: { role: "CLIENT" } });
    const product = await tx.product.findFirstOrThrow({ where: { status: "PUBLISHED" } });
    const total = new Prisma.Decimal("10.00");
    const order = await tx.order.create({
      data: {
        userId: buyer.id, subtotal: total, total,
        items: { create: { productId: product.id, price: total } },
        payment: { create: { provider: "CULQI", amount: total, status: "APPROVED" } },
      },
    });
    assert.equal((await acreditarPedido(tx, order.id)).yaEstabaPagado, false);
    const where = { orderId: order.id };
    const license = await tx.license.findFirstOrThrow({ where });
    assert.equal(license.type, product.licenseType);
    await tx.license.update({ where: { id: license.id }, data: { status: "REVOKED" } });
    assert.equal((await acreditarPedido(tx, order.id)).yaEstabaPagado, true);
    assert.equal(await tx.download.count({ where }), 1);
    assert.equal(await tx.license.count({ where }), 1);
    assert.equal((await tx.license.findUniqueOrThrow({ where: { id: license.id } })).status, "REVOKED");
    throw new Rollback();
  }), Rollback);
});
