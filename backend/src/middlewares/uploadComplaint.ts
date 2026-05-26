import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/errors';

const complaintPhotoDir = path.join(process.cwd(), 'uploads/complaints/photos');
const replacementProofDir = path.join(process.cwd(), 'uploads/complaints/replacements');

if (!fs.existsSync(complaintPhotoDir)) {
  fs.mkdirSync(complaintPhotoDir, { recursive: true });
}

if (!fs.existsSync(replacementProofDir)) {
  fs.mkdirSync(replacementProofDir, { recursive: true });
}

const complaintPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new AppError('Foto komplen wajib format JPEG/PNG/WebP', 400) as any);
      return;
    }
    cb(null, true);
  },
});

const replacementProofUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, replacementProofDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `complaint-replacement-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new AppError('Resi pengganti wajib format PDF', 400) as any);
      return;
    }
    cb(null, true);
  },
});

export const uploadComplaintPhoto = complaintPhotoUpload.single('complaintPhoto');
export const uploadComplaintReplacementProof = replacementProofUpload.single('replacementProof');
