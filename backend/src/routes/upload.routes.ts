import { Router, Request, Response } from 'express';
import { uploadProductImage } from '../middlewares/upload';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { processProductImage } from '../utils/imageProcessor';
import { validateUploadedFilesContent } from '../utils/uploadSecurity';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

/**
 * @swagger
 * /upload/image:
 *   post:
 *     summary: Upload an image
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 */
router.post('/image', auth, rbac(['ADMIN', 'SUPER_ADMIN', 'USER']), uploadProductImage.single('image'), validateUploadedFilesContent, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new AppError('Tidak ada file yang diunggah.', 400);
    }

    // Process image: resize, compress, convert to WebP
    const processed = await processProductImage(req.file.path, req.file.filename);

    return successResponse(
      res,
      {
        imageUrl: processed.originalUrl,
        webpUrl: processed.webpUrl,
        blurDataUrl: processed.blurDataUrl,
      },
      'Gambar berhasil diunggah dan diproses',
      201
    );
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
});

export default router;
