"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import VacioCaja from "@/components/VacioCaja";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
    CART_STORAGE_KEY,
    CART_UPDATED_EVENT,
} from "@/components/useCartCount";
import { IconoBasura, IconoBolsa } from "@/components/iconos";

type CartItem = {
    id: string;
    /**
     * Qué es este elemento. Ausente en los que ya estaban
     * guardados antes de que existieran packs y colecciones:
     * aquellos son recursos sueltos y se siguen tratando así.
     */
    kind?: "PRODUCT" | "PACK" | "COLLECTION";
    name: string;
    price: number;
    slug: string;
    /**
     * Pieza del recurso, cuando el carrito la guardó. Decide el
     * marco de la miniatura. Ausente en los carritos anteriores,
     * que caen al marco del catálogo.
     */
    pieceType?: string | null;
  /**
   * Categoría del recurso, cuando el carrito la guardó. Con la
   * pieza, decide el marco de la miniatura. Ausente en los
   * carritos anteriores.
   */
  categorySlug?: string | null;
    coverUrl: string | null;
    quantity: number;
};

/**
 * Página a la que lleva un elemento del carrito.
 *
 * Cada tipo vive en su sección. Antes todo apuntaba a
 * /tienda/[slug], de modo que pulsar un pack guardado llevaba
 * a un 404.
 */
function rutaDe(item: CartItem): string {
    if (item.kind === "PACK") return `/packs/${item.slug}`;

    if (item.kind === "COLLECTION") {
        return `/colecciones-comerciales/${item.slug}`;
    }

    return `/tienda/${item.slug}`;
}

