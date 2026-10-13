# Scripts de apoyo

Herramientas que se lanzan a mano, fuera de la aplicación. Ninguna
se ejecuta en el build ni en el deploy.

> **Antes de lanzar cualquiera que escriba en la base de datos:** los
> datos de desarrollo son reales y no se ejecuta nada contra
> producción sin aprobarlo antes. Las que lo admiten arrancan en
> modo prueba (*dry run*) y solo escriben con `--ejecutar`.

## `scripts/`

| Script | Qué hace | Escribe en | Uso |
| --- | --- | --- | --- |
| `migrar-storage.mjs` | Sube los archivos locales de `storage/` y `public/` a Vercel Blob y actualiza sus URLs. Nunca borra un archivo local. | Vercel Blob + BD | `node scripts/migrar-storage.mjs` (prueba) · `--ejecutar` |
| `probar-blob.mjs` | Prueba la conexión con Vercel Blob: sube un objeto a cada almacén, lo lee y lo borra. | Vercel Blob (objetos de prueba, que borra al terminar) | `node scripts/probar-blob.mjs` |
| `seed-categorias.mjs` | Crea las categorías comerciales que falten, reasigna productos, rellena `fileFormat` y aplica la etiqueta «pack». | BD | `node scripts/seed-categorias.mjs` (prueba) · `--ejecutar` |

Los tres leen `.env` y `.env.local` por su cuenta, porque corren fuera
de Next. No imprimen tokens.

## `prisma/` (rellenos históricos)

Se escribieron una sola vez, al añadir cada tabla o columna, para
completar los datos anteriores. Son idempotentes: repetirlos no
duplica nada. No tienen modo prueba: escriben al lanzarlos.

| Script | Qué rellena | Uso |
| --- | --- | --- |
| `backfill-dimensiones.ts` | Ancho y alto reales de portadas e imágenes de galería sin medidas. | `npx tsx prisma/backfill-dimensiones.ts` |
| `backfill-licencias.ts` | Licencias de las compras pagadas antes de que existieran. | `npx tsx prisma/backfill-licencias.ts` |
| `backfill-notificaciones.ts` | Notificaciones de hechos anteriores a la tabla `Notification`, marcadas como leídas. | `npx tsx prisma/backfill-notificaciones.ts` |

`prisma/seed.ts` (`npm run db:seed`), `schema.prisma` y las
migraciones no son scripts de apoyo y no se describen aquí.
