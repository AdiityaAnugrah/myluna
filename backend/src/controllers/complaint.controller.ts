import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import {
  Complaint,
  ComplaintStatus,
  Sale,
  SaleStatus,
  User,
  AuditAction,
} from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { complaintReceiptDir, complaintVideoDir } from '../middlewares/uploadComplaint';
import { compressComplaintVideoBuffer } from '../utils/videoProcessor';

const complaintPhotoDir = path.join(process.cwd(), 'uploads/complaints/photos');
const complaintEligibleStatuses: SaleStatus[] = [
  SaleStatus.PROCESSED,
  SaleStatus.COMPLETED,
  SaleStatus.SETTLED,
];

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateComplaintNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CMP-${y}${m}${d}-${random}`;
}

export const complaintController = {
  async getEligibleSales(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '').trim();
      const where: any = {
        status: {
          [Op.in]: complaintEligibleStatuses,
        },
        isInitialBalance: false,
      };

      if (req.user?.roleName === 'USER') {
        where.createdBy = req.user.id;
      }

      if (q.length >= 2) {
        where[Op.or] = [
          { saleNumber: { [Op.like]: `%${q}%` } },
          { customerName: { [Op.like]: `%${q}%` } },
        ];
      } else {
        return successResponse(res, [], 'Eligible sales retrieved', 200);
      }

      const sales = await Sale.findAll({
        where,
        attributes: ['id', 'saleNumber', 'saleDate', 'customerName', 'customerPhone', 'status', 'createdBy'],
        order: [['saleDate', 'DESC']],
        limit: 20,
      });

      return successResponse(res, sales, 'Eligible sales retrieved', 200);
    } catch (error) {
      return next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const filesMap = (req.files as { [fieldname: string]: Express.Multer.File[] } | undefined) || {};
      const uploadedPhotos = filesMap.complaintPhotos || [];
      const uploadedReceiptPdf = filesMap.complaintReceiptPdf?.[0];
      const uploadedVideo = filesMap.complaintVideo?.[0];

      if (!uploadedPhotos.length) {
        throw new AppError('Minimal 1 foto komplen wajib diunggah', 400);
      }
      if (uploadedPhotos.length > 5) {
        throw new AppError('Maksimal 5 foto komplen', 400);
      }
      for (const photo of uploadedPhotos) {
        if (photo.size > 1024 * 1024) {
          throw new AppError(`Foto ${photo.originalname} melebihi 1MB`, 400);
        }
      }
      if (!uploadedReceiptPdf) {
        throw new AppError('PDF resi komplen wajib diunggah', 400);
      }
      if (uploadedReceiptPdf.size > 5 * 1024 * 1024) {
        throw new AppError('PDF resi komplen maksimal 5MB', 400);
      }
      if (uploadedVideo && uploadedVideo.size > 25 * 1024 * 1024) {
        throw new AppError('Video komplen maksimal 25MB', 400);
      }

      const { saleId, reason } = req.body;
      let { complaintDate } = req.body;
      const salesInformation = String(req.body.salesInformation || '').trim();
      const receiptSource = String(req.body.receiptSource || 'UPLOAD');

      if (!saleId || !reason || String(reason).trim().length < 5) {
        throw new AppError('Pesanan dan alasan komplen wajib diisi', 400);
      }
      if (receiptSource === 'GENERATED' && salesInformation.length < 10) {
        throw new AppError('Informasi Penjualan wajib diisi minimal 10 karakter', 400);
      }

      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        throw new AppError('Pesanan tidak ditemukan', 404);
      }

      if (!complaintEligibleStatuses.includes(sale.status as SaleStatus)) {
        throw new AppError('Komplen hanya bisa dibuat untuk pesanan yang sudah dikirim atau sudah pelunasan', 400);
      }

      if (req.user.roleName === 'USER' && sale.createdBy !== req.user.id) {
        throw new AppError('Anda hanya dapat membuat komplen untuk pesanan Anda sendiri', 403);
      }

      const today = getLocalDateString(new Date());
      if (req.user.roleName === 'USER') {
        complaintDate = today;
      } else {
        if (!complaintDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(complaintDate))) {
          throw new AppError('Tanggal komplen tidak valid', 400);
        }
      }

      const existingComplaint = await Complaint.findOne({
        where: {
          saleId,
          status: {
            [Op.in]: [
              ComplaintStatus.PENDING_TCP_REVIEW,
              ComplaintStatus.ACCEPTED_BY_TCP,
              ComplaintStatus.REPLACEMENT_SHIPPED,
            ],
          },
        },
      });

      if (existingComplaint) {
        throw new AppError('Pesanan ini sudah memiliki komplen aktif', 400);
      }

      const storedPhotos: string[] = [];
      for (const file of uploadedPhotos) {
        const photoFilename = `complaint-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
        const photoPath = path.join(complaintPhotoDir, photoFilename);

        await sharp(file.buffer)
          .rotate()
          .resize(1280, 1280, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 70 })
          .toFile(photoPath);

        storedPhotos.push(`/uploads/complaints/photos/${photoFilename}`);
      }

      const receiptFilename = `complaint-receipt-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
      const receiptAbsolutePath = path.join(complaintReceiptDir, receiptFilename);
      await fs.writeFile(receiptAbsolutePath, uploadedReceiptPdf.buffer);
      const complaintReceiptPdf = `/uploads/complaints/receipts/${receiptFilename}`;

      let complaintVideo: string | null = null;
      let complaintVideoOriginalSize: number | null = null;
      let complaintVideoCompressedSize: number | null = null;
      if (uploadedVideo) {
        const videoFilename = `complaint-video-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`;
        const compressedResult = await compressComplaintVideoBuffer({
          inputBuffer: uploadedVideo.buffer,
          outputDir: complaintVideoDir,
          outputFilename: videoFilename,
        });
        void compressedResult.outputPath;
        complaintVideo = `/uploads/complaints/videos/${videoFilename}`;
        complaintVideoOriginalSize = uploadedVideo.size;
        complaintVideoCompressedSize = compressedResult.outputBytes;
      }

      const complaint = await Complaint.create({
        complaintNumber: generateComplaintNumber(),
        saleId,
        saleNumberSnapshot: sale.saleNumber,
        customerNameSnapshot: sale.customerName || null,
        reason: String(reason).trim(),
        complaintDate: new Date(complaintDate),
        complaintPhoto: storedPhotos[0],
        complaintPhotos: storedPhotos,
        salesInformation: salesInformation || null,
        complaintReceiptPdf,
        complaintVideo,
        complaintVideoOriginalSize,
        complaintVideoCompressedSize,
        createdBy: req.user.id,
      });

      await auditService.log({
        userId: req.user.id,
        action: AuditAction.CREATE,
        entity: 'Complaint',
        entityId: complaint.id,
        before: null,
        after: complaint.toJSON(),
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.emitToTCP('notification:new', {
        message: 'Komplen baru siap diklaim TCP',
        description: `Komplen ${complaint.complaintNumber} untuk pesanan ${sale.saleNumber}`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil dikirim', 201);
    } catch (error) {
      return next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { page = 1, limit = 10, status = '', search = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (req.user.roleName === 'USER') {
        where.createdBy = req.user.id;
      }

      if (search) {
        where[Op.or] = [
          { complaintNumber: { [Op.like]: `%${String(search)}%` } },
          { saleNumberSnapshot: { [Op.like]: `%${String(search)}%` } },
          { customerNameSnapshot: { [Op.like]: `%${String(search)}%` } },
        ];
      }

      const { count, rows } = await Complaint.findAndCountAll({
        where,
        include: [
          {
            model: Sale,
            as: 'sale',
            attributes: ['id', 'saleNumber', 'saleDate', 'status', 'customerName', 'createdBy'],
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'fullName', 'username'],
              },
            ],
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'username'],
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'fullName', 'username'],
          },
          {
            model: User,
            as: 'shipper',
            attributes: ['id', 'fullName', 'username'],
          },
        ],
        limit: Number(limit),
        offset,
        order: [['createdAt', 'DESC']],
      });

      return successResponse(
        res,
        {
          complaints: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Complaints retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async claim(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;

      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      if (complaint.status !== ComplaintStatus.PENDING_TCP_REVIEW) {
        throw new AppError('Komplen ini tidak bisa diklaim', 400);
      }

      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.ACCEPTED_BY_TCP,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      });

      await auditService.log({
        userId: req.user.id,
        action: AuditAction.UPDATE,
        entity: 'Complaint',
        entityId: complaint.id,
        before,
        after: complaint.toJSON(),
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.emitToUser(complaint.createdBy, 'notification:new', {
        message: 'Status komplen diperbarui',
        description: `Komplen ${complaint.complaintNumber} sedang diproses oleh TCP`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil diklaim TCP', 200);
    } catch (error) {
      return next(error);
    }
  },

  async markHandled(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      if (complaint.status !== ComplaintStatus.ACCEPTED_BY_TCP) {
        throw new AppError('Komplen belum dalam status diproses TCP', 400);
      }

      if (!complaint.complaintReceiptPdf) {
        throw new AppError('PDF resi komplen tidak ditemukan', 400);
      }

      const before = complaint.toJSON();

      await complaint.update({
        status: ComplaintStatus.REPLACEMENT_SHIPPED,
        replacementProofDocument: complaint.complaintReceiptPdf,
        shippedBy: req.user.id,
        shippedAt: new Date(),
      });

      await auditService.log({
        userId: req.user.id,
        action: AuditAction.UPDATE,
        entity: 'Complaint',
        entityId: complaint.id,
        before,
        after: complaint.toJSON(),
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.emitToUser(complaint.createdBy, 'notification:new', {
        message: 'Komplen sudah ditangani TCP',
        description: `Komplen ${complaint.complaintNumber} sudah diurus oleh TCP`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Status komplen berhasil diperbarui menjadi sudah diurus', 200);
    } catch (error) {
      return next(error);
    }
  },

  async getVideoMetadata(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      if (req.user.roleName === 'USER' && complaint.createdBy !== req.user.id) {
        throw new AppError('Anda tidak memiliki akses ke metadata video ini', 403);
      }

      if (!complaint.complaintVideo) {
        throw new AppError('Komplen ini tidak memiliki video', 404);
      }

      const originalBytes = complaint.complaintVideoOriginalSize || 0;
      const compressedBytes = complaint.complaintVideoCompressedSize || 0;
      const savedBytes = Math.max(0, originalBytes - compressedBytes);
      const savedPercent =
        originalBytes > 0 ? Number(((savedBytes / originalBytes) * 100).toFixed(2)) : 0;

      return successResponse(
        res,
        {
          complaintId: complaint.id,
          complaintNumber: complaint.complaintNumber,
          videoPath: complaint.complaintVideo,
          originalBytes,
          compressedBytes,
          savedBytes,
          savedPercent,
        },
        'Metadata kompresi video berhasil diambil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },
};
