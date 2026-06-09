import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/errors';

const complaintPhotoDir = path.join(process.cwd(), 'uploads/complaints/photos');
const complaintReceiptDir = path.join(process.cwd(), 'uploads/complaints/receipts');

[complaintPhotoDir, complaintReceiptDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const complaintUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 6, // max 5 photos + 1 generated pdf
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.fieldname === 'complaintPhotos') {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedImageTypes.includes(file.mimetype)) {
        cb(new AppError('Foto komplen wajib format JPEG/PNG/WebP', 400) as any);
        return;
      }
      cb(null, true);
      return;
    }

    if (file.fieldname === 'complaintReceiptPdf') {
      if (file.mimetype !== 'application/pdf') {
        cb(new AppError('Resi komplen wajib format PDF', 400) as any);
        return;
      }
      cb(null, true);
      return;
    }

    cb(new AppError('Field upload tidak dikenali', 400) as any);
  },
});

export const uploadComplaintSubmission = complaintUpload.fields([
  { name: 'complaintPhotos', maxCount: 5 },
  { name: 'complaintReceiptPdf', maxCount: 1 },
]);

export { complaintReceiptDir };
