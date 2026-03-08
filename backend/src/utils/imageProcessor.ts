import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

interface ProcessedImage {
  originalPath: string;
  webpPath: string;
  blurDataUrl: string;
  originalUrl: string;
  webpUrl: string;
}

/**
 * Process uploaded image: resize, compress, convert to WebP
 */
export async function processProductImage(
  filePath: string,
  filename: string
): Promise<ProcessedImage> {
  const uploadsDir = path.join(process.cwd(), 'uploads/products');
  const originalPath = path.join(uploadsDir, filename);
  
  // Generate WebP filename
  const webpFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const webpPath = path.join(uploadsDir, webpFilename);

  try {
    // Read file to buffer first to avoid input/output conflict
    const inputBuffer = await fs.promises.readFile(filePath);
    
    // Get metadata
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    // Resize if larger than 1200px width
    const maxWidth = 1200;
    const shouldResize = metadata.width && metadata.width > maxWidth;

    // Process and save optimized original format
    await sharp(inputBuffer)
      .resize(shouldResize ? maxWidth : undefined, undefined, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: 85, progressive: true })
      .png({ quality: 85, compressionLevel: 8 })
      .toFile(originalPath);

    // Convert to WebP
    await sharp(inputBuffer)
      .resize(shouldResize ? maxWidth : undefined, undefined, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 85 })
      .toFile(webpPath);

    // Generate blur placeholder (tiny base64 image)
    const blurBuffer = await sharp(inputBuffer)
      .resize(20, 20, { fit: 'inside' })
      .webp({ quality: 20 })
      .toBuffer();

    const blurDataUrl = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

    // Delete temporary upload file if different from original
    if (filePath !== originalPath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      originalPath,
      webpPath,
      blurDataUrl,
      originalUrl: `/uploads/products/${filename}`,
      webpUrl: `/uploads/products/${webpFilename}`,
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
    throw error;
  }
}

/**
 * Delete product images (both original and WebP)
 */
export function deleteProductImage(imageUrl: string): void {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads/products');
    const filename = path.basename(imageUrl);
    const originalPath = path.join(uploadsDir, filename);
    
    // Delete original
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
    }

    // Delete WebP version
    const webpFilename = filename.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const webpPath = path.join(uploadsDir, webpFilename);
    if (fs.existsSync(webpPath)) {
      fs.unlinkSync(webpPath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
  }
}
