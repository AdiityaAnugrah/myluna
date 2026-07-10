import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { AppError } from '../utils/errors';
import { getSafeUploadExtension } from '../utils/uploadSecurity';

const returnEvidenceDir = path.join(process.cwd(), 'uploads/returns/evidence');
const returnReceivedDir = path.join(process.cwd(), 'uploads/returns/received');

[returnEvidenceDir, returnReceivedDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const returnUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!['evidencePhotos', 'receivedPhotos'].includes(file.fieldname)) {
      cb(new AppError('Field upload retur tidak dikenali', 400) as any);
      return;
    }

    try {
      getSafeUploadExtension(file, 'image');
      cb(null, true);
    } catch (error) {
      cb(error as any, false);
    }
  },
});

export const uploadReturnPhotos = returnUpload.fields([
  { name: 'evidencePhotos', maxCount: 5 },
  { name: 'receivedPhotos', maxCount: 5 },
]);

export { returnEvidenceDir, returnReceivedDir };
