import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireCustomer, ScrollToTop, StoreLayout } from './components/layout/StoreLayout';
import { PageLoader } from './components/ui/Spinner';
import { Toaster } from './components/ui/Toaster';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import BrandsPage from './pages/BrandsPage';
import LegalPage from './pages/LegalPage';
import NotFoundPage from './pages/NotFoundPage';

// Rutas que no se necesitan al entrar: se cargan bajo demanda.
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const AccountRoutes = lazy(() => import('./pages/account/AccountRoutes'));
// El panel de administración es una aplicación aparte dentro del mismo build: su código
// solo se descarga al entrar en /admin.
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route element={<StoreLayout />}>
            <Route index element={<HomePage />} />
            <Route path="catalogo" element={<CatalogPage />} />
            <Route path="producto/:slug" element={<ProductPage />} />
            <Route path="marcas" element={<BrandsPage />} />
            <Route path="carrito" element={<CartPage />} />
            <Route
              path="checkout"
              element={
                <RequireCustomer>
                  <CheckoutPage />
                </RequireCustomer>
              }
            />
            <Route
              path="pedido/:id/confirmacion"
              element={
                <RequireCustomer>
                  <OrderSuccessPage />
                </RequireCustomer>
              }
            />
            <Route
              path="cuenta/*"
              element={
                <RequireCustomer>
                  <AccountRoutes />
                </RequireCustomer>
              }
            />
            <Route path="ingresar" element={<LoginPage />} />
            <Route path="registro" element={<RegisterPage />} />
            <Route path="recuperar-contrasena" element={<ForgotPasswordPage />} />
            <Route path="restablecer-contrasena" element={<ResetPasswordPage />} />
            <Route path="legal/:slug" element={<LegalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}
