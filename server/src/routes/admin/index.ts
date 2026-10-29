import { Router } from 'express';
import { requireRole } from '../../middleware/auth.js';
import { adminCouponsRouter } from './coupons.js';
import { adminCustomersRouter } from './customers.js';
import { dashboardRouter } from './dashboard.js';
import { adminOrdersRouter } from './orders.js';
import { adminProductsRouter } from './products.js';
import { adminBrandsRouter, adminCategoriesRouter } from './taxonomy.js';

export const adminRouter = Router();

// Todas las rutas de administración exigen sesión con rol ADMIN.
adminRouter.use(requireRole('ADMIN'));

adminRouter.use('/dashboard', dashboardRouter);
adminRouter.use('/products', adminProductsRouter);
adminRouter.use('/categories', adminCategoriesRouter);
adminRouter.use('/brands', adminBrandsRouter);
adminRouter.use('/orders', adminOrdersRouter);
adminRouter.use('/customers', adminCustomersRouter);
adminRouter.use('/coupons', adminCouponsRouter);
