import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { LogoMark } from './Logo';

const KEY = 'nl-age-verified';

function readVerified() {
  try {
    return localStorage.getItem(KEY) === 'yes';
  } catch {
    return false;
  }
}

/** Verificación de mayoría de edad al entrar a la tienda (requisito para venta de alcohol). */
export function AgeGate() {
  const [verified, setVerified] = useState(readVerified);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = verified ? '' : 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [verified]);

  const accept = () => {
    try {
      localStorage.setItem(KEY, 'yes');
    } catch {
      /* modo privado: se pedirá en la próxima visita */
    }
    setVerified(true);
  };

  return (
    <AnimatePresence>
      {!verified && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-title"
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="glass-strong relative w-full max-w-md overflow-hidden rounded-3xl p-8 text-center shadow-card"
          >
            <div className="absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-violet/40 blur-3xl" aria-hidden />
            <div className="relative">
              <LogoMark className="mx-auto size-12" />
              {denied ? (
                <>
                  <ShieldAlert className="mx-auto mt-6 size-8 text-warning" />
                  <h2 id="age-title" className="mt-3 font-display text-xl font-semibold">
                    Vuelve cuando seas mayor de edad
                  </h2>
                  <p className="mt-3 text-sm text-fg-muted">
                    La venta y el consumo de bebidas alcohólicas están permitidos solo para mayores de 18 años.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow mt-6">Acceso restringido</p>
                  <h2 id="age-title" className="mt-3 font-display text-2xl font-semibold">
                    ¿Eres mayor de 18 años?
                  </h2>
                  <p className="mt-3 text-sm text-fg-muted">
                    Para ingresar a NEON LIQUOR debes tener la edad legal para comprar bebidas alcohólicas en el Perú.
                  </p>
                  <div className="mt-7 grid grid-cols-2 gap-3">
                    <Button variant="secondary" size="lg" onClick={() => setDenied(true)}>
                      No
                    </Button>
                    <Button size="lg" onClick={accept} autoFocus>
                      Sí, soy mayor
                    </Button>
                  </div>
                  <p className="mt-6 text-[11px] font-semibold tracking-[0.12em] text-warning uppercase">
                    Tomar bebidas alcohólicas en exceso es dañino
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
