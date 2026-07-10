import multer from 'multer';
import path from 'path';
import { ensureUploadDir, getSafeUploadExtension, secureFileFilter, safeRandomFilename } from '../utils/uploadSecurity';

const uploadDir = path.join(process.cwd(), 'uploads/proofs');
ensureUploadDir(uploadDir);

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = getSafeUploadExtension(file, 'image-or-pdf');
    cb(null, safeRandomFilename('proof', ext));
  },
});

// Create multer upload middleware
export const uploadProofDocument = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: secureFileFilter('image-or-pdf'),
}).single('proofDocument');
