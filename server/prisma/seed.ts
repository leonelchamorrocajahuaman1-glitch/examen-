/**
 * Datos iniciales de NEON LIQUOR: categorías, marcas (ficticias), productos de ejemplo,
 * cupones y la cuenta de administrador. Se puede ejecutar varias veces sin duplicar datos.
 */
import { randomBytes } from 'node:crypto';
import { PrismaClient, type BottleShape } from '@prisma/client';
import argon2 from 'argon2';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const prisma = new PrismaClient();

const categories = [
  { slug: 'whisky', name: 'Whisky', accentColor: '#F5A524', description: 'Single malts, blends y bourbons de crianza prolongada.' },
  { slug: 'vodka', name: 'Vodka', accentColor: '#7DD3FC', description: 'Destilados ultra puros, filtrados en frío.' },
  { slug: 'ron', name: 'Ron', accentColor: '#FB923C', description: 'Rones añejos del Caribe y Latinoamérica.' },
  { slug: 'gin', name: 'Gin', accentColor: '#34D399', description: 'Ginebras botánicas para gin tonic de autor.' },
  { slug: 'tequila', name: 'Tequila', accentColor: '#FACC15', description: '100% agave: blanco, reposado y añejo.' },
  { slug: 'vino', name: 'Vino', accentColor: '#E11D48', description: 'Tintos, blancos y rosados seleccionados.' },
  { slug: 'champagne-espumantes', name: 'Champagne y espumantes', accentColor: '#FDE68A', description: 'Burbujas para celebrar.' },
  { slug: 'licores', name: 'Licores', accentColor: '#C084FC', description: 'Cremas, amargos y licores de frutas.' },
  { slug: 'cocteles-preparados', name: 'Cócteles preparados', accentColor: '#22D3EE', description: 'Listos para servir, recetas de barra.' },
  { slug: 'sin-alcohol', name: 'Bebidas sin alcohol', accentColor: '#A3E635', description: 'Destilados 0.0%, tónicas y mixers premium.', isAlcoholic: false },
];

// Marcas ficticias creadas para la demo. Reemplázalas desde el panel por las marcas reales que vendas.
const brands = [
  { slug: 'highland-aurum', name: 'Highland Aurum', country: 'Escocia', isPremium: true, description: 'Destilería de las Highlands con barricas de jerez.' },
  { slug: 'kuro-distillery', name: 'Kuro Distillery', country: 'Japón', isPremium: true, description: 'Whisky japonés de precisión, madurado en roble mizunara.' },
  { slug: 'nordvik', name: 'Nordvik', country: 'Suecia', isPremium: true, description: 'Vodka de trigo de invierno filtrado siete veces.' },
  { slug: 'volga-crystal', name: 'Volga Crystal', country: 'Polonia', isPremium: false, description: 'Vodka clásico de centeno.' },
  { slug: 'casa-caribe', name: 'Casa Caribe', country: 'República Dominicana', isPremium: true, description: 'Rones añejados en sistema solera.' },
  { slug: 'barrica-del-sur', name: 'Barrica del Sur', country: 'Perú', isPremium: false, description: 'Ron de caña peruana con crianza en roble.' },
  { slug: 'botanic-lab', name: 'Botanic Lab', country: 'Inglaterra', isPremium: true, description: 'London Dry Gin con 14 botánicos.' },
  { slug: 'andes-botanical', name: 'Andes Botanical', country: 'Perú', isPremium: false, description: 'Gin con botánicos de los Andes.' },
  { slug: 'agave-eterno', name: 'Agave Eterno', country: 'México', isPremium: true, description: 'Tequila de Jalisco, agave azul 100%.' },
  { slug: 'quebrada-alta', name: 'Viña Quebrada Alta', country: 'Chile', isPremium: false, description: 'Vinos de valle con clima frío.' },
  { slug: 'bodega-ica-noble', name: 'Bodega Ica Noble', country: 'Perú', isPremium: false, description: 'Vinos y espumantes del valle de Ica.' },
  { slug: 'maison-lumiere', name: 'Maison Lumière', country: 'Francia', isPremium: true, description: 'Casa de champagne de Reims.' },
  { slug: 'velvet-spirits', name: 'Velvet Spirits', country: 'Italia', isPremium: false, description: 'Licores y amaros artesanales.' },
  { slug: 'neon-lab', name: 'NEON Lab Mixology', country: 'Perú', isPremium: false, description: 'Cócteles de autor listos para servir.' },
  { slug: 'zero-proof', name: 'Zero Proof Co.', country: 'Perú', isPremium: false, description: 'Destilados y mixers sin alcohol.' },
];

