# NEON LIQUOR — The Future of Spirits

Tienda online de bebidas alcohólicas con estética futurista: catálogo con filtros, botella 3D interactiva, carrito persistente, checkout, cuentas de cliente y un **panel de administración** independiente. Todo funciona sobre una base de datos PostgreSQL real.

| Tienda | Panel de administración |
|---|---|
| `http://localhost:5173` | `http://localhost:5173/admin` |

---

## Qué incluye

**Tienda (clientes)**
- Inicio con botella 3D (Three.js / React Three Fiber) que gira, sigue el movimiento del mouse y se puede arrastrar. Además: productos destacados, categorías, ofertas, más vendidos (calculado con ventas reales), marcas premium y beneficios.
- Verificación de mayoría de edad al entrar y en el registro (18+, Ley N.° 28681) y la advertencia legal obligatoria.
- Catálogo con 10 categorías, búsqueda instantánea (también con `Ctrl + K`), filtros por categoría, marca, precio y disponibilidad, orden por popularidad, novedades o precio, y paginación.
- Página de producto con galería, vista 3D, ficha técnica (volumen, graduación, origen), notas de cata, cantidad, «Comprar ahora» y productos relacionados.
- Carrito que no se pierde al recargar la página. Precios, stock, cupones y envío los calcula siempre el servidor.
- Checkout con datos del cliente, direcciones guardadas, método de entrega (estándar, express o recojo), método de pago y resumen.
- Cuenta del cliente: registro, inicio y cierre de sesión, recuperación segura de contraseña, edición de datos, cambio de contraseña, historial y seguimiento de pedidos (con cancelación mientras están pendientes), direcciones y favoritos.

**Panel de administración (rol ADMIN)**
- Resumen con ventas reales (sin pedidos de prueba ni cancelados), pedidos de hoy, pedidos pendientes, gráfico de los últimos 14 días, pedidos por estado, stock bajo y productos más vendidos.
- Pedidos: filtros y búsqueda, detalle, cambio de estado con historial (Recibido → Confirmado → En preparación → En camino → Entregado, o Cancelado, que devuelve el stock) y estado del pago.
- Productos: alta, edición, eliminación (los que ya tienen pedidos se desactivan en lugar de borrarse), stock editable en la tabla, activar o destacar, subida de fotos y vista previa de la botella.
- Categorías, marcas, clientes (activar o desactivar cuentas) y cupones (porcentaje o monto fijo, compra mínima, límite de usos y vigencia).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, Framer Motion, Three.js + React Three Fiber, Lucide React, Zustand |
| Backend | Node.js, Express 5, TypeScript, API REST, Zod (validación) |
| Base de datos | PostgreSQL 16 + Prisma ORM |
| Seguridad | Argon2id, sesiones en BD con cookies HttpOnly, CSRF, Helmet/CSP, límites de peticiones |

> **Nota sobre el 3D.** No se usan modelos descargados: la botella se genera por código a partir de la silueta de cada producto (vidrio con transmisión, líquido del color del producto y etiqueta con la marca). Así no hay problemas de licencias, carga rápido y cada producto tiene su propia vista 3D. Si el navegador no soporta WebGL o el usuario prefiere menos movimiento, se muestra una ilustración vectorial equivalente.

---

## Requisitos

- **Node.js 20.19 o superior** (recomendado 22 LTS): https://nodejs.org
- **PostgreSQL 16**, de una de estas dos formas:
  - **Docker Desktop** (lo más simple): https://www.docker.com/products/docker-desktop
  - o **PostgreSQL instalado** en tu computadora: https://www.postgresql.org/download

## Inicio rápido en Windows (doble clic)

1. Instala **Node.js LTS** y **Docker Desktop**, y abre Docker Desktop hasta que diga *Engine running*.
2. Descarga el proyecto: en GitHub, botón **Code → Download ZIP** sobre esta rama. Descomprímelo en una carpeta **sin espacios ni tildes**, por ejemplo `C:\neon-liquor`.
3. Haz doble clic en **`iniciar-windows.bat`**.

El script comprueba Node y Docker, instala las dependencias, crea `server\.env`, enciende PostgreSQL, crea las tablas, carga los datos, compila la tienda y la abre en **http://localhost** (panel en **http://localhost/admin**). Si el puerto 80 está ocupado, usa http://localhost:4000. Si algo falla, te dice en qué paso. **No cierres esa ventana** mientras uses la tienda: es el servidor.

