import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { Logo } from './Logo';

const columns = [
  {
    title: 'Tienda',
    links: [
      { to: '/catalogo', label: 'Catálogo completo' },
      { to: '/catalogo?coleccion=premium', label: 'Colección premium' },
      { to: '/catalogo?ofertas=1', label: 'Ofertas' },
      { to: '/marcas', label: 'Marcas' },
    ],
  },
  {
    title: 'Ayuda',
    links: [
      { to: '/cuenta/pedidos', label: 'Estado de mi pedido' },
      { to: '/legal/envios', label: 'Envíos y entregas' },
      { to: '/legal/devoluciones', label: 'Cambios y devoluciones' },
      { to: '/legal/consumo-responsable', label: 'Consumo responsable' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/legal/terminos', label: 'Términos y condiciones' },
      { to: '/legal/privacidad', label: 'Política de privacidad' },
      { to: '/legal/cookies', label: 'Política de cookies' },
      { to: '/legal/libro-de-reclamaciones', label: 'Libro de reclamaciones' },
    ],
  },
];

export function Footer() {
  const config = useStoreConfig();
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-line bg-ink-900/80">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet/60 to-transparent" />
      <div className="container-page grid gap-12 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Destilados, vinos y espumantes seleccionados, con delivery en Lima Metropolitana y recojo en tienda.
          </p>
          {config && (
            <ul className="mt-6 space-y-2.5 text-sm text-fg-muted">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-cyan" /> {config.contact.address}
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-cyan" />
                <a href={`tel:${config.contact.phone.replace(/\s/g, '')}`} className="hover:text-fg">
                  {config.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-cyan" />
                <a href={`mailto:${config.contact.email}`} className="hover:text-fg">
                  {config.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="size-4 shrink-0 text-cyan" /> {config.contact.hours}
              </li>
            </ul>
          )}
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="font-display text-xs font-semibold tracking-[0.2em] text-fg uppercase">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-fg-muted transition-colors hover:text-cyan">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-fg-subtle md:flex-row md:items-center md:justify-between">
          <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-warning uppercase">
            Tomar bebidas alcohólicas en exceso es dañino
          </p>
          <p>Venta exclusiva para mayores de {config?.legalAge ?? 18} años · Prohibida la venta a menores de edad (Ley N.° 28681)</p>
          <p>© {year} NEON LIQUOR</p>
        </div>
      </div>
    </footer>
  );
}