interface SeedProduct {
  slug: string;
  name: string;
  brand: string;
  category: string;
  short: string;
  description: string;
  presentation?: string;
  volumeMl: number;
  abv: number | null;
  origin: string;
  notes: string[];
  price: number;
  sale?: number;
  stock: number;
  featured?: boolean;
  color: string;
  shape: BottleShape;
}

const products: SeedProduct[] = [
  // Whisky
  { slug: 'highland-aurum-18', name: 'Aurum 18 Años Sherry Cask', brand: 'highland-aurum', category: 'whisky', short: 'Single malt de 18 años con final de jerez Oloroso.', description: 'Madurado durante 18 años en barricas de roble americano y terminado en toneles de jerez Oloroso. Aroma a frutos secos, naranja confitada y cacao; en boca es sedoso, con especias dulces y un final largo y cálido.', volumeMl: 700, abv: 43, origin: 'Highlands, Escocia', notes: ['Frutos secos', 'Naranja confitada', 'Cacao'], price: 689, stock: 14, featured: true, color: '#C9731F', shape: 'CLASSIC' },
  { slug: 'highland-aurum-12', name: 'Aurum 12 Años Double Wood', brand: 'highland-aurum', category: 'whisky', short: 'Doble barrica: roble americano y europeo.', description: 'Un single malt equilibrado y accesible. Miel, vainilla y manzana asada, con un toque de roble tostado. Ideal solo o con unas gotas de agua.', volumeMl: 750, abv: 40, origin: 'Highlands, Escocia', notes: ['Miel', 'Vainilla', 'Manzana asada'], price: 289, sale: 249, stock: 32, color: '#D98E2B', shape: 'CLASSIC' },
  { slug: 'kuro-mizunara', name: 'Kuro Mizunara Reserve', brand: 'kuro-distillery', category: 'whisky', short: 'Whisky japonés madurado en roble mizunara.', description: 'El roble japonés mizunara aporta notas de sándalo e incienso. Delicado y complejo, con fruta de hueso, miel de flores y un final especiado.', volumeMl: 700, abv: 43, origin: 'Hokkaido, Japón', notes: ['Sándalo', 'Durazno', 'Miel floral'], price: 549, stock: 6, featured: true, color: '#B8651B', shape: 'SQUARE' },
  { slug: 'kuro-harmony', name: 'Kuro Harmony Blended', brand: 'kuro-distillery', category: 'whisky', short: 'Blend japonés suave para highballs.', description: 'Mezcla de whiskies de malta y grano. Notas cítricas y de té verde; perfecto para un highball con soda bien fría.', volumeMl: 700, abv: 40, origin: 'Japón', notes: ['Yuzu', 'Té verde', 'Cereal'], price: 239, stock: 25, color: '#E0A040', shape: 'SQUARE' },

  // Vodka
  { slug: 'nordvik-platinum', name: 'Nordvik Platinum', brand: 'nordvik', category: 'vodka', short: 'Trigo de invierno, filtrado 7 veces.', description: 'Vodka ultra suave con textura cremosa y un sutil dulzor de cereal. Filtrado en frío a través de carbón de abedul.', volumeMl: 750, abv: 40, origin: 'Suecia', notes: ['Cereal dulce', 'Pimienta blanca', 'Limpio'], price: 159, sale: 129, stock: 40, featured: true, color: '#DCEBFF', shape: 'TALL' },
  { slug: 'nordvik-citrus', name: 'Nordvik Citrus Frost', brand: 'nordvik', category: 'vodka', short: 'Infusionado con limón y bergamota.', description: 'Vodka infusionado con cáscaras de limón siciliano y bergamota. Fresco, aromático y perfecto para cócteles cítricos.', volumeMl: 750, abv: 37.5, origin: 'Suecia', notes: ['Limón', 'Bergamota', 'Fresco'], price: 139, stock: 22, color: '#F1FAC8', shape: 'TALL' },
  { slug: 'volga-crystal-classic', name: 'Volga Crystal Classic', brand: 'volga-crystal', category: 'vodka', short: 'Vodka de centeno, carácter clásico.', description: 'Vodka tradicional de centeno con un perfil seco y ligeramente especiado. Excelente relación calidad-precio.', volumeMl: 1000, abv: 40, origin: 'Polonia', notes: ['Centeno', 'Seco', 'Especiado'], price: 69, stock: 60, color: '#EEF3FF', shape: 'TALL' },

  // Ron
  { slug: 'casa-caribe-23', name: 'Casa Caribe Solera 23', brand: 'casa-caribe', category: 'ron', short: 'Ron añejo en sistema solera hasta 23 años.', description: 'Profundo y aterciopelado: caramelo, plátano maduro, tabaco y especias. Para disfrutar solo, a temperatura ambiente.', volumeMl: 750, abv: 40, origin: 'República Dominicana', notes: ['Caramelo', 'Tabaco', 'Plátano maduro'], price: 219, stock: 18, featured: true, color: '#8B3A0E', shape: 'ROUND' },
  { slug: 'casa-caribe-blanco', name: 'Casa Caribe Blanco Reserva', brand: 'casa-caribe', category: 'ron', short: 'Ron blanco filtrado, ideal para mojitos.', description: 'Añejado 3 años y filtrado para retirar el color. Ligero, con notas de coco y vainilla.', volumeMl: 750, abv: 38, origin: 'República Dominicana', notes: ['Coco', 'Vainilla', 'Caña'], price: 89, sale: 75, stock: 35, color: '#F5F1E6', shape: 'ROUND' },
  { slug: 'barrica-del-sur-8', name: 'Barrica del Sur 8 Años', brand: 'barrica-del-sur', category: 'ron', short: 'Caña peruana, 8 años en roble.', description: 'Ron peruano de caña de azúcar con crianza de 8 años. Notas de chancaca, nuez moscada y roble tostado.', volumeMl: 700, abv: 40, origin: 'Lambayeque, Perú', notes: ['Chancaca', 'Nuez moscada', 'Roble'], price: 129, stock: 4, color: '#9C4A15', shape: 'CLASSIC' },

  // Gin
  { slug: 'botanic-lab-london-dry', name: 'Botanic Lab London Dry', brand: 'botanic-lab', category: 'gin', short: '14 botánicos, enebro protagonista.', description: 'Un London Dry clásico con enebro, cilantro, cáscara de naranja y raíz de angélica. Seco, aromático y perfecto para un gin tonic.', volumeMl: 700, abv: 43, origin: 'Londres, Inglaterra', notes: ['Enebro', 'Cítricos', 'Cilantro'], price: 169, stock: 28, featured: true, color: '#E6FFF5', shape: 'SQUARE' },
  { slug: 'botanic-lab-pink', name: 'Botanic Lab Pink Berry', brand: 'botanic-lab', category: 'gin', short: 'Gin con frutos rojos y pimienta rosa.', description: 'Infusionado con frambuesa, fresa y pimienta rosa. Afrutado y vibrante, con un color rosado natural.', volumeMl: 700, abv: 38, origin: 'Inglaterra', notes: ['Frambuesa', 'Fresa', 'Pimienta rosa'], price: 159, sale: 135, stock: 20, color: '#F9A8D4', shape: 'SQUARE' },
  { slug: 'andes-botanical-gin', name: 'Andes Botanical Gin', brand: 'andes-botanical', category: 'gin', short: 'Muña, molle y cedrón andinos.', description: 'Gin peruano destilado con botánicos andinos: muña, molle, cedrón y cáscara de limón de pica. Herbal y fresco.', volumeMl: 750, abv: 42, origin: 'Cusco, Perú', notes: ['Muña', 'Molle', 'Cedrón'], price: 119, stock: 0, color: '#D9F99D', shape: 'TALL' },

  // Tequila
  { slug: 'agave-eterno-anejo', name: 'Agave Eterno Añejo', brand: 'agave-eterno', category: 'tequila', short: 'Añejo de 18 meses en roble francés.', description: 'Tequila 100% agave azul de los Altos de Jalisco. Vainilla, agave cocido y caramelo, con un final especiado.', volumeMl: 750, abv: 40, origin: 'Jalisco, México', notes: ['Agave cocido', 'Vainilla', 'Caramelo'], price: 329, stock: 12, featured: true, color: '#E5A42B', shape: 'ROUND' },
  { slug: 'agave-eterno-blanco', name: 'Agave Eterno Blanco', brand: 'agave-eterno', category: 'tequila', short: 'Blanco puro, agave fresco y pimienta.', description: 'Sin añejamiento para mostrar el agave en estado puro: cítrico, herbal y con un toque de pimienta negra.', volumeMl: 750, abv: 38, origin: 'Jalisco, México', notes: ['Agave fresco', 'Lima', 'Pimienta'], price: 169, sale: 145, stock: 26, color: '#F4F8FF', shape: 'ROUND' },
  { slug: 'agave-eterno-reposado', name: 'Agave Eterno Reposado', brand: 'agave-eterno', category: 'tequila', short: '6 meses en barrica de roble americano.', description: 'Equilibrio entre la frescura del agave y la suavidad de la madera. Miel, canela y almendra tostada.', volumeMl: 750, abv: 38, origin: 'Jalisco, México', notes: ['Miel', 'Canela', 'Almendra'], price: 219, stock: 15, color: '#F1C26B', shape: 'ROUND' },

  // Vino
  { slug: 'quebrada-alta-carmenere', name: 'Quebrada Alta Carménère Reserva', brand: 'quebrada-alta', category: 'vino', short: 'Tinto con notas de pimiento asado y cassis.', description: 'Carménère del valle de Colchagua con 12 meses en barrica. Frutos negros, pimiento asado y taninos redondos.', presentation: 'Botella de vidrio', volumeMl: 750, abv: 13.5, origin: 'Colchagua, Chile', notes: ['Cassis', 'Pimiento asado', 'Chocolate'], price: 79, sale: 65, stock: 48, color: '#5B0A1F', shape: 'WINE' },
  { slug: 'quebrada-alta-sauvignon', name: 'Quebrada Alta Sauvignon Blanc', brand: 'quebrada-alta', category: 'vino', short: 'Blanco fresco de clima frío.', description: 'Sauvignon Blanc del valle de Casablanca. Maracuyá, lima y hierba recién cortada, con acidez vibrante.', presentation: 'Botella de vidrio', volumeMl: 750, abv: 12.5, origin: 'Casablanca, Chile', notes: ['Maracuyá', 'Lima', 'Herbal'], price: 59, stock: 36, color: '#E9F0A8', shape: 'WINE' },
  { slug: 'ica-noble-malbec', name: 'Ica Noble Malbec Gran Reserva', brand: 'bodega-ica-noble', category: 'vino', short: 'Malbec peruano con 18 meses en roble.', description: 'Intenso y estructurado: ciruela, violetas y especias dulces. Un vino para carnes a la parrilla.', presentation: 'Botella de vidrio', volumeMl: 750, abv: 14, origin: 'Ica, Perú', notes: ['Ciruela', 'Violetas', 'Especias'], price: 119, stock: 20, featured: true, color: '#4A0717', shape: 'WINE' },

  // Champagne y espumantes
  { slug: 'maison-lumiere-brut', name: 'Maison Lumière Brut Réserve', brand: 'maison-lumiere', category: 'champagne-espumantes', short: 'Champagne brut de Reims.', description: 'Ensamblaje de Chardonnay, Pinot Noir y Pinot Meunier con 36 meses sobre lías. Brioche, manzana verde y burbuja fina.', presentation: 'Botella de vidrio', volumeMl: 750, abv: 12, origin: 'Reims, Francia', notes: ['Brioche', 'Manzana verde', 'Almendra'], price: 389, stock: 10, featured: true, color: '#F3E3A0', shape: 'CHAMPAGNE' },
  { slug: 'maison-lumiere-rose', name: 'Maison Lumière Rosé', brand: 'maison-lumiere', category: 'champagne-espumantes', short: 'Champagne rosado, frutos rojos.', description: 'Rosado elegante con fresas silvestres, cereza y un final cremoso.', presentation: 'Botella de vidrio', volumeMl: 750, abv: 12, origin: 'Reims, Francia', notes: ['Fresa silvestre', 'Cereza', 'Cremoso'], price: 459, sale: 399, stock: 5, color: '#F9B4B4', shape: 'CHAMPAGNE' },
  { slug: 'ica-noble-espumante', name: 'Ica Noble Espumante Extra Brut', brand: 'bodega-ica-noble', category: 'champagne-espumantes', short: 'Método tradicional, uvas de Ica.', description: 'Espumante peruano elaborado por método tradicional. Fresco, cítrico y con burbuja persistente.', presentation: 'Botella de vidrio', volumeMl: 750, abv: 12, origin: 'Ica, Perú', notes: ['Cítricos', 'Pera', 'Pan tostado'], price: 89, stock: 30, color: '#F6EDB8', shape: 'CHAMPAGNE' },

  // Licores
  { slug: 'velvet-amaro', name: 'Velvet Amaro Notte', brand: 'velvet-spirits', category: 'licores', short: 'Amaro italiano de 28 hierbas.', description: 'Amargo digestivo con genciana, naranja amarga y regaliz. Perfecto solo con hielo o en un Negroni alternativo.', volumeMl: 700, abv: 28, origin: 'Piamonte, Italia', notes: ['Naranja amarga', 'Regaliz', 'Hierbas'], price: 109, stock: 16, color: '#3B0D0D', shape: 'CLASSIC' },
  { slug: 'velvet-crema-cafe', name: 'Velvet Crema de Café', brand: 'velvet-spirits', category: 'licores', short: 'Licor cremoso de café arábica.', description: 'Licor de café de especialidad con crema. Suave, dulce y aromático, ideal para postres o un espresso martini.', volumeMl: 700, abv: 17, origin: 'Italia', notes: ['Café', 'Crema', 'Caramelo'], price: 79, sale: 69, stock: 24, color: '#6B3E26', shape: 'ROUND' },
  { slug: 'velvet-limoncello', name: 'Velvet Limoncello', brand: 'velvet-spirits', category: 'licores', short: 'Limones de Amalfi macerados.', description: 'Licor tradicional de cáscaras de limón. Servir muy frío como digestivo.', volumeMl: 500, abv: 30, origin: 'Amalfi, Italia', notes: ['Limón', 'Dulce', 'Fresco'], price: 65, stock: 3, color: '#FDE047', shape: 'TALL' },

  // Cócteles preparados
  { slug: 'neon-lab-espresso-martini', name: 'Espresso Martini', brand: 'neon-lab', category: 'cocteles-preparados', short: 'Vodka, café y licor de café. Agitar y servir.', description: 'Nuestra receta de barra: vodka, espresso de origen peruano y licor de café. Agita con hielo y sirve en copa fría.', presentation: 'Lata', volumeMl: 250, abv: 12, origin: 'Lima, Perú', notes: ['Café', 'Cacao', 'Vainilla'], price: 18, stock: 120, featured: true, color: '#3A2418', shape: 'CAN' },
  { slug: 'neon-lab-negroni', name: 'Negroni Clásico', brand: 'neon-lab', category: 'cocteles-preparados', short: 'Gin, vermut rosso y bitter.', description: 'El clásico italiano en proporciones perfectas. Sirve sobre un cubo de hielo grande con piel de naranja.', presentation: 'Botella de vidrio', volumeMl: 500, abv: 24, origin: 'Lima, Perú', notes: ['Amargo', 'Naranja', 'Herbal'], price: 59, stock: 40, color: '#B91C1C', shape: 'TALL' },
  { slug: 'neon-lab-maracuya-sour', name: 'Maracuyá Sour', brand: 'neon-lab', category: 'cocteles-preparados', short: 'Pisco, maracuyá y limón.', description: 'Un sour peruano con pulpa de maracuyá y limón. Agita con hielo para lograr espuma.', presentation: 'Lata', volumeMl: 250, abv: 10, origin: 'Lima, Perú', notes: ['Maracuyá', 'Limón', 'Pisco'], price: 16, sale: 13, stock: 90, color: '#FBBF24', shape: 'CAN' },

  // Sin alcohol
  { slug: 'zero-proof-gin-00', name: 'Zero Proof Botanical 0.0', brand: 'zero-proof', category: 'sin-alcohol', short: 'Destilado botánico sin alcohol.', description: 'Todo el carácter de un gin —enebro, cítricos y especias— sin alcohol. Para un gin tonic 0.0.', volumeMl: 700, abv: 0, origin: 'Perú', notes: ['Enebro', 'Cítricos', 'Jengibre'], price: 89, stock: 22, color: '#E0F2FE', shape: 'SQUARE' },
  { slug: 'zero-proof-tonica', name: 'Tónica Premium Indian (pack x4)', brand: 'zero-proof', category: 'sin-alcohol', short: 'Quinina natural, burbuja fina.', description: 'Agua tónica con quinina natural y azúcar de caña. Pack de 4 botellas de 200 ml.', presentation: 'Pack de 4 botellas', volumeMl: 800, abv: null, origin: 'Perú', notes: ['Quinina', 'Cítrico', 'Burbuja fina'], price: 28, stock: 70, color: '#F0FDFA', shape: 'CAN' },
  { slug: 'zero-proof-spritz', name: 'Spritz 0.0', brand: 'zero-proof', category: 'sin-alcohol', short: 'Aperitivo amargo sin alcohol.', description: 'Naranja amarga, ruibarbo y genciana. Mezcla con tónica y una rodaja de naranja.', volumeMl: 500, abv: 0, origin: 'Perú', notes: ['Naranja amarga', 'Ruibarbo'], price: 49, stock: 18, color: '#F97316', shape: 'TALL' },
];

