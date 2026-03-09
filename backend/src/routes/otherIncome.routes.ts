import { Router } from 'express';
import { otherIncomeController } from '../controllers/otherIncome.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/errors';
import { Request } from 'express';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'proofs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload middleware for proof document (max 3MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/proofs/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `other-income-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new AppError('Hanya file JPEG, JPG, PNG, dan PDF yang diizinkan', 400));
  }
};

const uploadProof = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
  fileFilter,
}).single('proofDocument');

// All routes require authentication
router.use(auth);

// Get all other incomes
router.get('/', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), otherIncomeController.getAll);

// Get by ID
router.get('/:id', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), otherIncomeController.getById);

// Create new other income
router.post('/', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), uploadProof, otherIncomeController.create);

// Update other income
router.put('/:id', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), uploadProof, otherIncomeController.update);

// Delete other income (SUPER_ADMIN only)
router.delete('/:id', rbac(['SUPER_ADMIN']), otherIncomeController.delete);

export default router;
