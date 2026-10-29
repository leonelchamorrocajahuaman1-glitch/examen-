import { Link, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useStoreConfig } from '../hooks/useStoreConfig';
import { formatPrice } from '../lib/format';
import NotFoundPage from './NotFoundPage';

interface Doc {
  title: string;
  body: (ctx: { email: string; threshold: string | null }) => { h: string; p: string }[];
}

// Textos base. Revísalos con tu asesor legal antes de publicar la tienda.
const docs: Record<string, Doc> = {
  terminos: {
    title: 'Términos y condiciones',
    body: () => [
      { h: 'Mayoría de edad', p: 'La venta de bebidas alcohólicas está dirigida exclusivamente a personas mayores de 18 años, conforme a la Ley N.° 28681. Al registrarte y comprar declaras cumplir este requisito. El repartidor puede solicitar un documento de identidad al entregar el pedido y no entregará productos a menores de edad.' },
      { h: 'Precios y stock', p: 'Los precios están expresados en soles (S/) e incluyen IGV. El precio y la disponibilidad se confirman al momento de registrar el pedido. Si un producto se agota mientras compras, te avisaremos antes de confirmar.' },
      { h: 'Pedidos', p: 'Un pedido queda registrado al confirmarlo en el checkout. La tienda puede cancelar pedidos con datos incompletos, sin cobertura de entrega o que incumplan estos términos; en ese caso se reintegra el stock y, si hubo pago, se gestiona la devolución.' },
      { h: 'Pagos', p: 'Solo se ofrecen los métodos de pago habilitados en el checkout. NEON LIQUOR no solicita ni almacena datos de tarjetas bancarias. Los pedidos marcados como “prueba” no generan cobros.' },
    ],
  },
  privacidad: {
    title: 'Política de privacidad',
    body: ({ email }) => [
      { h: 'Datos que tratamos', p: 'Nombre, correo, teléfono, fecha de nacimiento (para verificar la mayoría de edad), direcciones de entrega e historial de pedidos.' },
      { h: 'Finalidad', p: 'Gestionar tu cuenta, procesar y entregar tus pedidos, y atender consultas. No vendemos tus datos a terceros.' },
      { h: 'Seguridad', p: 'Las contraseñas se guardan cifradas con Argon2id y las sesiones usan cookies HttpOnly que no son accesibles desde JavaScript.' },
      { h: 'Tus derechos', p: `Puedes solicitar acceso, rectificación o eliminación de tus datos (Ley N.° 29733) escribiendo a ${email}.` },
    ],
  },
  cookies: {
    title: 'Política de cookies',
    body: () => [
      { h: 'Cookies necesarias', p: 'Usamos una cookie de sesión (nl_session, HttpOnly) para mantener tu sesión iniciada y una cookie de seguridad (nl_csrf) para proteger los formularios. Son imprescindibles para el funcionamiento de la tienda.' },
      { h: 'Almacenamiento local', p: 'Tu carrito y la confirmación de mayoría de edad se guardan en el almacenamiento local de tu navegador para no perderlos al recargar la página.' },
      { h: 'Sin publicidad', p: 'No utilizamos cookies de publicidad ni de seguimiento de terceros.' },
    ],
  },
  envios: {
    title: 'Envíos y entregas',
    body: ({ threshold }) => [
      { h: 'Cobertura', p: 'Realizamos entregas en Lima Metropolitana. El delivery express está disponible en zonas con cobertura.' },
      { h: 'Plazos', p: 'Delivery estándar: 24 a 48 horas. Express: 2 a 4 horas. Recojo en tienda: listo en aproximadamente 2 horas.' },
      { h: 'Costos', p: threshold ? `El costo se muestra en el checkout antes de confirmar. El delivery estándar es gratis en compras desde ${threshold}.` : 'El costo se muestra en el checkout antes de confirmar.' },
      { h: 'Entrega', p: 'Solo entregamos a mayores de 18 años, con documento de identidad.' },
    ],
  },
  devoluciones: {
    title: 'Cambios y devoluciones',
    body: ({ email }) => [
      { h: 'Productos dañados', p: 'Si recibes un producto dañado o incorrecto, repórtalo dentro de las 24 horas siguientes a la entrega con fotos del producto y del empaque.' },
      { h: 'Productos sellados', p: 'Por seguridad, solo se aceptan devoluciones de botellas con el sello intacto.' },
      { h: 'Contacto', p: `Escríbenos a ${email} indicando tu número de pedido.` },
    ],
  },
  'consumo-responsable': {
    title: 'Consumo responsable',
    body: () => [
      { h: 'Tomar bebidas alcohólicas en exceso es dañino', p: 'Disfruta con moderación, alterna con agua y no mezcles alcohol con medicamentos.' },
      { h: 'Si vas a manejar, no bebas', p: 'Usa taxi, transporte público o designa un conductor.' },
      { h: 'Alternativas', p: 'En nuestra categoría “Bebidas sin alcohol” encontrarás destilados 0.0% y mixers premium.' },
    ],
  },
  'libro-de-reclamaciones': {
    title: 'Libro de reclamaciones',
    body: ({ email }) => [
      { h: 'Atención de reclamos', p: `Mientras se habilita el Libro de Reclamaciones virtual, puedes presentar tu reclamo o queja escribiendo a ${email} con tu nombre, DNI, número de pedido y detalle. Responderemos en un plazo máximo de 15 días hábiles.` },
    ],
  },
};

export default function LegalPage() {
  const { slug = '' } = useParams();
  const config = useStoreConfig();
  const doc = docs[slug];
  if (!doc) return <NotFoundPage />;
  const sections = doc.body({
    email: config?.contact.email ?? 'nuestro correo de contacto',
    threshold: config?.freeShippingThresholdCents ? formatPrice(config.freeShippingThresholdCents) : null,
  });

  return (
    <div className="container-page grid gap-10 py-10 md:py-14 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow mb-4">Información</p>
        <ul className="space-y-1">
          {Object.entries(docs).map(([key, d]) => (
            <li key={key}>
              <Link
                to={`/legal/${key}`}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${key === slug ? 'bg-white/5 text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <article className="max-w-3xl">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{doc.title}</h1>
        {slug === 'libro-de-reclamaciones' && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Antes de vender al público, la empresa debe registrar e implementar su Libro de Reclamaciones virtual según las normas de
            INDECOPI.
          </p>
        )}
        <div className="mt-8 space-y-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-lg font-semibold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-fg-muted">{s.p}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
