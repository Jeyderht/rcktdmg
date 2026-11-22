# RcktX — aceptación de compra y descarga (pagos simulados)

**Estado:** pendiente de ejecución manual sobre un entorno de desarrollo con datos de prueba. Este documento es un protocolo, **no** evidencia de pruebas realizadas.

## Condiciones
- Trabajar exclusivamente en `dev/finish-platform`, sin desplegar ni modificar `main`.
- Iniciar la aplicación localmente con `NODE_ENV=development`, PostgreSQL de pruebas y almacenamiento privado de pruebas. No usar datos de clientes reales.
- El endpoint `POST /api/payments/test` devuelve 403 fuera de desarrollo: no habilitarlo en producción ni usar una pasarela real.
- Preparar un comprador de prueba, un creador de prueba y un recurso PUBLICADO con archivo de diseño real (PSD, AI, EPS, SVG o ZIP; no solo portada). Registrar nombre, tamaño y SHA-256 del archivo original.
- Preparar también un pack o colección con al menos dos recursos publicados, y un segundo usuario sin compra.

## Alcance del marketplace
RcktX se valida como marketplace de recursos de diseño: plantillas PSD, archivos AI/EPS/SVG, mockups, elementos gráficos y packs ZIP. No se requiere un loop VJ ni un MP4 para aprobar esta fase. Se conserva la compatibilidad técnica de formatos existentes; este protocolo no implica eliminar funcionalidades.

## Recorrido principal
| ID | Acción | Resultado esperado | Estado |
| --- | --- | --- | --- |
| A01 | Iniciar sesión como comprador y buscar el recurso por nombre en /tienda | Aparece la ficha correcta y se puede abrir | ☐ |
| A02 | Añadirlo al carrito y abrir checkout | Producto, cantidad 1 y total correctos | ☐ |
| A03 | Recargar checkout antes de pagar | Pedido pendiente y total conservados | ☐ |
| A04 | Volver a «Mis compras» y retomar pedido pendiente | Se recupera el pedido sin crear una compra duplicada | ☐ |
| A05 | Completar el pago **simulado** en desarrollo | Pedido PAID, pago TEST APPROVED por importe exacto | ☐ |
| A06 | Abrir biblioteca | Recurso comprado y licencia ACTIVE visibles | ☐ |
| A07 | Descargar el archivo de diseño | HTTP 200, nombre/extensión correctos y SHA-256 igual al original | ☐ |
| A08 | Volver a pagar el mismo pedido | Respuesta idempotente; no crea otro pago, licencia o descarga | ☐ |
| A09 | Intentar comprar otra vez el recurso adquirido | Se bloquea la compra duplicada | ☐ |
| A10 | Comprar pack o colección de recursos gráficos y descargar su ZIP | Incluye los archivos de diseño previstos; nombres y contenido correctos | ☐ |

## Seguridad y escenarios negativos
| ID | Acción | Resultado esperado | Estado |
| --- | --- | --- | --- |
| S01 | Solicitar la descarga sin sesión | HTTP 401 | ☐ |
| S02 | Solicitar con otro usuario la descarga del comprador | HTTP 404 | ☐ |
| S03 | Revocar la licencia y volver a descargar | HTTP 403 | ☐ |
| S04 | Alterar total o estado de pago en la BD de pruebas | Descarga denegada por validación de integridad | ☐ |
| S05 | Solicitar POST /api/payments/test fuera de development | HTTP 403 | ☐ |
| S06 | Ejecutar dos pagos simulados concurrentes para el mismo pedido | Una sola acreditación, sin duplicados | ☐ |
| S07 | Comprar el mismo recurso en dos pedidos concurrentes del mismo usuario | Una sola compra válida | ☐ |
| S08 | Confirmar que ventas TEST no aparecen como saldo retirable | Saldo retirable no aumenta | ☐ |

## Visual y dispositivos
- ☐ Chromium, viewport 390 × 844: búsqueda, ficha, carrito, checkout, biblioteca, descarga.
- ☐ Chromium, viewport 1440 × 900: mismas operaciones y paneles de creador/admin.
- ☐ Safari real en iPhone: menú, formularios, checkout, biblioteca, descarga del PSD o ZIP de diseño.
- ☐ Navegación por teclado y mensajes de error legibles.

## Registro de ejecución
Anotar por cada caso: fecha, dispositivo/navegador, commit, usuario de prueba (sin credenciales), resultado PASS/FAIL/BLOCKED, captura o log y ticket de incidencia.

**Criterio de aceptación:** todos los casos críticos A01–A10 y S01–S08 pasan; cualquier fallo crítico bloquea el lanzamiento. La aceptación de Safari y almacenamiento definitivo requiere una prueba humana con el dispositivo y archivo de diseño real. No activar cobros reales hasta completar esa etapa.
