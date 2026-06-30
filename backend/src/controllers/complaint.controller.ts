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
  SaleReturn,
  SaleReturnStatus,
  AuditAction,
} from '../models';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { complaintReceiptDir } from '../middlewares/uploadComplaint';
import { getLocalDateString } from '../utils/dateGuard';

const complaintPhotoDir = path.join(process.cwd(), 'uploads/complaints/photos');
const complaintEligibleStatuses: SaleStatus[] = [
  SaleStatus.PROCESSED,
  SaleStatus.COMPLETED,
  SaleStatus.SETTLED,
];

const activeReturnStatuses: SaleReturnStatus[] = [
  SaleReturnStatus.PENDING_REVIEW,
  SaleReturnStatus.WAITING_ITEM_RETURN,
  SaleReturnStatus.ITEM_RECEIVED,
];

function generateComplaintNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CMP-${y}${m}${d}-${random}`;
}

function sanitizeComplaintSalesInformation(value: string) {
  return value
    .split(/\r?\n/)
    .filter((line) => !/^\s*by\s*:/i.test(line))
    .join('\n')
    .trim();
}

const complaintActiveStatuses: ComplaintStatus[] = [
  ComplaintStatus.PENDING_TCP_REVIEW,
  ComplaintStatus.ACCEPTED_BY_TCP,
  ComplaintStatus.REPLACEMENT_SHIPPED,
];

export const complaintController = {
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const where: any = {
        status: {
          [Op.in]: complaintActiveStatuses,
        },
      };

      if (req.user.roleName === 'USER') {
        where.createdBy = req.user.id;
      }

      const activeCount = await Complaint.count({ where });
      const pendingReviewCount = await Complaint.count({
        where: {
          ...where,
          status: ComplaintStatus.PENDING_TCP_REVIEW,
        },
      });

      return successResponse(
        res,
        {
          activeCount,
          pendingReviewCount,
          badgeCount: activeCount,
        },
        'Ringkasan komplen berhasil diambil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getEligibleSales(req: Request, res: Response, next: NextFunction) {
    try {
      const q = String(req.query.q || '').trim();
      const where: any = {
        status: {
          [Op.in]: complaintEligibleStatuses,
        },
        isInitialBalance: false,
      };

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

      const { saleId, reason } = req.body;
      let { complaintDate } = req.body;
      const salesInformation = sanitizeComplaintSalesInformation(String(req.body.salesInformation || ''));
      const receiptSource = String(req.body.receiptSource || 'GENERATED');
      const recipientName = String(req.body.recipientName || '').trim();
      const recipientPhone = String(req.body.recipientPhone || '').trim();
      const recipientAddress = String(req.body.recipientAddress || '').trim();
      const recipientAddressNote = String(req.body.recipientAddressNote || '').trim();

      if (!saleId || !reason || String(reason).trim().length < 5) {
        throw new AppError('Pesanan dan alasan komplen wajib diisi', 400);
      }
      if (recipientName.length < 2) {
        throw new AppError('Nama penerima wajib diisi dengan jelas', 400);
      }
      if (recipientPhone.length < 8) {
        throw new AppError('Nomor HP penerima wajib diisi dengan benar', 400);
      }
      if (recipientAddress.length < 15) {
        throw new AppError('Alamat lengkap penerima wajib diisi minimal 15 karakter', 400);
      }
      if (receiptSource !== 'GENERATED') {
        throw new AppError('Resi komplen hanya boleh dibuat otomatis dari informasi penjualan', 400);
      }
      if (salesInformation.length < 10) {
        throw new AppError('Informasi Penjualan wajib diisi minimal 10 karakter', 400);
      }

      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        throw new AppError('Pesanan tidak ditemukan', 404);
      }

      if (!complaintEligibleStatuses.includes(sale.status as SaleStatus)) {
        throw new AppError('Komplen hanya bisa dibuat untuk pesanan yang sudah dikirim atau sudah pelunasan', 400);
      }

      const existingActiveReturn = await SaleReturn.findOne({
        where: {
          saleId,
          status: {
            [Op.in]: activeReturnStatuses,
          },
        },
      });

      if (existingActiveReturn) {
        throw new AppError('Pesanan ini sedang memiliki proses retur aktif. Selesaikan retur terlebih dahulu sebelum membuat komplen', 400);
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
            [Op.in]: complaintActiveStatuses,
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

      const complaint = await Complaint.create({
        complaintNumber: generateComplaintNumber(),
        saleId,
        saleNumberSnapshot: sale.saleNumber,
        customerNameSnapshot: sale.customerName || null,
        recipientName,
        recipientPhone,
        recipientAddress,
        recipientAddressNote: recipientAddressNote || null,
        reason: String(reason).trim(),
        complaintDate: new Date(complaintDate),
        complaintPhoto: storedPhotos[0],
        complaintPhotos: storedPhotos,
        salesInformation: salesInformation || null,
        complaintReceiptPdf,
        complaintVideo: null,
        complaintVideoOriginalSize: null,
        complaintVideoCompressedSize: null,
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
        message: 'Komplen baru siap diterima TCP',
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
            attributes: ['id', 'saleNumber', 'saleDate', 'status', 'customerName'],
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
        throw new AppError('Komplen ini tidak bisa diterima untuk diproses', 400);
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
        description: `Komplen ${complaint.complaintNumber} sudah diterima untuk diproses TCP`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil diterima untuk diproses TCP', 200);
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
        message: 'Pengganti untuk komplen sudah dikirim',
        description: `Komplen ${complaint.complaintNumber} sudah masuk tahap pengiriman pengganti`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil ditandai pengganti sudah dikirim', 200);
    } catch (error) {
      return next(error);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      if (complaint.status !== ComplaintStatus.REPLACEMENT_SHIPPED) {
        throw new AppError('Komplen hanya bisa diselesaikan setelah penanganan/pengiriman dilakukan', 400);
      }

      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.COMPLETED,
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
        message: 'Komplen selesai',
        description: `Komplen ${complaint.complaintNumber} sudah selesai diproses`,
        type: 'SUCCESS',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil ditandai selesai', 200);
    } catch (error) {
      return next(error);
    }
  },

};
