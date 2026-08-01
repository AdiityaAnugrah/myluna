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
import variantOptionRoutes from './variantOption.routes';
import complaintRoutes from './complaint.routes';
import regionRoutes from './region.routes';
import analyticsRoutes from './analytics.routes';
import returnRoutes from './return.routes';
import displayRoutes from './display.routes';
import featureRoutes from './feature.routes';
import systemSettingRoutes from './systemSetting.routes';
import { auth } from '../middlewares/auth';
import { featureAccess } from '../middlewares/featureAccess';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/products', auth, featureAccess('products', { readFallbackFeatureKeys: ['stock', 'sales', 'purchases', 'display', 'complaints', 'returns'] }), productRoutes);
router.use('/categories', auth, featureAccess('categories', { readFallbackFeatureKeys: ['stock', 'products', 'sales', 'purchases', 'display'] }), categoryRoutes);
router.use('/suppliers', auth, featureAccess('suppliers', { readFallbackFeatureKeys: ['purchases'] }), supplierRoutes);
router.use('/purchases', auth, featureAccess('purchases'), purchaseRoutes);
router.use(
  '/sales',
  auth,
  featureAccess('sales', {
    readFallbackFeatureKeys: ['sales-process', 'complaints', 'returns', 'settlements'],
    actionFallbackFeatureKeys: ['sales-process'],
    actionFallbackMethods: ['POST'],
    actionFallbackPathPattern: /^\/[^/]+\/(process|approve|reject)$/,
  }),
  saleRoutes
);
router.use('/stock', auth, featureAccess('stock'), stockRoutes);
router.use('/product-requests', productRequestRoutes);
router.use('/sale-requests', saleRequestRoutes);
router.use('/change-requests', changeRequestRoutes);
router.use('/users', auth, featureAccess('users'), userRoutes);
router.use('/platforms', auth, featureAccess('platforms', { readFallbackFeatureKeys: ['sales', 'sales-process'] }), platformRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/settlements', auth, featureAccess('settlements'), settlementRoutes);
router.use('/financial-summary', auth, featureAccess('financial-summary'), financialRoutes);
router.use('/expenses', expenseRoutes);
router.use('/shipping-services', auth, featureAccess('shipping', { readFallbackFeatureKeys: ['sales', 'sales-process', 'returns', 'complaints', 'display'] }), shippingRoutes);
router.use('/other-incomes', otherIncomeRoutes);
router.use('/search', searchRoutes);
router.use('/finance', auth, featureAccess('finance-global-report'), financialRoutes);
router.use('/variant-options', variantOptionRoutes);
router.use('/complaints', auth, featureAccess('complaints'), complaintRoutes);
router.use('/regions', regionRoutes);
router.use('/analytics', auth, featureAccess('analytics'), analyticsRoutes);
router.use('/returns', auth, featureAccess('returns'), returnRoutes);
router.use('/display', auth, featureAccess('display'), displayRoutes);
router.use('/features', featureRoutes);
router.use('/system-settings', systemSettingRoutes);

export default router;
