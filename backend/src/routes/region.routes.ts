import { Router } from 'express';
import { regionController } from '../controllers/region.controller';
import { auth } from '../middlewares/auth';

const router = Router();

router.use(auth);
router.get('/provinces', regionController.getProvinces);
router.get('/regencies', regionController.getRegencies);
router.get('/districts', regionController.getDistricts);
router.get('/villages', regionController.getVillages);

export default router;
