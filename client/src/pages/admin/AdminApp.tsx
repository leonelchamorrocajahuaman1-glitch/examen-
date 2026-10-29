import { useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgePercent,
  Boxes,
  ExternalLink,
  Gauge,
  Layers,
  LogOut,
  Mail,
  Menu,
  ReceiptText,
  ShieldX,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { Button, LinkButton } from '../../components/ui/Button';
import { Input } from '../../components/ui/Field';
import { PageLoader } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import type { ApiError } from '../../lib/api';
import { cn } from '../../lib/format';
import { toast } from '../../store/toast';
import { AdminCoupons } from './AdminCoupons';
import { AdminCustomers } from './AdminCustomers';
import { AdminDashboard } from './AdminDashboard';
import { AdminOrderDetail, AdminOrders } from './AdminOrders';
import { AdminProductForm, AdminProducts } from './AdminProducts';
import { AdminBrands, AdminCategories } from './AdminTaxonomy';

const nav = [
  { to: '/admin', label: 'Resumen', icon: Gauge, end: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ReceiptText },
  { to: '/admin/productos', label: 'Productos', icon: Boxes },
  { to: '/admin/categorias', label: 'Categorías', icon: Layers },
  { to: '/admin/marcas', label: 'Marcas', icon: Tags },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/cupones', label: 'Cupones', icon: BadgePercent },
];

function AdminLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const u = await login(email, password);
      if (u.role !== 'ADMIN') {
        await logout();
        setError('Esta cuenta no tiene permisos de administración.');
        return;
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-950 p-4">
      <div className="grid-lines pointer-events-none fixed inset-0" aria-hidden />
      <div className="pointer-events-none fixed top-0 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/25 blur-[120px]" aria-hidden />
      <form onSubmit={submit} className="glass-strong relative w-full max-w-sm rounded-3xl p-8 shadow-card" noValidate>
        <Logo to="/admin/login" suffix="ADMIN" />
        <h1 className="mt-8 font-display text-xl font-semibold">Panel de administración</h1>
        <p className="mt-1 text-sm text-fg-muted">Acceso exclusivo para el personal autorizado.</p>
        <div className="mt-6 space-y-4">
          {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger" role="alert">{error}</p>}
          <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="size-4" />} autoComplete="username" autoFocus />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !password}>
            Ingresar al panel
          </Button>
        </div>
      </form>
    </div>
  );
}

function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between px-5">
        <div>
          <Logo to="/admin" />
          <p className="mt-1.5 pl-[42px] text-[10px] font-semibold tracking-[0.2em] text-fg-subtle uppercase">Administración</p>
        </div>
        <button className="rounded-lg p-2 text-fg-subtle lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Administración">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-violet/15 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan" />}
                <Icon className="size-4" /> {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted hover:bg-white/5 hover:text-fg">
          <ExternalLink className="size-4" /> Ver tienda
        </a>
        <button
          onClick={async () => {
            await logout();
            toast.info('Sesión cerrada');
            navigate('/admin/login', { replace: true });
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="size-4" /> Cerrar sesión
        </button>
        <div className="px-3 pt-2">
          <p className="truncate text-xs font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-xs text-fg-subtle">{user?.email}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-ink-950 text-fg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-ink-900 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 w-64 border-r border-line bg-ink-900"
            >
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink-950/85 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-fg-muted" aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <Logo to="/admin" suffix="ADMIN" />
        </header>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="pedidos/:id" element={<AdminOrderDetail />} />
            <Route path="productos" element={<AdminProducts />} />
            <Route path="productos/nuevo" element={<AdminProductForm />} />
            <Route path="productos/:id" element={<AdminProductForm />} />
            <Route path="categorias" element={<AdminCategories />} />
            <Route path="marcas" element={<AdminBrands />} />
            <Route path="clientes" element={<AdminCustomers />} />
            <Route path="cupones" element={<AdminCoupons />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </motion.main>
      </div>
    </div>
  );
}

/** Aplicación de administración: login propio, layout propio y rutas protegidas por rol. */
export default function AdminApp() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader label="Verificando sesión…" />;

  if (location.pathname.startsWith('/admin/login')) {
    return user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <AdminLogin />;
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink-950 p-6 text-center">
        <ShieldX className="size-12 text-danger" strokeWidth={1.5} />
        <h1 className="font-display text-2xl font-semibold">Acceso denegado</h1>
        <p className="max-w-sm text-fg-muted">Tu cuenta no tiene permisos para el panel de administración.</p>
        <div className="flex gap-2">
          <LinkButton to="/" variant="secondary">
            Ir a la tienda
          </LinkButton>
          <Button onClick={() => logout()}>Cambiar de cuenta</Button>
        </div>
      </div>
    );
  }
  return <AdminLayout />;
}
