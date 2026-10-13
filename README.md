# RcktX
Marketplace de recursos digitales (plantillas, flyers, stories, packs y colecciones) con creadores que venden su trabajo y una identidad visual propia.

## Roles
ADMIN, CREATOR, CLIENT

## Modelo
Compra individual + planes mensual/anual + creadores + descargas + favoritos + colecciones.

## Stack
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Prisma 6 sobre PostgreSQL · Vercel Blob para archivos. Se despliega en Vercel desde `main`.

## Instalar
1. Instala Node.js 20+.
2. Copia `.env.example` a `.env` y rellena los valores. La plantilla explica cada variable; no subas nunca un `.env` con valores reales.
3. Coloca la conexión de PostgreSQL en `DATABASE_URL`.
4. En terminal:
```bash
npm install
npx prisma migrate dev   # solo contra una base local vacía
npm run db:seed
npm run dev
```
5. Abre http://localhost:3000

> `prisma migrate dev` puede proponer reiniciar la base si detecta diferencias. Contra una base con datos reales no se usa `migrate reset` ni `db push`.

## Comandos
| Comando | Para qué |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint de todo el repo |
| `npm run db:generate` | Regenera el cliente de Prisma |
| `npm run db:studio` | Prisma Studio |

Los scripts de apoyo (migración de archivos a Blob, rellenos históricos) están descritos en [`scripts/README.md`](scripts/README.md).

## Estructura
```
src/
  app/          Rutas (App Router). api/ son los endpoints.
                globals.css contiene el sistema visual (clases rk-*).
  components/   Una carpeta por área:
    layout/       Navbar, Footer, barra móvil, menús, tema, buscador
    tienda/       Tarjetas, favoritos, valoraciones, visor protegido
    home/         Secciones del inicio
    cuenta/       Mi cuenta
    creador/      Herramientas del creador (subidas, portafolio…)
    panel/        Panel del creador
    perfil/       Perfil público del creador
    admin/        Administración
    categorias/, programas/, iconos/
    ui/           Piezas genéricas (vacíos, paginación, FAQ…)
    hooks/        Hooks y almacenes compartidos de cliente
  lib/          Lógica de servidor y utilidades.
                Los archivos *-comun.ts no usan el cliente de Prisma
                (solo sus tipos) ni módulos de Node: se pueden
                importar desde componentes de cliente.
  middleware.ts Protección de rutas por sesión y rol.
prisma/         Schema, migraciones, seed y rellenos históricos.
scripts/        Scripts de apoyo (ver scripts/README.md).
public/         Assets estáticos.
```
