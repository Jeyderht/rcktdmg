import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { yaAdquiridos } from "@/lib/adquisiciones";

/**
 * ¿Queda algo en el carrito que ya sea suyo?
 *
 * El carrito vive en el navegador, así que puede llevar horas
 * ahí mientras la compra ocurría en otra pestaña, en otro
 * dispositivo o en otra sesión. Esta ruta existe para que el
 * checkout lo sepa AL ABRIRSE y no al pulsar comprar: llegar
 * hasta el botón de pago para que entonces te digan que ya lo
 * tienes es una pérdida de tiempo evitable.
 *
 * No escribe nada y no crea ningún pedido. Quien no ha
 * iniciado sesión recibe las tres listas vacías, que es la
 * respuesta correcta: sin cuenta no se ha comprado nada.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json({
        yaAdquiridos: { productos: [], packs: [], colecciones: [] },
      });
    }

    const body = await request.json().catch(() => ({}));

    const comoLista = (valor: unknown): string[] =>
      Array.isArray(valor)
        ? valor.filter((x): x is string => typeof x === "string").slice(0, 200)
        : [];

    const repetidos = await yaAdquiridos(session.userId, {
      productIds: comoLista(body.productIds),
      packIds: comoLista(body.packIds),
      collectionIds: comoLista(body.collectionIds),
    });

    return NextResponse.json({ yaAdquiridos: repetidos });
  } catch (error) {
    console.error("POST revisar carrito:", error);

    /*
      Un fallo aquí NO debe impedir comprar: se responde que no
      hay nada repetido y el pedido lo comprobará igualmente
      antes de crearse, que es donde la comprobación es
      obligatoria.
    */
    return NextResponse.json({
      yaAdquiridos: { productos: [], packs: [], colecciones: [] },
    });
  }
}
