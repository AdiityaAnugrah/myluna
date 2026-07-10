import { Router } from 'express';
import { otherIncomeController } from '../controllers/otherIncome.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import multer from 'multer';
import path from 'path';
import { ensureUploadDir, getSafeUploadExtension, secureFileFilter, safeRandomFilename, validateUploadedFilesContent } from '../utils/uploadSecurity';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'proofs');
ensureUploadDir(uploadDir);

// Upload middleware for proof document (max 3MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = getSafeUploadExtension(file, 'image-or-pdf');
    cb(null, safeRandomFilename('other-income', ext));
  },
});

const uploadProof = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
  fileFilter: secureFileFilter('image-or-pdf'),
}).single('proofDocument');

// All routes require authentication
router.use(auth);

// Get all other incomes
router.get('/', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), otherIncomeController.getAll);

// Get by ID
router.get('/:id', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), otherIncomeController.getById);

// Create new other income
router.post('/', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), uploadProof, validateUploadedFilesContent, otherIncomeController.create);

// Update other income
router.put('/:id', rbac(['SUPER_ADMIN', 'ADMIN', 'USER']), uploadProof, validateUploadedFilesContent, otherIncomeController.update);

// Delete other income (SUPER_ADMIN only)
router.delete('/:id', rbac(['SUPER_ADMIN']), otherIncomeController.delete);

export default router;
