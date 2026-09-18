# RCKTDMG
Base de una plataforma tipo marketplace de recursos digitales, pensada para crecer hacia un ecosistema estilo Freepik con identidad propia.

## Roles
ADMIN, CREATOR, CLIENT

## Modelo
Compra individual + planes mensual/anual + creadores + descargas + favoritos + colecciones.

## Instalar
1. Instala Node.js 20+.
2. Copia `.env.example` a `.env`.
3. Coloca la contraseña de PostgreSQL en `DATABASE_URL`.
4. En terminal:
```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
5. Abre http://localhost:3000

## Nota
Esta entrega es la fundación. Autenticación real, carrito persistente, pagos, webhooks, storage privado, descargas firmadas, comisiones y producción se implementan por fases; no se deben usar datos de demostración como sistema de autenticación de producción.
