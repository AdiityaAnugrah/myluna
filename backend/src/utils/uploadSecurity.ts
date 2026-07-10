import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { NextFunction, Request, Response } from 'express';
import { AppError } from './errors';

export const SAFE_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const DOCUMENT_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
};

const DANGEROUS_EXTENSION_PATTERN =
  /\.(php\d?|phtml|phar|asp|aspx|jsp|jspx|cgi|pl|py|rb|sh|bash|bat|cmd|com|exe|dll|msi|jar|js|mjs|cjs|vbs|wsf|hta|html?|svg|xml)$/i;

function originalNameHasDangerousSegment(originalName: string) {
  const base = path.basename(originalName || '');
  return base.split('.').some((part, index, parts) => {
    if (index === 0 || index === parts.length - 1) return false;
    return DANGEROUS_EXTENSION_PATTERN.test(`.${part}`);
  }) || DANGEROUS_EXTENSION_PATTERN.test(path.extname(base));
}

export function ensureUploadDir(uploadDir: string) {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export function safeRandomFilename(prefix: string, extension: string) {
  const safePrefix = prefix.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `${safePrefix}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
}

export function getSafeUploadExtension(file: Express.Multer.File, mode: 'image' | 'pdf' | 'image-or-pdf') {
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  const allowedByMime = {
    ...(mode === 'image' || mode === 'image-or-pdf' ? IMAGE_MIME_TO_EXT : {}),
    ...(mode === 'pdf' || mode === 'image-or-pdf' ? DOCUMENT_MIME_TO_EXT : {}),
  };
  const expectedExt = allowedByMime[file.mimetype];

  if (!expectedExt) {
    throw new AppError(mode === 'pdf' ? 'Format file tidak didukung. Hanya PDF yang diperbolehkan.' : 'Format file tidak didukung. Gunakan JPEG, PNG, atau WebP.', 400);
  }

  if (!SAFE_UPLOAD_EXTENSIONS.has(originalExt)) {
    throw new AppError('Ekstensi file tidak didukung.', 400);
  }

  if (originalNameHasDangerousSegment(file.originalname)) {
    throw new AppError('Nama file mengandung ekstensi yang tidak diizinkan.', 400);
  }

  if (expectedExt === '.jpg' && ['.jpg', '.jpeg'].includes(originalExt)) return originalExt;
  if (originalExt !== expectedExt) {
    throw new AppError('Ekstensi file tidak sesuai dengan tipe file.', 400);
  }

  return expectedExt;
}

export function secureFileFilter(mode: 'image' | 'pdf' | 'image-or-pdf') {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      getSafeUploadExtension(file, mode);
      cb(null, true);
    } catch (error) {
      cb(error as any, false);
    }
  };
}

export function isPdfBuffer(buffer: Buffer) {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

export function assertPdfBuffer(buffer: Buffer) {
  if (!isPdfBuffer(buffer)) {
    throw new AppError('Isi file PDF tidak valid.', 400);
  }
}

export function assertPdfFile(filePath: string) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(5);
    fs.readSync(fd, header, 0, 5, 0);
    assertPdfBuffer(header);
  } finally {
    fs.closeSync(fd);
  }
}

export function removeUploadedFile(filePath?: string) {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function assertImageContent(file: Express.Multer.File) {
  const input = file.buffer || file.path;
  const metadata = await sharp(input).metadata();
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new AppError('Isi file gambar tidak valid.', 400);
  }
}

async function assertPdfContent(file: Express.Multer.File) {
  if (file.buffer) {
    assertPdfBuffer(file.buffer);
    return;
  }
  assertPdfFile(file.path);
}

function flattenFiles(req: Request): Express.Multer.File[] {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((group) => files.push(...group));
  }
  return files;
}

export async function validateUploadedFilesContent(req: Request, _res: Response, next: NextFunction) {
  const files = flattenFiles(req);
  try {
    for (const file of files) {
      if (file.mimetype === 'application/pdf') {
        await assertPdfContent(file);
      } else if (file.mimetype.startsWith('image/')) {
        await assertImageContent(file);
      } else {
        throw new AppError('Tipe file tidak diizinkan.', 400);
      }
    }
    next();
  } catch (error) {
    files.forEach((file) => removeUploadedFile(file.path));
    next(error);
  }
}
