import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';
import { cartCount, useCart } from '../../store/cart';
import { Logo } from './Logo';
import { SearchOverlay } from './SearchOverlay';

const links = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/catalogo?coleccion=premium', label: 'Colección' },
  { to: '/catalogo?ofertas=1', label: 'Ofertas' },
  { to: '/marcas', label: 'Marcas' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const items = useCart((s) => s.items);
  const openDrawer = useCart((s) => s.openDrawer);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const count = cartCount(items);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const iconBtn =
    'relative flex size-10 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-white/5 hover:text-fg';

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
          scrolled || menuOpen ? 'glass-strong border-x-0 border-t-0' : 'border-b border-transparent',
        )}
      >
        <nav className="container-page flex h-16 items-center justify-between gap-4 md:h-[72px]" aria-label="Principal">
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                      isActive && !l.to.includes('?') ? 'text-fg' : 'text-fg-muted hover:text-fg',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {l.label}
                      {isActive && !l.to.includes('?') && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute inset-x-3 -bottom-0.5 h-px bg-cyan shadow-[0_0_12px_#22d3ee]"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Buscar (Ctrl + K)">
              <Search className="size-[19px]" />
            </button>
            {user?.role !== 'ADMIN' && (
              <Link to="/cuenta/favoritos" className={cn(iconBtn, 'hidden sm:flex')} aria-label="Favoritos">
                <Heart className="size-[19px]" />
              </Link>
            )}

            <div className="relative">
              <button
                className={iconBtn}
                onClick={() => (user ? setUserMenu((v) => !v) : navigate('/ingresar'))}
                aria-label={user ? 'Mi cuenta' : 'Iniciar sesión'}
                aria-expanded={user ? userMenu : undefined}
              >
                {user ? (
                  <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet to-cyan text-xs font-bold text-white">
                    {user.firstName[0]}
                  </span>
                ) : (
                  <UserIcon className="size-[19px]" />
                )}
              </button>
              <AnimatePresence>
                {user && userMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="glass-strong absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl p-1.5 shadow-card"
                    >
                      <div className="px-3 py-2.5">
                        <p className="truncate text-sm font-semibold">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-xs text-fg-subtle">{user.email}</p>
                      </div>
                      <div className="my-1 h-px bg-line" />
                      {user.role === 'ADMIN' ? (
                        <MenuLink to="/admin" icon={<LayoutDashboard className="size-4" />} onClick={() => setUserMenu(false)}>
                          Panel de administración
                        </MenuLink>
                      ) : (
                        <>
                          <MenuLink to="/cuenta" icon={<UserIcon className="size-4" />} onClick={() => setUserMenu(false)}>
                            Mi cuenta
                          </MenuLink>
                          <MenuLink to="/cuenta/pedidos" icon={<ShoppingBag className="size-4" />} onClick={() => setUserMenu(false)}>
                            Mis pedidos
                          </MenuLink>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          setUserMenu(false);
                          await logout();
                          navigate('/');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-white/5 hover:text-danger"
                      >
                        <LogOut className="size-4" /> Cerrar sesión
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button className={iconBtn} onClick={openDrawer} aria-label={`Carrito, ${count} productos`}>
              <ShoppingBag className="size-[19px]" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cyan px-1 text-[10px] font-bold text-ink-950"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button className={cn(iconBtn, 'lg:hidden')} onClick={() => setMenuOpen((v) => !v)} aria-label="Menú" aria-expanded={menuOpen}>
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-line lg:hidden"
            >
              <ul className="container-page flex flex-col py-3">
                {links.map((l, i) => (
                  <motion.li key={l.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link
                      to={l.to}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3 py-3 font-display text-base font-medium text-fg-muted hover:bg-white/5 hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuLink({ to, icon, children, onClick }: { to: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
    >
      {icon}
      {children}
    </Link>
  );
}
