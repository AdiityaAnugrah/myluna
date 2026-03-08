import { Router } from 'express';
import { platformController } from '../controllers/platform.controller';
import { auth as authenticate } from '../middlewares/auth';
import { rbac as authorize } from '../middlewares/rbac';

const router = Router();

// Protect all routes
router.use(authenticate);

// Public (authenticated) - Get All Platforms for dropdowns
router.get('/', platformController.getAll);

// SUPER_ADMIN only - Manage Platforms
router.post('/', authorize(['SUPER_ADMIN']), platformController.create);
router.put('/:id', authorize(['SUPER_ADMIN']), platformController.update);
router.delete('/:id', authorize(['SUPER_ADMIN']), platformController.delete);

export const platformRoutes = router;
