import { Router } from 'express';
import { VariantOptionController } from '../controllers/VariantOptionController';
import { auth } from '../middlewares/auth';

const router = Router();

router.get('/', auth, VariantOptionController.list);
router.post('/', auth, VariantOptionController.create);

export default router;
