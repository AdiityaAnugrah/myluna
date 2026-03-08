import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/errors';
import { Request } from 'express';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'shipping-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter (PDF only)
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('[UploadMiddleware] Processing file:', file.originalname, 'mimetype:', file.mimetype);
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError('Format file tidak didukung. Hanya file PDF yang diperbolehkan.', 400) as any, false);
  }
};

// Multer instance
export const uploadShippingDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});
