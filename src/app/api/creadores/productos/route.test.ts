/**
 * Prueba de la ruta de creación de recursos: qué valor de
 * previewLibre se guarda.
 *
 *   npm run test:db
 *
 * Usa la base LOCAL, pero no deja nada en ella: cada caso llama a
 * la ruta real (POST) dentro de una transacción de Prisma que se
 * revierte siempre al final. Antes comprueba que la base es local y
 * después que no queda ningún recurso nuevo.
 *
 * Cómo entra la transacción en la ruta: src/lib/prisma.ts reutiliza
 * globalThis.prisma si existe, así que antes de importar la ruta se
 * pone ahí un intermediario que envía cada consulta a la transacción
 * en curso. La sesión es un token firmado con un secreto solo de
 * prueba y next/headers se sustituye por una cookie fija.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

import { Prisma, PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";

type Cliente = PrismaClient | Prisma.TransactionClient;

/* Secreto propio de la prueba: el token se firma y se lee aquí mismo. */
process.env.AUTH_SECRET = `solo-prueba-${randomUUID()}`;

let token: string | null = null;

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (nombre: string) =>
        nombre === "rcktdmg_session" && token ? { value: token } : undefined,
    }),
  },
});

const real = new PrismaClient();
let actual: Cliente = real;

/*
  Dentro de una transacción interactiva no existe $transaction; la de
  lista que usa sincronizarTagsProducto se ejecuta en orden dentro de
  la transacción en curso.
*/
const intermediario = new Proxy(
  {},
  {
    get(_, clave) {
      if (clave === "$transaction" && actual !== real) {
        return async (consultas: Promise<unknown>[]) => {
          const resultados: unknown[] = [];
          for (const consulta of consultas) resultados.push(await consulta);
          return resultados;
        };
      }
      return Reflect.get(actual, clave);
    },
  }
);
(globalThis as unknown as { prisma?: unknown }).prisma = intermediario;

class Revertir extends Error {}

/** Ejecuta `fn` en una transacción que se deshace siempre. */
async function sinDejarRastro<T>(fn: (tx: Cliente) => Promise<T>): Promise<T> {
  let resultado: T | undefined;

  await real
    .$transaction(
      async (tx) => {
        actual = tx;
        try {
          resultado = await fn(tx);
        } finally {
          actual = real;
        }
        throw new Revertir();
      },
      { timeout: 30_000 }
    )
    .catch((error) => {
      if (!(error instanceof Revertir)) throw error;
    });

  return resultado as T;
}

const PREFIJO = `PRUEBA vista previa ${randomUUID()}`;

let POST: (req: NextRequest) => Promise<Response>;
let recursosAntes = 0;

async function crear(
  tx: Cliente,
  extra: Record<string, unknown>
): Promise<{ status: number; previewLibre: boolean | null }> {
  const creador = await tx.user.findFirst({
    where: { role: "CREATOR" },
    select: { id: true, name: true, email: true, role: true },
  });
  const categoria = await tx.category.findFirst({
    where: { isActive: true, slug: { not: "eventos" } },
    select: { id: true },
  });
  assert.ok(creador, "hace falta un creador en la base local");
  assert.ok(categoria, "hace falta una categoría activa en la base local");

  const { createSessionToken } = await import("@/lib/auth");
  token = await createSessionToken(creador);

  const respuesta = await POST(
    new NextRequest("http://localhost/api/creadores/productos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${PREFIJO} ${randomUUID()}`,
        description: "Recurso de prueba; la transacción se revierte.",
        categoryId: categoria.id,
        price: 10,
        ...extra,
      }),
    })
  );

  const datos = (await respuesta.json()) as { product?: { id: string } };
  const guardado = datos.product
    ? await tx.product.findUnique({
        where: { id: datos.product.id },
        select: { previewLibre: true, status: true, creatorId: true },
      })
    : null;

  if (guardado) {
    assert.equal(guardado.status, "DRAFT");
    assert.equal(guardado.creatorId, creador.id);
  }

  return { status: respuesta.status, previewLibre: guardado?.previewLibre ?? null };
}

describe("POST /api/creadores/productos · previewLibre", () => {
  before(async () => {
    /* Nunca contra una base que no sea la de esta máquina. */
    const [{ host }] = await real.$queryRaw<{ host: string | null }[]>`
      SELECT host(inet_server_addr()) AS host`;
    assert.ok(
      host === null || host === "127.0.0.1" || host === "::1",
      `la prueba solo corre contra la base local (servidor: ${host})`
    );

    recursosAntes = await real.product.count();
    ({ POST } = await import("./route"));
  });

  after(async () => {
    /* Después: ni un recurso más, ni ninguno con el nombre de prueba. */
    assert.equal(await real.product.count(), recursosAntes);
    assert.equal(
      await real.product.count({ where: { name: { startsWith: PREFIJO } } }),
      0
    );
    await real.$disconnect();
  });

  it("con previewLibre = false se guarda false", async () => {
    const r = await sinDejarRastro((tx) => crear(tx, { previewLibre: false }));
    assert.equal(r.status, 201);
    assert.equal(r.previewLibre, false);
  });

  it("sin previewLibre se guarda true", async () => {
    const r = await sinDejarRastro((tx) => crear(tx, {}));
    assert.equal(r.status, 201);
    assert.equal(r.previewLibre, true);
  });

  it("con previewLibre = true se guarda true", async () => {
    const r = await sinDejarRastro((tx) => crear(tx, { previewLibre: true }));
    assert.equal(r.status, 201);
    assert.equal(r.previewLibre, true);
  });

  it("con un valor que no es booleano → 400 y no se crea nada", async () => {
    const r = await sinDejarRastro((tx) => crear(tx, { previewLibre: "no" }));
    assert.equal(r.status, 400);
    assert.equal(r.previewLibre, null);
  });

  it("la transacción se revierte: el recurso no queda en la base", async () => {
    let id: string | undefined;
    await sinDejarRastro(async (tx) => {
      await crear(tx, { previewLibre: false });
      id = (
        await tx.product.findFirst({
          where: { name: { startsWith: PREFIJO } },
          select: { id: true },
        })
      )?.id;
    });
    assert.ok(id, "dentro de la transacción el recurso existe");
    assert.equal(await real.product.findUnique({ where: { id } }), null);
  });
});