> La primera vez, si dejaste `ADMIN_PASSWORD` vacío, la contraseña del administrador aparece **una sola vez** en esa ventana. Anótala.

## Instalación paso a paso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Encender la base de datos

**Opción A — con Docker:**

```bash
npm run db:up
```

Crea un contenedor `neon-liquor-db` con el usuario `neon`, la contraseña `neon_dev_password` y la base `neon_liquor`.

**Opción B — con PostgreSQL instalado:** abre `psql` (o pgAdmin) como usuario `postgres` y ejecuta:

```sql
CREATE USER neon WITH PASSWORD 'neon_dev_password' CREATEDB;
CREATE DATABASE neon_liquor OWNER neon;
```

### 3. Configurar las variables de entorno

Copia el archivo de ejemplo:

```bash
cp server/.env.example server/.env
```

En Windows (CMD): `copy server\.env.example server\.env`

Abre `server/.env` y define al menos **`ADMIN_PASSWORD`**, que debe tener 12 caracteres o más. Si usas otro usuario o contraseña de PostgreSQL, ajusta también `DATABASE_URL`.

### 4. Crear las tablas y cargar los datos iniciales

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

El seed crea 10 categorías, 15 marcas, 31 productos de ejemplo, 2 cupones (`NEON10` y `BIENVENIDA20`) y la cuenta de administrador. Si dejaste `ADMIN_PASSWORD` vacío, genera una contraseña aleatoria y la muestra **una sola vez** en la consola.

### 5. Iniciar la aplicación

```bash
npm run dev
```

- Tienda: http://localhost:5173
- Panel: http://localhost:5173/admin (con el correo `ADMIN_EMAIL` y la contraseña definidos en `server/.env`)
- API: http://localhost:4000/api/health

En desarrollo, Vite redirige `/api` y `/uploads` al backend, así que las cookies de sesión funcionan sin configurar CORS.

### Modo producción en tu computadora

```bash
npm run build
```

```bash
npm start
```

En `server/.env` pon `NODE_ENV=production` y `APP_URL=http://localhost:4000`, y revisa estos valores: `COOKIE_SECURE=false` si no usas HTTPS y `PAYMENTS_TEST_MODE` según corresponda. El servidor entrega la tienda compilada en http://localhost:4000.

---

## Pagos (importante)

Solo se ofrecen métodos que se pueden configurar y probar de verdad. **Nunca se piden ni se guardan datos de tarjetas.**

| Método | Cuándo aparece | Cómo funciona |
|---|---|---|
| **Pago contra entrega** | `CASH_ON_DELIVERY_ENABLED=true` | El pedido queda pendiente. Al marcarlo como *Entregado* en el panel, el pago pasa a **Pagado**. |
| **Transferencia / Yape / Plin** | Si completas `BANK_TRANSFER_INFO` | Se muestran tus datos bancarios. El administrador confirma el pago desde el panel. |
| **Pago de prueba** | `PAYMENTS_TEST_MODE=true` | Está marcado como **MODO DE PRUEBA** en toda la interfaz. Aprueba el pedido sin cobrar nada, nunca se marca como «Pagado» y no se suma a las ventas. |

Para cobrar con tarjeta hace falta integrar una pasarela como Mercado Pago, Culqi, Niubiz o Izipay. El modelo de datos ya separa el método y el estado del pago, así que la integración se añade en `server/src/services/orders.ts` sin cambiar la base de datos.

## Recuperación de contraseña

1. El cliente pide el enlace en «¿Olvidaste tu contraseña?». La respuesta es la misma exista o no la cuenta.
2. Se genera un token aleatorio de 256 bits. En la base de datos solo se guarda su hash SHA-256, el token vence a los 30 minutos y sirve una sola vez.
3. Al cambiar la contraseña se cierran todas las sesiones abiertas de esa cuenta.

**Envío del correo:** configura `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` en `server/.env` (sirve Gmail con contraseña de aplicación, Brevo, Mailgun, etc.). Sin SMTP, en desarrollo el enlace aparece en la consola del servidor; no se finge el envío.

## Seguridad implementada

