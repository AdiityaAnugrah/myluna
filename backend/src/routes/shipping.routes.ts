import { Router } from 'express';
import { shippingController } from '../controllers/shipping.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.use(auth);

// Public (authenticated) routes
router.get('/', shippingController.getAll);

// Admin only routes
router.post(
  '/',
  rbac(['ADMIN', 'SUPER_ADMIN']),
  shippingController.create
);

router.put(
  '/:id',
  rbac(['ADMIN', 'SUPER_ADMIN']),
  shippingController.update
);

router.delete(
  '/:id',
  rbac(['ADMIN', 'SUPER_ADMIN']),
  shippingController.delete
);

export const shippingRoutes = router;
