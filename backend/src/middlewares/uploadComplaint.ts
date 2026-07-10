import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { AppError } from '../utils/errors';
import { getSafeUploadExtension } from '../utils/uploadSecurity';

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
    try {
      if (file.fieldname === 'complaintPhotos') {
        getSafeUploadExtension(file, 'image');
        cb(null, true);
        return;
      }

      if (file.fieldname === 'complaintReceiptPdf') {
        getSafeUploadExtension(file, 'pdf');
        cb(null, true);
        return;
      }

      cb(new AppError('Field upload tidak dikenali', 400) as any);
    } catch (error) {
      cb(error as any, false);
    }
  },
});

export const uploadComplaintSubmission = complaintUpload.fields([
  { name: 'complaintPhotos', maxCount: 5 },
  { name: 'complaintReceiptPdf', maxCount: 1 },
]);

export { complaintReceiptDir };
