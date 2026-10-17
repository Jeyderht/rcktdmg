# Colores de RcktX

Todos los colores de la web salen de un único sitio: el bloque **§0 PALETA** al principio de `src/app/globals.css`. Para cambiar un color, se cambia allí y en ningún otro archivo.

## Cómo está montado

Hay tres capas, de la más baja a la que usan los componentes:

1. **Constantes de la PALETA** (`--pal-*`). Son valores «R G B» sin comas y no dependen del tema.
   - `--pal-claro-*` y `--pal-oscuro-*` están en dos columnas, lado a lado: el mismo rol en cada tema. Por ejemplo, `--pal-claro-texto` y `--pal-oscuro-texto`.
   - `--pal-blanco` y `--pal-negro` son blanco y negro puros. No cambian con el tema y se usan en brillos, velos y texto sobre foto.
   - `--pal-claro-serie-1…5` son los colores de los gráficos del admin.
   - «Colores propios de componentes» agrupa los que todavía no tienen un rol general. Su nombre dice en qué componente se usan, por ejemplo `--pal-claro-badge-2`.
   - El sufijo `-onice` marca la banda ónice (`.rk-onyx`) cuando no coincide con el tema oscuro.
2. **Tokens de tema**, que apuntan a las constantes y cambian con `data-theme`:
   - `--rk-*` son tripletas «R G B». Se usan como `rgb(var(--rk-x) / alfa)` y Tailwind los lee igual (`tailwind.config.ts`).
   - `--rx-*` son valores listos para usar: `rgb()`, `rgb(… / alfa)` o degradados.
   - El alfa se queda en el token, no en la constante. Por ejemplo: `--rx-linea: rgb(var(--pal-oscuro-borde) / 0.075)`.
3. **Reglas de componentes**, que usan los tokens o, cuando no hay token, `rgb(var(--pal-…))` directamente.

Tokens semánticos que nombran usos concretos: `--rk-serie-1…5`, `--rk-estado-ok / -aviso / -error`, `--rk-boton-primario-bg / -fg`, `--rk-sombra-tono` y `--rk-tinta-isla`.

El tema se elige con `data-theme="light" | "dark"` en `<html>` (ThemeProvider). `:root` vale también en oscuro mientras el bloque oscuro no redefina el token. Por eso hay constantes `--pal-claro-*` que se ven en los dos temas.

## Cómo añadir un color

1. Busca en la PALETA si ya existe una constante con ese valor y ese uso. Si existe, úsala.
2. Si no, crea la constante en §0 con un nombre de rol (`--pal-claro-<rol>` y, si cambia en oscuro, también `--pal-oscuro-<rol>`) y un comentario que diga dónde se usa.
3. Si el color depende del tema, crea o reutiliza un token `--rk-*` o `--rx-*` en los bloques de tema que apunte a la constante.
4. En la regla, usa el token: `rgb(var(--rk-x) / 0.5)`. **No escribas hex ni `rgb()` sueltos.**
5. En TSX, igual: `rgb(var(--rk-serie-1))`. Funciona en `style` y en atributos SVG como `stroke` o `stop-color`. Ejemplos: `src/lib/admin-colores.ts` y `src/components/admin/BalanceAdmin.tsx`.

## Excepciones (colores que no salen de la PALETA)

- **Fotos e imágenes**: productos, portadas, avatares y la foto del CTA.
- **Logos de pago** (Visa, Yape, Plin): la web usa las versiones `public/pagos/*-mono.svg` como máscara del color de texto.
- **Muestras del filtro «Color»** de la tienda (`src/lib/catalogo.ts` y `.rk-swatch`): describen el color real del recurso.
- **Máscaras** (`mask`, `-webkit-mask`): solo usan el alfa; el color no se ve.
- **SVG en línea dentro de `url(…)`**: `var()` no funciona ahí.
- **`initial-value` de `@property`**: no admite `var()`.

## Comprobar que un cambio de orden no cambia nada

Al reorganizar colores sin querer cambiar el aspecto, compara antes y después en el navegador:

- el valor computado de todas las `--rk-*` y `--rx-*` en `<html>` y dentro de `.rk-onyx`, en claro y oscuro;
- el color computado de los elementos que usan las reglas tocadas;
- capturas píxel a píxel.

Ojo con las pantallas que cambian solas entre dos cargas (gráficos del dashboard, Studio y partes del inicio): compáralas con dos capturas del CSS anterior tomadas justo antes.
