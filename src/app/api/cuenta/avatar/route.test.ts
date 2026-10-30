/**
 * Pruebas de la foto de perfil del cliente:
 *   - PATCH /api/cuenta/avatar (elegir uno de los 12 avatares)
 *   - POST /api/uploads/creator-avatar (subir foto), abierta a clientes
 *
 *   npx tsx --test --experimental-test-module-mocks src/app/api/cuenta/avatar/route.test.ts
 *
 * Sin base de datos ni almacén: Prisma es un doble en memoria
 * (globalThis.prisma) y putPublic / olvidarObjeto se sustituyen. La
 * sesión es un token firmado con un secreto solo de prueba.
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { before, beforeEach, describe, it, mock } from "node:test";

process.env.AUTH_SECRET = `solo-prueba-${randomUUID()}`;

type Usuario = { id: string; role: string; avatarUrl: string | null };

let usuarios: Record<string, Usuario>;
let token: string | null = null;
let subidos: { folder: string; fileName: string; contentType?: string; bytes: number }[];
let olvidados: string[];

(globalThis as unknown as { prisma?: unknown }).prisma = {
  user: {
    // Una copia, como Prisma: lo leído no cambia al actualizar.
    findUnique: async ({ where }: { where: { id: string } }) =>
      usuarios[where.id] ? { ...usuarios[where.id] } : null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<Usuario> }) => {
      Object.assign(usuarios[where.id], data);
      return usuarios[where.id];
    },
  },
};

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      get: (n: string) => (n === "rcktdmg_session" && token ? { value: token } : undefined),
    }),
  },
});

mock.module("@/lib/storage", {
  namedExports: {
    putPublic: async (o: { folder: string; fileName: string; data: Buffer; contentType?: string }) => {
      subidos.push({ folder: o.folder, fileName: o.fileName, contentType: o.contentType, bytes: o.data.length });
      return { url: `https://x.public.blob.vercel-storage.com/${o.folder}/${o.fileName}` };
    },
    olvidarObjeto: async (url: string) => {
      olvidados.push(url);
      return "borrado";
    },
  },
});

let PATCH: (r: Request) => Promise<Response>;
let POST: (r: Request) => Promise<Response>;
let firmar: (u: { id: string; name: string | null; email: string; role: string }) => Promise<string>;

async function como(id: string | null) {
  token = id ? await firmar({ id, name: "Prueba", email: `${id}@prueba.test`, role: usuarios[id].role }) : null;
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(0)]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...Array(64).fill(0)]);

function subir(bytes: Buffer, tipo: string) {
  const datos = new FormData();
  datos.append("file", new File([new Uint8Array(bytes)], "foto", { type: tipo }));
  return POST(new Request("http://localhost/api/uploads/creator-avatar", { method: "POST", body: datos }));
}

function elegir(avatar: unknown) {
  return PATCH(
    new Request("http://localhost/api/cuenta/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar }),
    })
  );
}

describe("foto de perfil del cliente", () => {
  before(async () => {
    ({ PATCH } = await import("./route"));
    ({ POST } = await import("../../uploads/creator-avatar/route"));
    ({ createSessionToken: firmar } = await import("@/lib/auth"));
  });

  beforeEach(() => {
    usuarios = {
      cliente: { id: "cliente", role: "CLIENT", avatarUrl: null },
      creador: { id: "creador", role: "CREATOR", avatarUrl: null },
    };
    subidos = [];
    olvidados = [];
    token = null;
  });

  it("cliente elige un avatar → se guarda la ruta pública", async () => {
    await como("cliente");
    const r = await elegir("avatar-03");
    assert.equal(r.status, 200);
    assert.equal(usuarios.cliente.avatarUrl, "/avatars/avatar-03.svg");
  });

  it("un avatar que no existe o una ruta libre → 400", async () => {
    await como("cliente");
    assert.equal((await elegir("avatar-13")).status, 400);
    assert.equal((await elegir("../../etc/passwd")).status, 400);
    assert.equal((await elegir("/avatars/avatar-01.svg")).status, 400);
    assert.equal(usuarios.cliente.avatarUrl, null);
  });

  it("creador → 403 en los avatares; sin sesión → 401", async () => {
    await como("creador");
    assert.equal((await elegir("avatar-01")).status, 403);
    await como(null);
    assert.equal((await elegir("avatar-01")).status, 401);
  });

  it("al pasar de foto subida a avatar, la foto del almacén se olvida", async () => {
    usuarios.cliente.avatarUrl = "https://x.public.blob.vercel-storage.com/creator-avatars/vieja.jpg";
    await como("cliente");
    await elegir("avatar-05");
    assert.deepEqual(olvidados, ["https://x.public.blob.vercel-storage.com/creator-avatars/vieja.jpg"]);
  });

  it("cliente sube un PNG real → se guarda con el tipo detectado y su id en el nombre", async () => {
    await como("cliente");
    const r = await subir(PNG, "image/png");
    assert.equal(r.status, 200);
    assert.equal(subidos.length, 1);
    assert.equal(subidos[0].contentType, "image/png");
    assert.match(subidos[0].fileName, /^cliente-.+\.png$/);
    assert.match(usuarios.cliente.avatarUrl ?? "", /creator-avatars\/cliente-/);
  });

  it("el tipo declarado no basta: un JPG declarado como PNG se guarda como JPG", async () => {
    await como("cliente");
    await subir(JPG, "image/png");
    assert.equal(subidos[0].contentType, "image/jpeg");
    assert.match(subidos[0].fileName, /\.jpg$/);
  });

  it("cliente: un archivo que no es imagen aunque diga image/png → 400", async () => {
    await como("cliente");
    const r = await subir(Buffer.from("<svg onload=alert(1)>no es una imagen</svg>"), "image/png");
    assert.equal(r.status, 400);
    assert.equal(subidos.length, 0);
  });

  it("cliente: más de 2 MB → 400", async () => {
    await como("cliente");
    const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    assert.equal((await subir(grande, "image/png")).status, 400);
    assert.equal(subidos.length, 0);
  });

  it("cliente: la subida directa (confirmación JSON) sigue cerrada → 403", async () => {
    await como("cliente");
    const r = await POST(
      new Request("http://localhost/api/uploads/creator-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: "https://x.public.blob.vercel-storage.com/creator-avatars/otro.jpg" }),
      })
    );
    assert.equal(r.status, 403);
  });

  it("creador: sin cambios (8 MB y su ruta de siempre)", async () => {
    await como("creador");
    const tresMb = Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]);
    const r = await subir(tresMb, "image/png");
    assert.equal(r.status, 200);
    assert.equal(subidos[0].folder, "creator-avatars");
    assert.match(subidos[0].fileName, /^creador-.+\.png$/);
  });
});