export default function Cart() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    function loadCart() {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);

            const parsed = stored ? JSON.parse(stored) : [];

            setCart(Array.isArray(parsed) ? parsed : []);
        } catch {
            setCart([]);
        } finally {
            setLoaded(true);
        }
    }

    useEffect(() => {
        loadCart();

        window.addEventListener(CART_UPDATED_EVENT, loadCart);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, loadCart);
        };
    }, []);

    function saveCart(newCart: CartItem[]) {
        setCart(newCart);

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(newCart)
        );

        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }

    function increase(id: string) {
        saveCart(
            cart.map((item) =>
                item.id === id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        );
    }

    function decrease(id: string) {
        saveCart(
            cart
                .map((item) =>
                    item.id === id
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    }

    function remove(id: string) {
        saveCart(cart.filter((item) => item.id !== id));
    }

    function clearCart() {
        saveCart([]);
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    const units = cart.reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    if (!loaded) {
        return (
            <>
                <Navbar />

                <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-5">
                    <div className="rk-card h-32 animate-pulse" />
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />

            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-5 lg:pb-24 lg:pt-12">

                {/* ENCABEZADO */}
                <div className="rk-enter flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="rk-eyebrow">RcktX</p>

                        <h1 className="rk-title mt-2 text-[2rem] sm:text-4xl">
                            Carrito
                        </h1>

                        {cart.length > 0 && (
                            <p className="mt-2 text-sm text-ink/60">
                                {units}{" "}
                                {units === 1 ? "artículo" : "artículos"}
                            </p>
                        )}
                    </div>

                    {cart.length > 0 && (
                        <button
                            type="button"
                            onClick={clearCart}
                            className="rk-chip"
                        >
                            <IconoBasura size={13} />
                            Vaciar carrito
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    /* CARRITO VACÍO */
                    <div className="mt-6">
                        <VacioCaja
                            kicker="Carrito"
                            marca="#0"
                            estadoTitulo="Tu pedido"
                            estadoDato="0 recursos"
                            estadoTexto="Esperando recursos"
                            icon={IconoBolsa}
                            title="Tu carrito está vacío"
                            description="Agrega plantillas desde la tienda y aparecerán aquí, listas para pagar."
                            action={{
                                href: "/tienda",
                                label: "Explorar recursos",
                            }}
                        />
                    </div>
                ) : (
                    <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">

                        {/* ARTÍCULOS */}
                        <div className="rk-enter rk-enter-1 space-y-3">
                            {cart.map((item) => (
                                <article key={item.id} className="rk-cart-item">
                                    <Link
                                        href={rutaDe(item)}
                                        className="rk-cart-thumb"
                                        aria-label={item.name}
                                    >
                                        {item.coverUrl ? (
                                            <Image
                                                src={item.coverUrl}
                                                alt={item.name}
                                                fill
                                                sizes="84px"
                                            />
                                        ) : null}
                                    </Link>

                                    <div className="rk-cart-body">
                                        <div className="rk-cart-head">
                                            <Link
                                                href={rutaDe(item)}
                                                className="rk-cart-title"
                                            >
                                                {item.name}
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={() => remove(item.id)}
                                                aria-label={`Quitar ${item.name}`}
                                                className="rk-icon-button rk-icon-button-danger"
                                            >
                                                <IconoBasura />
                                            </button>
                                        </div>

                                        <p className="rk-cart-meta">
                                            S/ {item.price.toFixed(2)} c/u
                                        </p>

                                        <div className="rk-cart-foot">
                                            <div
                                                className="rk-stepper rk-stepper-sm"
                                                role="group"
                                                aria-label="Cantidad"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => decrease(item.id)}
                                                    aria-label="Reducir cantidad"
                                                    className="rk-stepper-btn"
                                                >
                                                    <Minus />
                                                </button>

                                                <output
                                                    className="rk-stepper-value"
                                                    aria-live="polite"
                                                >
                                                    {item.quantity}
                                                </output>

                                                <button
                                                    type="button"
                                                    onClick={() => increase(item.id)}
                                                    aria-label="Aumentar cantidad"
                                                    className="rk-stepper-btn"
                                                >
                                                    <Plus />
                                                </button>
                                            </div>

                                            <p className="rk-cart-total">
                                                <span className="rk-card-currency">S/</span>
                                                {(item.price * item.quantity).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* RESUMEN · estilo pase de abordar */}
                        <div className="rk-enter rk-enter-2 grid gap-3 lg:sticky lg:top-24 lg:self-start">
                            <article className="rk-receipt">
                                <header className="rk-receipt-head">
                                    <div>
                                        <span className="rk-receipt-label">
                                            Resumen del
                                        </span>
                                        <h2 className="rk-receipt-title">pedido</h2>
                                    </div>
                                </header>

                                <ul className="rk-receipt-items">
                                    {cart.map((item) => (
                                        <li key={item.id} className="rk-receipt-item">
                                            {item.coverUrl ? (
                                                <Image
                                                    src={item.coverUrl}
                                                    alt=""
                                                    width={40}
                                                    height={40}
                                                    className="rk-receipt-thumb"
                                                />
                                            ) : (
                                                <span className="rk-receipt-thumb" />
                                            )}
                                            <span className="rk-receipt-name">
                                                {item.name}
                                                {item.quantity > 1
                                                    ? ` × ${item.quantity}`
                                                    : ""}
                                            </span>
                                            <span className="rk-receipt-price">
                                                S/ {(item.price * item.quantity).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <dl className="rk-receipt-strip">
                                    <div>
                                        <dt>Artículos</dt>
                                        <dd>{units}</dd>
                                    </div>
                                    <div>
                                        <dt>Entrega</dt>
                                        <dd>Digital</dd>
                                    </div>
                                    <div>
                                        <dt>Acceso</dt>
                                        <dd>Inmediato</dd>
                                    </div>
                                </dl>

                                {/* Solo importes reales: no hay
                                    descuentos ni impuestos calculados. */}
                                <div className="rk-receipt-rows">
                                    <div className="rk-receipt-row">
                                        <span>Subtotal</span>
                                        <span>S/ {total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <hr className="rk-receipt-cut" />

                                <footer className="rk-receipt-foot">
                                    <div className="rk-receipt-total">
                                        <span className="rk-receipt-label">
                                            Total a pagar
                                        </span>
                                        <strong>
                                            <span className="rk-card-currency">S/</span>
                                            {total.toFixed(2)}
                                        </strong>
                                    </div>

                                    <Link
                                        href="/checkout"
                                        className="rk-btn rk-btn-buy rk-btn-block"
                                    >
                                        Comprar ahora
                                    </Link>
                                </footer>
                            </article>

                            <Link
                                href="/tienda"
                                className="rk-btn rk-btn-line rk-btn-block"
                            >
                                Seguir explorando
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </>
    );
}