- Contraseñas con **Argon2id** (parámetros de OWASP) y una política mínima de 8 caracteres con letras y números.
- **Sesiones en base de datos** con cookie `nl_session` (**HttpOnly**, **SameSite=Lax**, **Secure** en producción). En la BD solo se guarda el hash del token, la sesión rota al iniciar sesión y caduca a los 7 días.
- **Protección CSRF**: doble envío (cookie `nl_csrf` + cabecera `X-CSRF-Token`) y rechazo de orígenes desconocidos.
- **Control de acceso por roles**: todas las rutas `/api/admin/*` exigen rol ADMIN en el servidor, y el panel no se descarga para quien no entra en `/admin`.
- **Límites de peticiones** en el inicio de sesión, el registro, la recuperación de contraseña y la API en general.
- **Validación con Zod** de todas las entradas y consultas parametrizadas con Prisma.
- **Helmet** con Content-Security-Policy estricta, sin `X-Powered-By` y `nosniff` en los archivos subidos.
- **Subida de imágenes**: se comprueba la firma real del archivo (JPG, PNG, WEBP o AVIF), con un máximo de 5 MB, nombres aleatorios y sin SVG.
- **Integridad de pedidos**: los precios los calcula el servidor; el stock y los usos de cupón se descuentan dentro de una transacción con condiciones atómicas, así que dos clientes no pueden comprar la última unidad a la vez.
- Mensajes de error genéricos en el inicio de sesión, para no revelar qué correos están registrados.

## Estructura

```
├── client/                 # React + Vite (tienda y panel)
│   └── src/
│       ├── components/     # layout, ui, product, three (3D), admin
│       ├── pages/          # tienda, cuenta del cliente y admin/ (panel)
│       ├── store/          # carrito persistente y notificaciones (Zustand)
│       └── lib/            # cliente API, tipos, formatos, siluetas de botellas
├── server/                 # API Express + Prisma
│   ├── prisma/             # schema.prisma, migraciones y seed
│   └── src/
│       ├── routes/         # auth, catálogo, cuenta y admin/*
│       ├── services/       # precios, pedidos y transiciones de estado
│       ├── middleware/     # auth/roles, CSRF, validación, errores
│       └── lib/            # sesiones, cifrado, correo, subidas
├── DESIGN.md               # sistema de diseño (colores, tipografía, componentes)
└── docker-compose.yml      # PostgreSQL para desarrollo
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | API (puerto 4000) y tienda (puerto 5173) con recarga en caliente |
| `npm run build` / `npm start` | Compila todo y sirve la app desde el puerto 4000 |
| `npm run db:up` | Enciende PostgreSQL con Docker |
| `npm run db:deploy` | Aplica las migraciones |
| `npm run db:migrate` | Crea una migración nueva después de cambiar `schema.prisma` |
| `npm run db:seed` | Carga los datos iniciales; se puede repetir sin duplicar nada |
| `npm run db:studio` | Abre Prisma Studio para ver la base de datos |
| `npm run typecheck` | Revisa los tipos de TypeScript del frontend y el backend |

## Personalización

- **Datos de la tienda** (correo, teléfono, dirección, horario, costos de envío): en `server/.env`.
- **Marcas y productos**: los del seed son **marcas ficticias** creadas para la demo. Reemplázalas desde el panel por las que vendas de verdad y sube fotos reales de cada producto.
- **Diseño**: los colores y las tipografías están definidos como tokens en `client/src/index.css` y documentados en `DESIGN.md`.

## Antes de vender al público

- [ ] Integrar una pasarela de pagos real y poner `PAYMENTS_TEST_MODE=false`.
- [ ] Usar HTTPS y `COOKIE_SECURE=true` (y `TRUST_PROXY=true` si hay un proxy como Nginx o Hostinger).
- [ ] Configurar SMTP para los correos.
- [ ] Implementar el **Libro de Reclamaciones virtual** (INDECOPI) y la emisión de comprobantes electrónicos (SUNAT).
- [ ] Revisar con un asesor legal los textos de `client/src/pages/LegalPage.tsx`.
- [ ] Programar copias de seguridad de PostgreSQL.

## Solución de problemas

- **«No se pudo conectar a PostgreSQL»**: comprueba que la base de datos esté encendida (`docker ps` o el servicio de PostgreSQL) y que `DATABASE_URL` sea correcta.
- **«Token de seguridad inválido»**: recarga la página. Suele pasar si se borraron las cookies con la pestaña abierta.
- **El 3D no aparece**: activa la aceleración por hardware del navegador. Sin WebGL se muestra la ilustración 2D y la tienda sigue funcionando.
- **El puerto 5432 está ocupado**: ya tienes otro PostgreSQL encendido. Usa ese (opción B) o cambia el puerto en `docker-compose.yml` y en `DATABASE_URL`.