const coupons = [
  { code: 'NEON10', description: '10% de descuento en compras desde S/ 100', type: 'PERCENT' as const, value: 10, minSubtotalCents: 10000 },
  { code: 'BIENVENIDA20', description: 'S/ 20 de descuento en tu primera compra desde S/ 150', type: 'FIXED' as const, value: 2000, minSubtotalCents: 15000, maxUses: 500 },
];

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@neonliquor.local').trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'ADMIN') await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`• Administrador ya existe: ${email} (la contraseña no se modificó)`);
    return;
  }

  let password = process.env.ADMIN_PASSWORD?.trim() ?? '';
  let generated = false;
  if (!password) {
    password = `${randomBytes(12).toString('base64url')}9a`;
    generated = true;
  } else if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres');
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      firstName: 'Admin',
      lastName: 'NEON',
      birthDate: new Date('1990-01-01T00:00:00Z'),
      role: 'ADMIN',
    },
  });
  console.log('\n┌──────────── CUENTA DE ADMINISTRADOR CREADA ────────────');
  console.log(`│ Correo:     ${email}`);
  console.log(`│ Contraseña: ${generated ? password : '(la definida en ADMIN_PASSWORD)'}`);
  if (generated) console.log('│ Guárdala ahora: no se volverá a mostrar.');
  console.log('└────────────────────────────────────────────────────────\n');
}

