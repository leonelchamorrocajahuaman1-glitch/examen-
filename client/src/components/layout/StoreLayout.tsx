import { useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../ui/Spinner';
import { AgeGate } from './AgeGate';
import { Background } from './Background';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function StoreLayout() {
  const location = useLocation();
  return (
    <div className="relative flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only z-[100] rounded-lg bg-violet px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Background />
      <Navbar />
      <AnimatePresence mode="wait">
        <motion.main
          id="contenido"
          key={location.pathname}
          className="flex-1 pt-16 md:pt-[72px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
      <CartDrawer />
      <AgeGate />
    </div>
  );
}

/** Protege rutas de cliente: redirige a /ingresar conservando el destino. */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
