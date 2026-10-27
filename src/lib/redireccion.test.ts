/**
 * Pruebas del validador de `?redirect=` (src/lib/redireccion.ts).
 *
 *   npm test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { conDestino, destinoDeBusqueda, destinoInterno } from "./redireccion";

describe("destinoInterno · acepta rutas internas", () => {
  const validas: [string, string][] = [
    ["/", "/"],
    ["/tienda", "/tienda"],
    ["/tienda/flyer-neon", "/tienda/flyer-neon"],
    ["/tienda?categoria=eventos&page=2", "/tienda?categoria=eventos&page=2"],
    ["/tienda/flyer#galeria", "/tienda/flyer#galeria"],
    ["/creadores/ana?categoria=general#recursos", "/creadores/ana?categoria=general#recursos"],
    ["/buscar?q=fiesta%20neon", "/buscar?q=fiesta%20neon"],
    // Una %2f que NO va al principio no cambia de origen.
    ["/tienda/a%2fb", "/tienda/a%2fb"],
    // Los puntos se resuelven dentro del mismo origen.
    ["/tienda/../packs", "/packs"],
  ];

  for (const [entrada, esperado] of validas) {
    it(`${JSON.stringify(entrada)} → ${esperado}`, () => {
      assert.equal(destinoInterno(entrada), esperado);
    });
  }
});

describe("destinoInterno · rechaza redirecciones abiertas", () => {
  const invalidas: [string, unknown][] = [
    // Dos barras y barra invertida (el fallo que había: /\evil.com).
    ["protocolo relativo //", "//evil.com"],
    ["tres barras", "///evil.com"],
    ["/\\", "/\\evil.com"],
    ["/\\ doble", "/\\\\evil.com"],
    ["barra invertida al principio", "\\evil.com"],
    ["\\\\ al principio", "\\\\evil.com"],
    ["barra invertida en medio", "/tienda\\..\\..\\evil.com"],
    // Codificadas.
    ["%5c", "/%5cevil.com"],
    ["%5C mayúscula", "/%5Cevil.com"],
    ["%2f al principio", "/%2fevil.com"],
    ["%2F al principio", "/%2F%2Fevil.com"],
    ["%5c en medio", "/tienda/%5c%5cevil.com"],
    // Esquemas.
    ["https:", "https://evil.com"],
    ["http:", "http://evil.com/tienda"],
    ["javascript:", "javascript:alert(1)"],
    ["JaVaScRiPt:", "JaVaScRiPt:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["esquema sin barras", "https:evil.com"],
    // Rutas relativas o vacías.
    ["relativa", "tienda"],
    ["con punto", "./tienda"],
    ["vacía", ""],
    // Espacios, saltos de línea y caracteres de control.
    ["espacio inicial", " /tienda"],
    ["espacio antes de //", " //evil.com"],
    ["espacio en medio", "/tien da"],
    ["tabulador", "/\t/evil.com"],
    ["salto de línea", "/\n/evil.com"],
    ["retorno de carro", "/\r/evil.com"],
    ["nulo", "/\u0000/evil.com"],
    ["DEL", "/\u007f/evil.com"],
    ["control al final", "/tienda\u0001"],
    ["espacio de no separación", "/ /evil.com"],
    // Formularios de entrada: solo darían vueltas.
    ["/login", "/login"],
    ["/registro con consulta", "/registro?redirect=/tienda"],
    // Tipos y tamaños.
    ["número", 42],
    ["null", null],
    ["undefined", undefined],
    ["array", ["/tienda"]],
    ["demasiado larga", `/${"a".repeat(2100)}`],
  ];

  for (const [nombre, entrada] of invalidas) {
    it(nombre, () => {
      assert.equal(destinoInterno(entrada), null);
    });
  }
});

describe("destinoDeBusqueda y conDestino", () => {
  it("lee y valida ?redirect=", () => {
    assert.equal(destinoDeBusqueda("?redirect=%2Ftienda%2Fflyer"), "/tienda/flyer");
    assert.equal(destinoDeBusqueda("?redirect=%2F%5Cevil.com"), null);
    assert.equal(destinoDeBusqueda("?otra=1"), null);
  });

  it("conserva el destino en el enlace entre login y registro", () => {
    assert.equal(conDestino("/registro", "/tienda/flyer?x=1"), "/registro?redirect=%2Ftienda%2Fflyer%3Fx%3D1");
    assert.equal(conDestino("/registro", null), "/registro");
  });
});