async function main() {
  console.log('Sembrando datos de NEON LIQUOR…');

  for (const [i, c] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { ...c, sortOrder: i },
      update: { name: c.name, description: c.description, accentColor: c.accentColor, sortOrder: i, isAlcoholic: c.isAlcoholic ?? true },
    });
  }
  for (const b of brands) {
    await prisma.brand.upsert({ where: { slug: b.slug }, create: b, update: b });
  }

  const categoryIds = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const brandIds = new Map((await prisma.brand.findMany()).map((b) => [b.slug, b.id]));

  let created = 0;
  for (const [i, p] of products.entries()) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists) continue; // no se pisan cambios hechos desde el panel
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        brandId: brandIds.get(p.brand)!,
        categoryId: categoryIds.get(p.category)!,
        shortDescription: p.short,
        description: p.description,
        presentation: p.presentation ?? 'Botella de vidrio',
        volumeMl: p.volumeMl,
        abv: p.abv,
        origin: p.origin,
        tastingNotes: p.notes,
        priceCents: Math.round(p.price * 100),
        salePriceCents: p.sale ? Math.round(p.sale * 100) : null,
        stock: p.stock,
        isFeatured: p.featured ?? false,
        accentColor: p.color,
        bottleShape: p.shape,
        // Fechas escalonadas para que "Novedades" tenga un orden estable.
        createdAt: new Date(Date.now() - (products.length - i) * 36 * 60 * 60 * 1000),
      },
    });
    created++;
  }
  console.log(`• ${categories.length} categorías, ${brands.length} marcas, ${created} productos nuevos`);

  for (const c of coupons) {
    await prisma.coupon.upsert({ where: { code: c.code }, create: c, update: {} });
  }
  console.log(`• Cupones de ejemplo: ${coupons.map((c) => c.code).join(', ')}`);

  await seedAdmin();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
