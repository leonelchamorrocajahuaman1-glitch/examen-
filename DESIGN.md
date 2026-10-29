# NEON LIQUOR — Design system

Dirección: **tienda de lujo tecnológica de noche**. Negro profundo, luz de neón usada como iluminación (no como decoración), vidrio esmerilado solo donde hay contenido que flota sobre el fondo. La referencia mental es una vitrina iluminada en una sala oscura: el producto brilla, la interfaz se retira.

> Nota: esta dirección no se basó en sitios reales consultados con UXKIN (no estaba conectado). Está construida a partir del brief del cliente y de las reglas de abajo.

Solo existe modo oscuro: es parte de la identidad de la marca.

## Color

| Token (Tailwind)    | Valor                     | Rol |
|---------------------|---------------------------|-----|
| `ink-950`           | `#05050A`                 | Fondo de página |
| `ink-900`           | `#0A0A12`                 | Superficies elevadas (footer, sidebar del panel) |
| `ink-800`           | `#11111C`                 | Inputs, filas al pasar el mouse |
| `ink-700`           | `#1C1C2B`                 | Bordes fuertes, separadores visibles |
| `line`              | `rgb(255 255 255 / .08)`  | Bordes de tarjetas y vidrio |
| `fg`                | `#F4F4F8`                 | Texto principal (19:1 sobre ink-950) |
| `fg-muted`          | `#A6A6BD`                 | Texto secundario (8.4:1) |
| `fg-subtle`         | `#8B8BA3`                 | Metadatos, etiquetas (6.1:1) |
| `violet` / `violet-glow` | `#7C3AED` / `#A78BFA` | **Primario**: botones de acción, estado activo. Texto blanco sobre violet = 5.7:1 |
| `cyan`              | `#22D3EE`                 | **Acento**: precios, enlaces, foco, indicadores. 11:1 sobre ink-950 |
| `blue`              | `#3B82F6`                 | Solo luz ambiental del fondo y del 3D. Nunca en texto |
| `magenta`           | `#E879F9`                 | Solo ofertas y descuentos |
| `success` / `warning` / `danger` | `#34D399` / `#FBBF24` / `#F87171` | Estados (stock, pedidos, errores) |

Reglas: un solo color de acción (violeta). El cian marca información (precio, enlace, foco). El magenta aparece únicamente junto a un precio rebajado. Sin degradados en titulares.

## Tipografía

- **Display**: Unbounded Variable (500–700) — logotipo, titulares, cifras grandes. Mayúsculas con `tracking-[0.08em]` solo en etiquetas cortas.
- **Texto / UI**: Manrope Variable (400–700).

| Paso | Tamaño / interlineado | Uso |
|------|------------------------|-----|
| xs   | 12 / 16 | Etiquetas, badges |
| sm   | 14 / 20 | Metadatos, tablas |
| base | 16 / 26 | Párrafos (máx. 68ch) |
| lg   | 18 / 28 | Intro de sección |
| xl   | 20 / 28 | Títulos de tarjeta |
| 2xl  | 24 / 32 | Subtítulos |
| 4xl  | 36 / 40 | Títulos de sección |
| hero | clamp(44px, 8vw, 104px) / 0.95 | Titular principal |

## Espaciado y layout

Escala de 4 px de Tailwind. Contenido `max-w-7xl` (1280 px) con `px-4 sm:px-6 lg:px-8`. Secciones `py-16 md:py-24`. Las cabeceras de sección van alineadas a la izquierda con la acción ("Ver todo") a la derecha; no todo va centrado.

## Forma y profundidad

- Radios: `rounded-xl` (12 px) botones e inputs · `rounded-2xl` (16 px) tarjetas · `rounded-3xl` (24 px) paneles grandes · `rounded-full` chips.
- Sombras: `shadow-card` (profundidad sobre negro) y `shadow-glow` (halo violeta, solo en hover/foco de elementos interactivos).
- Vidrio (`.glass`): `bg-white/[.035]` + `backdrop-blur-xl` + borde `line`. Solo para navbar, tarjetas de producto, drawer, modales y paneles del checkout.

## Componentes

- **Botón primario**: fondo violet, texto blanco, hover → `violet-glow` + halo; foco → anillo cian 2 px; deshabilitado → 40 % opacidad.
- **Secundario**: vidrio + borde `line`, hover → borde cian/40.
- **Quiet**: solo texto `fg-muted`, hover `fg`.
- **Inputs**: `ink-800`, borde `line`, foco borde cian + anillo; error borde `danger` y mensaje debajo.
- **Tarjeta de producto**: vidrio, imagen/botella sobre un halo del color del producto, badges arriba (Oferta en magenta, Agotado, Últimas unidades), precio en cian.
- **Navegación**: barra de vidrio fija, enlaces `fg-muted` → `fg`, indicador activo con línea cian.
- **Footer**: `ink-900`, cuatro columnas, advertencia legal obligatoria.

## Imágenes e iconos

- Iconos: Lucide, trazo 1.75, 16–20 px.
- Producto: foto subida desde el panel (JPG/PNG/WEBP/AVIF). Si no hay foto, se dibuja una botella vectorial con la forma y el color del producto, para que el catálogo nunca muestre huecos.
- 3D: botella procedural con Three.js (geometría de revolución, vidrio con transmisión y líquido del color del producto). No depende de modelos externos ni de licencias de terceros. Si el dispositivo no tiene WebGL o pide menos movimiento, se muestra la botella vectorial.

## Movimiento

Duraciones de 150–250 ms para hover y 400–600 ms para entradas, curva `[0.22, 1, 0.36, 1]`. Aparición al hacer scroll una sola vez por elemento. Todo respeta `prefers-reduced-motion`.
