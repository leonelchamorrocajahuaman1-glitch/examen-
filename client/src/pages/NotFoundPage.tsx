import { ArrowLeft } from 'lucide-react';
import { BottleArt } from '../components/product/BottleArt';
import { LinkButton } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <BottleArt shape="TALL" color="#7C3AED" brand="404" className="h-48 w-auto animate-float opacity-80" />
      <p className="eyebrow mt-8">Error 404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold md:text-4xl">Esta botella no está en la vitrina</h1>
      <p className="mt-3 max-w-md text-fg-muted">La página que buscas no existe o fue movida.</p>
      <LinkButton to="/catalogo" className="mt-8" icon={<ArrowLeft className="size-4" />}>
        Volver al catálogo
      </LinkButton>
    </div>
  );
}
