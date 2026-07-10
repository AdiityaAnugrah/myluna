import multer from 'multer';
import path from 'path';
import { ensureUploadDir, getSafeUploadExtension, secureFileFilter, safeRandomFilename } from '../utils/uploadSecurity';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads/products');
ensureUploadDir(uploadDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = getSafeUploadExtension(file, 'image');
    cb(null, safeRandomFilename(file.fieldname || 'image', ext));
  },
});

// Multer instance
export const uploadProductImage = multer({
  storage,
  fileFilter: secureFileFilter('image'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
