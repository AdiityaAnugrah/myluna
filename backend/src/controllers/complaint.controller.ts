import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import path from 'path';
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

const complaintPhotoDir = path.join(process.cwd(), 'uploads/complaints/photos');

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
          [Op.in]: [SaleStatus.SETTLED, SaleStatus.COMPLETED],
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

      if (!req.file) {
        throw new AppError('Foto komplen wajib diunggah', 400);
      }

      const { saleId, reason } = req.body;
      let { complaintDate } = req.body;

      if (!saleId || !reason || String(reason).trim().length < 5) {
        throw new AppError('Pesanan dan alasan komplen wajib diisi', 400);
      }

      const sale = await Sale.findByPk(saleId);
      if (!sale) {
        throw new AppError('Pesanan tidak ditemukan', 404);
      }

      if (![SaleStatus.SETTLED, SaleStatus.COMPLETED].includes(sale.status as SaleStatus)) {
        throw new AppError('Komplen hanya bisa dibuat untuk pesanan yang sudah selesai', 400);
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

      const photoFilename = `complaint-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
      const photoPath = path.join(complaintPhotoDir, photoFilename);

      await sharp(req.file.buffer)
        .rotate()
        .resize(1280, 1280, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 70 })
        .toFile(photoPath);

      const complaint = await Complaint.create({
        complaintNumber: generateComplaintNumber(),
        saleId,
        saleNumberSnapshot: sale.saleNumber,
        customerNameSnapshot: sale.customerName || null,
        reason: String(reason).trim(),
        complaintDate: new Date(complaintDate),
        complaintPhoto: `/uploads/complaints/photos/${photoFilename}`,
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
        message: 'Komplen baru menunggu review',
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

  async review(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const { decision, rejectionReason } = req.body;

      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      if (complaint.status !== ComplaintStatus.PENDING_TCP_REVIEW) {
        throw new AppError('Komplen ini sudah diproses', 400);
      }

      if (!['ACCEPT', 'REJECT'].includes(String(decision))) {
        throw new AppError('Keputusan review tidak valid', 400);
      }

      const before = complaint.toJSON();

      const isAccepted = decision === 'ACCEPT';

      if (isAccepted) {
        await complaint.update({
          status: ComplaintStatus.ACCEPTED_BY_TCP,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          rejectionReason: null,
        });
      } else {
        if (!rejectionReason || String(rejectionReason).trim().length < 5) {
          throw new AppError('Alasan penolakan minimal 5 karakter', 400);
        }
        await complaint.update({
          status: ComplaintStatus.REJECTED_BY_TCP,
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          rejectionReason: String(rejectionReason).trim(),
        });
      }

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
        description:
          isAccepted
            ? `Komplen ${complaint.complaintNumber} diterima TCP`
            : `Komplen ${complaint.complaintNumber} ditolak TCP`,
        type: isAccepted ? 'SUCCESS' : 'ERROR',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Review komplen berhasil disimpan', 200);
    } catch (error) {
      return next(error);
    }
  },

  async shipReplacement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!req.file) {
        throw new AppError('PDF resi pengganti wajib diunggah', 400);
      }

      const { id } = req.params;
      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      if (complaint.status !== ComplaintStatus.ACCEPTED_BY_TCP) {
        throw new AppError('Komplen belum dalam status siap kirim pengganti', 400);
      }

      const before = complaint.toJSON();
      const proofPath = `/uploads/complaints/replacements/${req.file.filename}`;

      await complaint.update({
        status: ComplaintStatus.REPLACEMENT_SHIPPED,
        replacementProofDocument: proofPath,
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
        message: 'Pesanan komplen sedang dikirim',
        description: `Resi pengganti untuk komplen ${complaint.complaintNumber} sudah diunggah`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Resi pengganti berhasil diunggah', 200);
    } catch (error) {
      return next(error);
    }
  },
};
