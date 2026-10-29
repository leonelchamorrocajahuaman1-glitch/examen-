import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Search, X } from 'lucide-react';
import { useDebounced, useFetch } from '../../hooks/useFetch';
import { qs } from '../../lib/api';
import type { Paginated, Product } from '../../lib/types';
import { formatVolume } from '../../lib/format';
import { Spinner } from '../ui/Spinner';
import { Price } from '../ui/misc';
import { ProductVisual } from '../product/ProductVisual';

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term.trim(), 180);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data, loading } = useFetch<Paginated<Product>>(
    open && debounced.length >= 2 ? `/products${qs({ search: debounced, pageSize: 6 })}` : null,
  );

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;
    navigate(`/catalogo${qs({ q: term.trim() })}`);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="container-page relative pt-20 sm:pt-28"
            role="dialog"
            aria-label="Buscar productos"
          >
            <form onSubmit={submit} className="glass-strong mx-auto flex max-w-3xl items-center gap-3 rounded-2xl px-4 shadow-card">
              <Search className="size-5 shrink-0 text-cyan" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Busca whisky, gin, una marca…"
                className="h-16 w-full bg-transparent text-lg outline-none placeholder:text-fg-subtle"
                aria-label="Buscar"
              />
              {loading && <Spinner className="size-5 text-fg-subtle" />}
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-fg-subtle hover:text-fg" aria-label="Cerrar búsqueda">
                <X className="size-5" />
              </button>
            </form>

            <div className="mx-auto mt-3 max-w-3xl">
              {debounced.length >= 2 && data && (
                <div className="glass-strong overflow-hidden rounded-2xl">
                  {data.items.length === 0 ? (
                    <p className="p-6 text-sm text-fg-muted">No encontramos resultados para “{debounced}”.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {data.items.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/producto/${p.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[.04]"
                          >
                            <div className="flex h-14 w-10 shrink-0 items-center justify-center">
                              <ProductVisual
                                name={p.name}
                                brand={p.brand.name}
                                shape={p.bottleShape}
                                color={p.accentColor}
                                imageUrl={p.images[0]?.url}
                                className="h-14 w-auto"
                                imgClassName="h-14 w-10"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{p.name}</p>
                              <p className="text-xs text-fg-subtle">
                                {p.brand.name} · {p.category.name} · {formatVolume(p.volumeMl)}
                              </p>
                            </div>
                            <Price priceCents={p.priceCents} salePriceCents={p.salePriceCents} size="sm" className="justify-end" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {data.total > data.items.length && (
                    <button
                      onClick={submit}
                      className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold text-cyan hover:bg-white/[.03]"
                    >
                      Ver los {data.total} resultados <ArrowRight className="size-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
