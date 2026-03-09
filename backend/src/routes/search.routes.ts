import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { auth } from '../middlewares/auth';

const router = Router();

router.get('/', auth, searchController.globalSearch);

export default router;
