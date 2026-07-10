import multer from 'multer';
import path from 'path';
import { ensureUploadDir, secureFileFilter, safeRandomFilename } from '../utils/uploadSecurity';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads/documents');
ensureUploadDir(uploadDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, safeRandomFilename('shipping', '.pdf'));
  },
});

// Multer instance
export const uploadShippingDocument = multer({
  storage,
  fileFilter: secureFileFilter('pdf'),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});
