import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { Heart, LogOut, MapPin, Package, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';
import NotFoundPage from '../NotFoundPage';
import { AddressesPage } from './AddressesPage';
import { FavoritesPage } from './FavoritesPage';
import { OrderDetailPage, OrdersPage } from './OrdersPage';
import { ProfilePage } from './ProfilePage';

const tabs = [
  { to: '/cuenta', label: 'Mi perfil', icon: UserRound, end: true },
  { to: '/cuenta/pedidos', label: 'Mis pedidos', icon: Package },
  { to: '/cuenta/direcciones', label: 'Direcciones', icon: MapPin },
  { to: '/cuenta/favoritos', label: 'Favoritos', icon: Heart },
];

export default function AccountRoutes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="container-page py-10 md:py-14">
      <p className="eyebrow mb-3">Mi cuenta</p>
      <h1 className="font-display text-3xl font-semibold md:text-4xl">Hola, {user?.firstName}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside>
          <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0" aria-label="Cuenta">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-violet/15 text-fg' : 'text-fg-muted hover:bg-white/5 hover:text-fg',
                  )
                }
              >
                <Icon className="size-4" /> {label}
              </NavLink>
            ))}
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger lg:mt-4"
            >
              <LogOut className="size-4" /> Cerrar sesión
            </button>
          </nav>
        </aside>
        <div className="min-w-0">
          <Routes>
            <Route index element={<ProfilePage />} />
            <Route path="pedidos" element={<OrdersPage />} />
            <Route path="pedidos/:id" element={<OrderDetailPage />} />
            <Route path="direcciones" element={<AddressesPage />} />
            <Route path="favoritos" element={<FavoritesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
