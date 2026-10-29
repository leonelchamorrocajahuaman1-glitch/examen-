import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissible?: boolean;
}

export function Modal({ open, onClose, title, description, children, size = 'md', dismissible = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose, dismissible]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'glass-strong relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-6 shadow-card outline-none sm:rounded-3xl sm:p-8',
              size === 'sm' && 'sm:max-w-md',
              size === 'md' && 'sm:max-w-xl',
              size === 'lg' && 'sm:max-w-3xl',
            )}
          >
            {(title || dismissible) && (
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="font-display text-xl font-semibold">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
                </div>
                {dismissible && (
                  <button
                    onClick={onClose}
                    className="-mr-2 -mt-1 rounded-lg p-2 text-fg-subtle transition-colors hover:bg-white/5 hover:text-fg"
                    aria-label="Cerrar"
                  >
                    <X className="size-5" />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
