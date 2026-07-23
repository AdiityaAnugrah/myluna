import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import {
  Complaint,
  ComplaintComponentShipment,
  ComplaintResolutionStatus,
  ComplaintResolutionType,
  ComplaintStatus,
  ComplaintType,
  Expense,
  MovementType,
  Product,
  ProductVariant,
  ReturnSourceType,
  Sale,
  SaleItem,
  SaleStatus,
  SaleReturn,
  SaleReturnItem,
  SaleReturnStatus,
  Settlement,
  StockMovement,
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
  ComplaintStatus.WAITING_USER_CONFIRMATION,
  ComplaintStatus.WAITING_USER_DELIVERY_CONFIRMATION,
  ComplaintStatus.MONITORING_CUSTOMER_CONFIRMATION,
  ComplaintStatus.FOLLOW_UP_REQUIRED,
];

function addCalendarDays(start: Date, days: number) {
  const result = new Date(start);
  result.setDate(result.getDate() + days);
  return result;
}

function addBusinessDays(start: Date, businessDays: number) {
  const result = new Date(start);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

function getComplaintTcpSlaBusinessDays(type: ComplaintType) {
  return type === ComplaintType.HARDWARE ? 14 : 7;
}

function generateReturnNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RTR-${y}${m}${d}-${random}`;
}

function parseComplaintItems(rawItems: unknown) {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new AppError('Format item tidak valid', 400);
    }
  }
  return [];
}

function requireDecisionAllowed(status: ComplaintStatus) {
  return [
    ComplaintStatus.PENDING_TCP_REVIEW,
    ComplaintStatus.ACCEPTED_BY_TCP,
    ComplaintStatus.FOLLOW_UP_REQUIRED,
  ].includes(status);
}

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
      const waitingUserConfirmationCount = await Complaint.count({
        where: {
          ...where,
          status: ComplaintStatus.WAITING_USER_CONFIRMATION,
        },
      });
      const waitingDeliveryConfirmationCount = await Complaint.count({
        where: {
          ...where,
          status: ComplaintStatus.WAITING_USER_DELIVERY_CONFIRMATION,
        },
      });
      const monitoringCustomerConfirmationCount = await Complaint.count({
        where: {
          ...where,
          status: ComplaintStatus.MONITORING_CUSTOMER_CONFIRMATION,
        },
      });
      const followUpRequiredCount = await Complaint.count({
        where: {
          ...where,
          status: ComplaintStatus.FOLLOW_UP_REQUIRED,
        },
      });

      return successResponse(
        res,
        {
          activeCount,
          pendingReviewCount,
          waitingUserConfirmationCount,
          waitingDeliveryConfirmationCount,
          monitoringCustomerConfirmationCount,
          followUpRequiredCount,
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
      const complaintType = String(req.body.complaintType || '').toUpperCase() as ComplaintType;

      if (!saleId || !reason || String(reason).trim().length < 5) {
        throw new AppError('Pesanan dan alasan komplen wajib diisi', 400);
      }
      if (!Object.values(ComplaintType).includes(complaintType)) {
        throw new AppError('Jenis komplen wajib dipilih', 400);
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
        complaintType,
        tcpDeadlineAt: addBusinessDays(new Date(complaintDate), getComplaintTcpSlaBusinessDays(complaintType)),
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

      const { page = 1, limit = 10, status = '', search = '', scope = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where: any = {};

      if (status) {
        where.status = status;
      } else if (scope === 'active') {
        where.status = { [Op.in]: complaintActiveStatuses };
      } else if (scope === 'history') {
        where.status = {
          [Op.in]: [
            ComplaintStatus.COMPLETED,
            ComplaintStatus.REJECTED_BY_TCP,
            ComplaintStatus.CONVERTED_TO_RETURN,
          ],
        };
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
        'Daftar komplen berhasil diambil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },


  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const complaint = await Complaint.findByPk(req.params.id, {
        include: [
          {
            model: Sale,
            as: 'sale',
            include: [{ model: SaleItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
          },
          { model: ComplaintComponentShipment, as: 'componentShipments', include: [{ model: Product, as: 'product' }] },
          { model: Settlement, as: 'complaintSettlement' },
        ],
      });
      if (!complaint) throw new AppError('Komplen tidak ditemukan', 404);
      if (req.user.roleName === 'USER' && complaint.createdBy !== req.user.id) {
        throw new AppError('Anda tidak berwenang melihat komplen ini', 403);
      }
      return successResponse(res, complaint, 'Detail komplen berhasil diambil', 200);
    } catch (error) { return next(error); }
  },

  async setDecision(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const decision = String(req.body.resolutionType || '').toUpperCase() as ComplaintResolutionType;
      if (!Object.values(ComplaintResolutionType).includes(decision)) throw new AppError('Keputusan komplen tidak valid', 400);

      const complaint = await Complaint.findByPk(req.params.id);
      if (!complaint) throw new AppError('Komplen tidak ditemukan', 404);
      if (!requireDecisionAllowed(complaint.status)) throw new AppError('Komplen ini tidak bisa dipilih keputusannya', 400);

      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.ACCEPTED_BY_TCP,
        reviewedBy: complaint.reviewedBy || req.user.id,
        reviewedAt: complaint.reviewedAt || new Date(),
        resolutionType: decision,
        resolutionStatus: decision === ComplaintResolutionType.NO_ACTION ? ComplaintResolutionStatus.COMPLETED : ComplaintResolutionStatus.IN_PROGRESS,
        resolutionNotes: String(req.body.resolutionNotes || '').trim() || complaint.resolutionNotes,
        resolvedBy: decision === ComplaintResolutionType.NO_ACTION ? req.user.id : complaint.resolvedBy,
        resolvedAt: decision === ComplaintResolutionType.NO_ACTION ? new Date() : complaint.resolvedAt,
        completedBy: decision === ComplaintResolutionType.NO_ACTION ? req.user.id : complaint.completedBy,
        completedAt: decision === ComplaintResolutionType.NO_ACTION ? new Date() : complaint.completedAt,
        ...(decision === ComplaintResolutionType.NO_ACTION ? { status: ComplaintStatus.COMPLETED } : {}),
      });

      await auditService.log({ userId: req.user.id, action: AuditAction.UPDATE, entity: 'ComplaintDecision', entityId: complaint.id, before, after: complaint.toJSON(), ip: req.ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'] || '' });
      socketService.broadcastDataRefresh('complaints');
      return successResponse(res, complaint, 'Keputusan komplen berhasil disimpan', 200);
    } catch (error) { return next(error); }
  },

  async recordSettlementDeduction(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const complaint = await Complaint.findByPk(req.params.id, { transaction });
      if (!complaint) throw new AppError('Komplen tidak ditemukan', 404);
      const deductionAmount = Number(req.body.deductionAmount || 0);
      const netReceivedAmount = Number(req.body.netReceivedAmount || 0);
      const deductionReason = String(req.body.deductionReason || '').trim();
      if (deductionAmount <= 0) throw new AppError('Nominal potongan wajib lebih dari 0', 400);
      if (netReceivedAmount < 0) throw new AppError('Nominal bersih tidak valid', 400);
      if (deductionReason.length < 5) throw new AppError('Alasan potongan wajib diisi minimal 5 karakter', 400);

      const before = complaint.toJSON();
      const settlementDate = String(req.body.settlementDate || getLocalDateString(new Date()));
      const existingSettlement = await Settlement.findOne({ where: { saleId: complaint.saleId }, transaction });
      let settlement = existingSettlement;
      if (settlement) {
        await settlement.update({ netAmount: netReceivedAmount.toFixed(2), complaintId: complaint.id, deductionAmount: deductionAmount.toFixed(2), deductionReason, deductionType: 'COMPLAINT', notes: String(req.body.notes || settlement.notes || '').trim() || settlement.notes }, { transaction });
      } else {
        settlement = await Settlement.create({ saleId: complaint.saleId, invoiceNumber: null, netAmount: netReceivedAmount.toFixed(2), settlementDate: new Date(settlementDate), proofDocument: null, notes: String(req.body.notes || '').trim() || null, complaintId: complaint.id, deductionAmount: deductionAmount.toFixed(2), deductionReason, grossAmount: null, deductionType: 'COMPLAINT', createdBy: req.user.id }, { transaction });
      }

      await complaint.update({ status: ComplaintStatus.COMPLETED, resolutionType: ComplaintResolutionType.SETTLEMENT_DEDUCTION, resolutionStatus: ComplaintResolutionStatus.COMPLETED, settlementId: settlement.id, deductionAmount: deductionAmount.toFixed(2), netReceivedAmount: netReceivedAmount.toFixed(2), deductionReason, resolutionNotes: String(req.body.notes || '').trim() || complaint.resolutionNotes, resolvedBy: req.user.id, resolvedAt: new Date(), completedBy: req.user.id, completedAt: new Date() }, { transaction });
      await auditService.log({ userId: req.user.id, action: AuditAction.UPDATE, entity: 'ComplaintSettlementDeduction', entityId: complaint.id, before, after: complaint.toJSON(), ip: req.ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'] || '' }, transaction);
      await transaction.commit();
      socketService.broadcastDataRefresh('complaints');
      socketService.broadcastDataRefresh('settlements');
      socketService.broadcastDataRefresh('finance');
      return successResponse(res, complaint, 'Potongan marketplace komplen berhasil dicatat', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async processComponentShipment(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const complaint = await Complaint.findByPk(req.params.id, { transaction });
      if (!complaint) throw new AppError('Komplen tidak ditemukan', 404);
      const items = parseComplaintItems(req.body.items);
      if (!items.length) throw new AppError('Minimal 1 komponen/produk wajib dipilih', 400);
      const shippingService = String(req.body.shippingService || '').trim();
      const shippingCost = Number(req.body.shippingCost || 0);
      if (shippingCost < 0) throw new AppError('Ongkir tidak valid', 400);

      const before = complaint.toJSON();
      for (const item of items) {
        const productId = String(item.productId || '');
        const qty = Number(item.quantity || 0);
        const variantName = String(item.variantName || '').trim() || null;
        if (!productId || !Number.isInteger(qty) || qty <= 0) throw new AppError('Item komponen tidak valid', 400);
        const product = await Product.findByPk(productId, { transaction });
        if (!product) throw new AppError('Produk/komponen tidak ditemukan', 404);
        if (product.stock < qty) throw new AppError(`Stok ${product.name} tidak mencukupi`, 400);
        let variant = null;
        if (variantName) {
          variant = await ProductVariant.findOne({ where: { productId, value: variantName }, transaction });
          if (!variant) throw new AppError(`Varian ${variantName} tidak ditemukan`, 404);
          if (variant.stock < qty) throw new AppError(`Stok varian ${variantName} tidak mencukupi`, 400);
        }
        const stockBefore = product.stock;
        await product.update({ stock: product.stock - qty }, { transaction });
        if (variant) await variant.update({ stock: variant.stock - qty }, { transaction });
        const movement = await StockMovement.create({ productId, type: MovementType.OUT, quantity: qty, stockBefore, stockAfter: stockBefore - qty, reference: `COMPLAINT_COMPONENT:${complaint.complaintNumber}`, notes: `Kirim komponen komplen${variantName ? ` (Varian: ${variantName})` : ''}`, createdBy: req.user.id }, { transaction });
        await ComplaintComponentShipment.create({ complaintId: complaint.id, productId, variantName, quantity: qty, stockMovementId: movement.id, notes: String(item.notes || '').trim() || null, createdBy: req.user.id }, { transaction });
      }
      if (shippingCost > 0) {
        await Expense.create({ category: 'SHIPPING', description: `Ongkir kirim komponen komplen ${complaint.complaintNumber}`, amount: shippingCost.toFixed(2), expenseDate: new Date(), notes: shippingService ? `Jasa kirim: ${shippingService}` : null, receiptDocument: null, createdBy: req.user.id }, { transaction });
      }
      const shippedAt = new Date();
      await complaint.update({ status: ComplaintStatus.WAITING_USER_DELIVERY_CONFIRMATION, resolutionType: ComplaintResolutionType.SEND_COMPONENT, resolutionStatus: ComplaintResolutionStatus.WAITING_USER_CONFIRMATION, componentShipmentStatus: 'SHIPPED', componentShippingService: shippingService || null, componentShippingCost: shippingCost.toFixed(2), replacementProofDocument: complaint.complaintReceiptPdf, shippedBy: req.user.id, shippedAt, deliveryConfirmDeadlineAt: addCalendarDays(shippedAt, 7), resolutionNotes: String(req.body.notes || '').trim() || complaint.resolutionNotes }, { transaction });
      await auditService.log({ userId: req.user.id, action: AuditAction.UPDATE, entity: 'ComplaintComponentShipment', entityId: complaint.id, before, after: complaint.toJSON(), ip: req.ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'] || '' }, transaction);
      await transaction.commit();
      socketService.broadcastDataRefresh('complaints');
      socketService.broadcastDataRefresh('stock');
      socketService.broadcastDataRefresh('expense');
      return successResponse(res, complaint, 'Komponen/pengganti komplen berhasil dikirim', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
  },

  async convertToReturn(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const complaint = await Complaint.findByPk(req.params.id, { include: [{ model: Sale, as: 'sale', include: [{ model: SaleItem, as: 'items' }] }], transaction });
      if (!complaint) throw new AppError('Komplen tidak ditemukan', 404);
      if (complaint.linkedReturnId) throw new AppError('Komplen ini sudah pernah dijadikan retur', 400);
      const sale = (complaint as any).sale as Sale | undefined;
      if (!sale) throw new AppError('Data penjualan tidak ditemukan', 404);
      const items = parseComplaintItems(req.body.items);
      if (!items.length) throw new AppError('Pilih minimal 1 item untuk retur', 400);
      const saleItemsById = new Map<string, SaleItem>(((sale as any).items || []).map((item: SaleItem) => [item.id, item]));
      const returnRecord = await SaleReturn.create({ returnNumber: generateReturnNumber(), saleId: complaint.saleId, requestedBy: complaint.createdBy, sourceType: ReturnSourceType.COMPLAINT, sourceComplaintId: complaint.id, status: SaleReturnStatus.PENDING_REVIEW, reason: String(req.body.reason || complaint.reason).trim(), requestDate: new Date(getLocalDateString(new Date())), evidencePhotos: complaint.complaintPhotos || [complaint.complaintPhoto] }, { transaction });
      for (const item of items) {
        const saleItem = saleItemsById.get(String(item.saleItemId || ''));
        const qtyRequested = Number(item.qtyRequested || 0);
        if (!saleItem) throw new AppError('Item penjualan tidak valid', 400);
        if (!Number.isInteger(qtyRequested) || qtyRequested <= 0 || qtyRequested > saleItem.quantity) throw new AppError('Qty retur tidak valid', 400);
        await SaleReturnItem.create({ returnId: returnRecord.id, saleItemId: saleItem.id, productId: saleItem.productId, variantName: saleItem.variantName || null, qtySold: saleItem.quantity, qtyRequested }, { transaction });
      }
      const before = complaint.toJSON();
      await complaint.update({ status: ComplaintStatus.CONVERTED_TO_RETURN, resolutionType: ComplaintResolutionType.CONVERT_TO_RETURN, resolutionStatus: ComplaintResolutionStatus.COMPLETED, linkedReturnId: returnRecord.id, resolutionNotes: String(req.body.notes || '').trim() || complaint.resolutionNotes, resolvedBy: req.user.id, resolvedAt: new Date() }, { transaction });
      await auditService.log({ userId: req.user.id, action: AuditAction.UPDATE, entity: 'ComplaintConvertToReturn', entityId: complaint.id, before, after: complaint.toJSON(), ip: req.ip || req.socket.remoteAddress || '', userAgent: req.headers['user-agent'] || '' }, transaction);
      await transaction.commit();
      socketService.broadcastDataRefresh('complaints');
      socketService.broadcastDataRefresh('returns');
      return successResponse(res, { complaint, return: returnRecord }, 'Komplen berhasil dijadikan retur', 200);
    } catch (error) { await transaction.rollback(); return next(error); }
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

      if (
        complaint.status !== ComplaintStatus.PENDING_TCP_REVIEW &&
        complaint.status !== ComplaintStatus.FOLLOW_UP_REQUIRED
      ) {
        throw new AppError('Komplen ini tidak bisa diterima untuk diproses', 400);
      }

      const before = complaint.toJSON();
      const isFollowUp = complaint.status === ComplaintStatus.FOLLOW_UP_REQUIRED;
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
        description: isFollowUp
          ? `Komplen ${complaint.complaintNumber} sedang ditangani kembali oleh TCP`
          : `Komplen ${complaint.complaintNumber} sudah diterima untuk diproses TCP`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(
        res,
        complaint,
        isFollowUp
          ? 'Komplen berhasil ditangani kembali oleh TCP'
          : 'Komplen berhasil diterima untuk diproses TCP',
        200
      );
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
        throw new AppError('Komplen belum dalam status sedang ditangani TCP', 400);
      }

      if (!complaint.complaintReceiptPdf) {
        throw new AppError('PDF resi komplen tidak ditemukan', 400);
      }

      const before = complaint.toJSON();

      const shippedAt = new Date();
      await complaint.update({
        status: ComplaintStatus.WAITING_USER_DELIVERY_CONFIRMATION,
        replacementProofDocument: complaint.complaintReceiptPdf,
        shippedBy: req.user.id,
        shippedAt,
        deliveryConfirmDeadlineAt: addCalendarDays(shippedAt, 7),
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
        description: `Komplen ${complaint.complaintNumber} menunggu konfirmasi barang sampai dari user`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil ditandai pengganti sudah dikirim dan menunggu konfirmasi barang sampai', 200);
    } catch (error) {
      return next(error);
    }
  },

  async requestFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const reason = String(req.body.reason || '').trim();

      if (reason.length < 5) {
        throw new AppError('Alasan belum selesai wajib diisi minimal 5 karakter', 400);
      }

      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      const isOwner = complaint.createdBy === req.user.id;
      const isAdmin = req.user.roleName === 'ADMIN' || req.user.roleName === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) {
        throw new AppError('Anda tidak berwenang meminta tindak lanjut komplen ini', 403);
      }

      if (
        complaint.status !== ComplaintStatus.WAITING_USER_CONFIRMATION &&
        complaint.status !== ComplaintStatus.REPLACEMENT_SHIPPED &&
        complaint.status !== ComplaintStatus.WAITING_USER_DELIVERY_CONFIRMATION &&
        complaint.status !== ComplaintStatus.MONITORING_CUSTOMER_CONFIRMATION
      ) {
        throw new AppError('Komplen belum menunggu konfirmasi user', 400);
      }

      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.FOLLOW_UP_REQUIRED,
        followUpReason: reason,
        followUpRequestedAt: new Date(),
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

      socketService.emitToTCP('notification:new', {
        message: 'Komplen perlu tindak lanjut',
        description: `Komplen ${complaint.complaintNumber} belum selesai: ${reason}`,
        type: 'WARNING',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil dikembalikan untuk tindak lanjut', 200);
    } catch (error) {
      return next(error);
    }
  },

  async confirmDelivered(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      const isOwner = complaint.createdBy === req.user.id;
      const isAdmin = req.user.roleName === 'ADMIN' || req.user.roleName === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) {
        throw new AppError('Anda tidak berwenang mengonfirmasi barang sampai untuk komplen ini', 403);
      }

      if (complaint.status !== ComplaintStatus.WAITING_USER_DELIVERY_CONFIRMATION) {
        throw new AppError('Komplen belum menunggu konfirmasi barang sampai', 400);
      }

      const confirmedAt = new Date();
      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.MONITORING_CUSTOMER_CONFIRMATION,
        deliveredConfirmedAt: confirmedAt,
        customerCheckDeadlineAt: addCalendarDays(confirmedAt, 3),
      });

      await auditService.log({
        userId: req.user.id,
        action: AuditAction.UPDATE,
        entity: 'ComplaintDeliveryConfirmation',
        entityId: complaint.id,
        before,
        after: complaint.toJSON(),
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.emitToTCP('notification:new', {
        message: 'Barang pengganti sudah sampai',
        description: `Komplen ${complaint.complaintNumber} masuk masa konfirmasi pelanggan`,
        type: 'INFO',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Barang sampai berhasil dikonfirmasi', 200);
    } catch (error) {
      return next(error);
    }
  },

  async closeCase(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const { id } = req.params;
      const complaint = await Complaint.findByPk(id);
      if (!complaint) {
        throw new AppError('Komplen tidak ditemukan', 404);
      }

      const isOwner = complaint.createdBy === req.user.id;
      const isAdmin = req.user.roleName === 'ADMIN' || req.user.roleName === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) {
        throw new AppError('Anda tidak berwenang menutup kasus komplen ini', 403);
      }

      if (complaint.status !== ComplaintStatus.MONITORING_CUSTOMER_CONFIRMATION) {
        throw new AppError('Kasus komplen belum masuk masa konfirmasi pelanggan', 400);
      }

      const closedAt = new Date();
      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.COMPLETED,
        caseClosedByUserAt: closedAt,
        completedBy: req.user.id,
        completedAt: closedAt,
        resolutionStatus: complaint.resolutionStatus || ComplaintResolutionStatus.COMPLETED,
      });

      await auditService.log({
        userId: req.user.id,
        action: AuditAction.UPDATE,
        entity: 'ComplaintCaseClose',
        entityId: complaint.id,
        before,
        after: complaint.toJSON(),
        ip: req.ip || req.socket.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      });

      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Kasus komplen berhasil ditutup', 200);
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

      const isOwner = complaint.createdBy === req.user.id;
      const isAdmin = req.user.roleName === 'ADMIN' || req.user.roleName === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) {
        throw new AppError('Anda tidak berwenang menyelesaikan komplen ini', 403);
      }

      if (
        complaint.status !== ComplaintStatus.WAITING_USER_CONFIRMATION &&
        complaint.status !== ComplaintStatus.REPLACEMENT_SHIPPED
      ) {
        throw new AppError('Komplen hanya bisa diselesaikan saat menunggu konfirmasi user', 400);
      }

      const before = complaint.toJSON();
      await complaint.update({
        status: ComplaintStatus.COMPLETED,
        completedBy: req.user.id,
        completedAt: new Date(),
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
        description: `Komplen ${complaint.complaintNumber} sudah selesai`,
        type: 'SUCCESS',
      });
      socketService.broadcastDataRefresh('complaints');

      return successResponse(res, complaint, 'Komplen berhasil diselesaikan', 200);
    } catch (error) {
      return next(error);
    }
  },

};
