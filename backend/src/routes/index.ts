import { Router } from 'express';
import authRoutes from './auth.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import supplierRoutes from './supplier.routes';
import purchaseRoutes from './purchase.routes';
import saleRoutes from './sale.routes';
import stockRoutes from './stock.routes';
import productRequestRoutes from './productRequest.routes';
import saleRequestRoutes from './saleRequest.routes';
import userRoutes from './user.routes';
import { platformRoutes } from './platform.routes';

import changeRequestRoutes from './changeRequest.routes';
import auditRoutes from './audit.routes';
import settlementRoutes from './settlement.routes';
import financialRoutes from './financial.routes';
import expenseRoutes from './expense.routes';
import { shippingRoutes } from './shipping.routes';
import otherIncomeRoutes from './otherIncome.routes';
import searchRoutes from './search.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/sales', saleRoutes);
router.use('/stock', stockRoutes);
router.use('/product-requests', productRequestRoutes);
router.use('/sale-requests', saleRequestRoutes);
router.use('/change-requests', changeRequestRoutes);
router.use('/users', userRoutes);
router.use('/platforms', platformRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/settlements', settlementRoutes);
router.use('/financial-summary', financialRoutes);
router.use('/expenses', expenseRoutes);
router.use('/shipping-services', shippingRoutes);
router.use('/other-incomes', otherIncomeRoutes);
router.use('/search', searchRoutes);

export default router;
