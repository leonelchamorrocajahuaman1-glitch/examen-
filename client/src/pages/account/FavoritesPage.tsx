import { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { ProductGrid } from '../../components/product/ProductCard';
import { LinkButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/misc';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import type { Product } from '../../lib/types';

export function FavoritesPage() {
  const { favoriteIds } = useAuth();
  const { data, loading, error, setData } = useFetch<Product[]>('/account/favorites');

  // Al quitar un favorito desde una tarjeta, desaparece de la lista sin recargar.
  useEffect(() => {
    setData((prev) => (prev ?? []).filter((p) => favoriteIds.has(p.id)));
  }, [favoriteIds, setData]);

  if (error) return <p className="text-sm text-danger">{error.message}</p>;
  if (!loading && !data?.length) {
    return (
      <EmptyState
        icon={<Heart className="size-6" />}
        title="Aún no tienes favoritos"
        description="Toca el corazón en cualquier producto para guardarlo aquí."
        action={<LinkButton to="/catalogo">Explorar catálogo</LinkButton>}
      />
    );
  }
  return (
    <div>
      <h2 className="mb-5 font-display text-lg font-semibold">Mis favoritos</h2>
      <ProductGrid products={data ?? undefined} loading={loading} count={3} />
    </div>
  );
}
