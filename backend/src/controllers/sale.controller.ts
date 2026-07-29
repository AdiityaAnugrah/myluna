import { Request, Response, NextFunction } from 'express';
import { Sale, SaleItem, Product, ProductVariant, User, StockMovement, MovementType, ChangeRequest, Settlement, ShippingService, Province, Regency, District, Village } from '../models';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { successResponse } from '../utils/response';
import { AppError } from '../utils/errors';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import { assertUserDateIsToday } from '../utils/dateGuard';
import { formatRegionLabel } from '../utils/regionLabel';

const COMPONENT_SALE_TYPE = 'COMPONENT';
const PRODUCT_SALE_TYPE = 'PRODUCT';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateComponentSaleNumber(saleDate: unknown, transaction?: any) {
  const date = saleDate ? new Date(String(saleDate)) : new Date();
  if (Number.isNaN(date.getTime())) throw new AppError('Tanggal penjualan tidak valid', 400);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `KOMP-${y}${m}${d}`;
  const latest = await Sale.findOne({
    where: { saleNumber: { [Op.like]: `${prefix}-%` } },
    order: [['saleNumber', 'DESC']],
    transaction,
  });
  const lastSequence = Number(String(latest?.saleNumber || '').split('-').pop() || 0);
  return `${prefix}-${String(lastSequence + 1).padStart(3, '0')}`;
}

function cleanAddressSeparators(value: string) {
  return value
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();
}

function sanitizeShippingAddressDetail(input: string, options: {
  postalCode?: string | null;
  regionLabels?: Array<string | null | undefined>;
}) {
  let sanitized = input;

  if (options.postalCode) {
    const postalPattern = new RegExp(`(?:kode\\s*pos\\s*:?\\s*)?\\b${escapeRegExp(options.postalCode)}\\b`, 'gi');
    sanitized = sanitized.replace(postalPattern, '');
  }

  for (const label of options.regionLabels || []) {
    const normalizedLabel = String(label || '').trim();
    if (!normalizedLabel) continue;

    sanitized = sanitized.replace(new RegExp(`\\b${escapeRegExp(normalizedLabel)}\\b`, 'gi'), '');
  }

  return cleanAddressSeparators(sanitized);
}

async function resolveShippingRegion(input: {
  provinceId?: unknown;
  regencyId?: unknown;
  districtId?: unknown;
  villageId?: unknown;
  addressDetail?: unknown;
}) {
  const hasStructuredRegion = [
    input.provinceId,
    input.regencyId,
    input.districtId,
    input.villageId,
  ].some((value) => value !== undefined && value !== null && value !== '');

  if (!hasStructuredRegion) return null;

  const provinceId = Number(input.provinceId);
  const regencyId = Number(input.regencyId);
  const districtId = Number(input.districtId);
  const villageId = Number(input.villageId);

  if (![provinceId, regencyId, districtId, villageId].every((id) => Number.isInteger(id) && id > 0)) {
    throw new AppError('Provinsi, kabupaten/kota, kecamatan, dan kelurahan wajib dipilih', 400);
  }

  const [province, regency, district, village] = await Promise.all([
    Province.findOne({ where: { id: provinceId, isActive: true } }),
    Regency.findOne({ where: { id: regencyId, provinceId, isActive: true } }),
    District.findOne({ where: { id: districtId, provinceId, regencyId, isActive: true } }),
    Village.findOne({ where: { id: villageId, provinceId, regencyId, districtId, isActive: true } }),
  ]);

  if (!province || !regency || !district || !village) {
    throw new AppError('Kombinasi wilayah pengiriman tidak valid', 400);
  }

  const addressDetail = sanitizeShippingAddressDetail(String(input.addressDetail || ''), {
    postalCode: village.postalCode,
    regionLabels: [village.label, district.label, regency.label, province.label],
  });
  if (!addressDetail) {
    throw new AppError('Detail alamat jalan/nomor rumah wajib diisi', 400);
  }

  return {
    shippingAddress: [
      addressDetail,
      formatRegionLabel(village.label),
      formatRegionLabel(district.label),
      formatRegionLabel(regency.label),
      formatRegionLabel(province.label),
      village.postalCode,
    ].filter(Boolean).join(', '),
    shippingAddressDetail: addressDetail,
    shippingProvinceId: provinceId,
    shippingRegencyId: regencyId,
    shippingDistrictId: districtId,
    shippingVillageId: villageId,
    shippingPostalCode: village.postalCode,
  };
}

export const saleController = {
  async getNextComponentInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const saleDate = req.query.saleDate || new Date();
      const saleNumber = await generateComponentSaleNumber(saleDate);
      return successResponse(res, { saleNumber }, 'Nomor invoice komponen berhasil dibuat', 200);
    } catch (error) {
      return next(error);
    }
  },

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 10,
        status = '',
        paymentMethod = '',
        platform = '',
        startDate = '',
        endDate = '',
        search = '',
        responsibleUserId = '',
        settlementStatus = '',
        cancelStatus = '',
        minTotalAmount = '',
        maxTotalAmount = '',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {
        isInitialBalance: false
      };
      const andConditions: any[] = [];

      // Data Isolation: If role is USER, only show their own sales
      if ((req as any).user?.roleName === 'USER') {
        where.createdBy = (req as any).user.id;
      }

      if (status) {
        where.status = status;
      }

      if (paymentMethod) {
        where.paymentMethod = paymentMethod;
      }

      if (platform) {
        where.platform = platform;
      }

      if (responsibleUserId) {
        where.createdBy = responsibleUserId;
      }

      if (startDate && endDate) {
        where.saleDate = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      const minTotal = Number(minTotalAmount);
      const maxTotal = Number(maxTotalAmount);
      if ((minTotalAmount && !Number.isNaN(minTotal)) || (maxTotalAmount && !Number.isNaN(maxTotal))) {
        where.totalAmount = {};
        if (minTotalAmount && !Number.isNaN(minTotal)) {
          where.totalAmount[Op.gte] = minTotal;
        }
        if (maxTotalAmount && !Number.isNaN(maxTotal)) {
          where.totalAmount[Op.lte] = maxTotal;
        }
      }

      if (search) {
        const searchStr = `%${(search as string).toLowerCase()}%`;
        where[Op.or] = [
          { saleNumber: { [Op.like]: searchStr } },
          { customerName: { [Op.like]: searchStr } },
          { customerPhone: { [Op.like]: searchStr } }
        ];
      }

      // Summary cards on the Sales page should explain why "Total Data" can differ
      // from Ringkasan Keuangan. Use the same base filters (date, platform, payment,
      // responsible user, amount, search, and USER data isolation), but split records
      // into sales that count toward finance omset vs cancelled/rejected records.
      const summaryBaseWhere: any = { ...where };
      if (where.saleDate) summaryBaseWhere.saleDate = { ...where.saleDate };
      if (where.totalAmount) summaryBaseWhere.totalAmount = { ...where.totalAmount };

      if (cancelStatus === 'PENDING_CANCEL') {
        andConditions.push(
          sequelize.literal(`EXISTS (
            SELECT 1
            FROM change_requests cr
            WHERE cr.entityType = 'SALE'
              AND cr.entityId = Sale.id
              AND cr.status = 'PENDING'
              AND cr.requestType = 'DELETE'
          )`)
        );
      } else if (cancelStatus === 'NORMAL') {
        andConditions.push(
          sequelize.literal(`NOT EXISTS (
            SELECT 1
            FROM change_requests cr
            WHERE cr.entityType = 'SALE'
              AND cr.entityId = Sale.id
              AND cr.status = 'PENDING'
              AND cr.requestType = 'DELETE'
          )`)
        );
        andConditions.push({
          status: {
            [Op.notIn]: ['CANCELLED', 'REJECTED']
          }
        });
      } else if (cancelStatus === 'CANCELLED') {
        where.status = 'CANCELLED';
      } else if (cancelStatus === 'REJECTED') {
        where.status = 'REJECTED';
      }

      if (settlementStatus === 'SETTLED') {
        andConditions.push(
          sequelize.literal(`(
            Sale.status = 'SETTLED'
            OR EXISTS (
              SELECT 1
              FROM settlements st
              WHERE st.saleId = Sale.id
            )
          )`)
        );
      } else if (settlementStatus === 'UNSETTLED') {
        andConditions.push(
          sequelize.literal(`(
            Sale.status <> 'SETTLED'
            AND NOT EXISTS (
              SELECT 1
              FROM settlements st
              WHERE st.saleId = Sale.id
            )
          )`)
        );
      }

      if (andConditions.length) {
        where[Op.and] = andConditions;
      }

      const { count, rows } = await Sale.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'unit', 'variants', 'length', 'width', 'height', 'weight'],
              },
            ],
          },
          {
            model: Settlement,
            as: 'settlement',
            attributes: ['id', 'netAmount', 'settlementDate'],
          },
        ],
        distinct: true,
        col: 'id',
        limit: Number(limit),
        offset,
        order: [['saleDate', 'DESC']],
      });

      const [financeCount, cancelledCount, rejectedCount] = await Promise.all([
        Sale.count({
          where: {
            ...summaryBaseWhere,
            status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
          },
        }),
        Sale.count({
          where: {
            ...summaryBaseWhere,
            status: 'CANCELLED',
          },
        }),
        Sale.count({
          where: {
            ...summaryBaseWhere,
            status: 'REJECTED',
          },
        }),
      ]);

      // Fetch pending cancellation requests for these sales
      const saleIds = rows.map(r => r.id);
      const pendingCancels = await ChangeRequest.findAll({
        where: {
          entityType: 'SALE',
          entityId: { [Op.in]: saleIds },
          status: 'PENDING',
          requestType: 'DELETE',
        },
        attributes: ['entityId']
      });
      const pendingCancelSaleIds = new Set(pendingCancels.map(pc => pc.entityId));

      const salesWithCancelFlag = rows.map(sale => {
        const saleJson = sale.toJSON() as any;
        saleJson.isCancelPending = pendingCancelSaleIds.has(sale.id);
        return saleJson;
      });

      successResponse(
        res,
        {
          sales: salesWithCancelFlag,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
          summary: {
            financeCount,
            cancelledCount,
            rejectedCount,
            cancelledOrRejectedCount: cancelledCount + rejectedCount,
          },
        },
        'Sales retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'fullName', 'email'],
          },
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'sku', 'name', 'unit', 'variants'],
              },
            ],
          },
        ],
      });

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      // Check for pending cancellation
      const pendingCancel = await ChangeRequest.findOne({
        where: {
          entityType: 'SALE',
          entityId: sale.id,
          status: 'PENDING',
          requestType: 'DELETE',
        }
      });

      const saleJson = sale.toJSON() as any;
      saleJson.isCancelPending = !!pendingCancel;

      successResponse(res, saleJson, 'Sale retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29); // Include today + 29 previous days = 30 days horizon
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const [statusCounts, todayCount, omsetResult, recentSalesData] = await Promise.all([
        Sale.findAll({
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          where: { isInitialBalance: false },
          group: ['status'],
          raw: true,
        }),
        Sale.count({
          where: {
            saleDate: {
              [Op.gte]: new Date(new Date().setHours(0,0,0,0)), // Start of today
            },
            isInitialBalance: false,
          },
        }),
        // Omset Keseluruhan (All non-cancelled non-rejected non-initial sales)
        Sale.findAll({
          attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'total']],
          where: {
            status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
            isInitialBalance: false,
          },
          raw: true,
        }),
        // Sales for the last 30 days for Revenue Trend
        Sale.findAll({
          attributes: ['saleDate', 'totalAmount'],
          where: {
            status: { [Op.notIn]: ['CANCELLED', 'REJECTED'] },
            isInitialBalance: false,
            saleDate: {
              [Op.gte]: thirtyDaysAgo,
              [Op.lte]: today,
            },
          },
          raw: true,
        }),
      ]);

      // Calculate the sum for omset
      const omsetKeseluruhan = omsetResult.length > 0 && (omsetResult as any)[0].total
        ? parseFloat((omsetResult as any)[0].total)
        : 0;

      const trendMap = new Map<string, number>();
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        trendMap.set(dateStr, 0);
      }

      recentSalesData.forEach((record: any) => {
        const dateObj = new Date(record.saleDate);
        const dateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
        if (trendMap.has(dateStr)) {
          trendMap.set(dateStr, trendMap.get(dateStr)! + parseFloat(record.totalAmount));
        }
      });

      const revenueTrend = Array.from(trendMap.entries()).map(([date, revenue]) => ({
        date,
        revenue,
      }));

      const stats: Record<string, any> = {
        PENDING: 0,
        APPROVED: 0,
        PROCESSED: 0,
        CANCELLED: 0,
        REJECTED: 0,
        SETTLED: 0,
        COMPLETED: 0,
        WAITING_APPROVAL: 0,
        todaySales: todayCount,
        totalSales: 0,
        omsetKeseluruhan,
        revenueTrend,
      };
      statusCounts.forEach((record: any) => {
        if (Object.prototype.hasOwnProperty.call(stats, record.status)) {
           stats[record.status] = parseInt(record.count);
        }
        stats.totalSales += parseInt(record.count);
      });

      successResponse(res, stats, 'Sales stats retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      if (!req.user || !req.user.id) {
        throw new AppError('User not authenticated', 401);
      }

      // Handle JSON parsing if items is a string (multipart/form-data)
      if (typeof req.body.items === 'string') {
        try {
          req.body.items = JSON.parse(req.body.items);
        } catch (e) {
          throw new AppError('Invalid items format', 400);
        }
      }

      const {
        invoiceNumber,
        saleDate,
        customerName,
        customerPhone,
        paymentMethod,
        platform,
        items,
        notes,
        shippingService,
        shippingAddress,
        shippingAddressDetail,
        shippingProvinceId,
        shippingRegencyId,
        shippingDistrictId,
        shippingVillageId,
        saleType = PRODUCT_SALE_TYPE,
      } = req.body;

      assertUserDateIsToday(req.user.roleName, saleDate, 'Tanggal penjualan');

      const normalizedSaleType = String(saleType || PRODUCT_SALE_TYPE).toUpperCase() === COMPONENT_SALE_TYPE
        ? COMPONENT_SALE_TYPE
        : PRODUCT_SALE_TYPE;

      if (!Array.isArray(items) || items.length === 0) {
        throw new AppError('Items must be a non-empty array', 400);
      }

      // Check if file is uploaded based on dynamic settings
      let shippingDocument = null;
      let isDocumentRequired = false;

      if (shippingService) {
        const serviceObj = await ShippingService.findOne({ where: { name: shippingService }});
        if (serviceObj && serviceObj.requiresDocument) {
          isDocumentRequired = true;
        }
      }

      if (isDocumentRequired) {
         if (req.file) {
            shippingDocument = req.file.filename;
         } else {
            throw new AppError(`Dokumen PDF wajib diunggah untuk ${shippingService}`, 400);
         }
      }

      const structuredShippingRegion = await resolveShippingRegion({
        provinceId: shippingProvinceId,
        regencyId: shippingRegencyId,
        districtId: shippingDistrictId,
        villageId: shippingVillageId,
        addressDetail: shippingAddressDetail,
      });

      // Validate/generate invoice number
      if (normalizedSaleType !== COMPONENT_SALE_TYPE && (!invoiceNumber || invoiceNumber.trim() === '')) {
        throw new AppError('Nomor Invoice wajib diisi', 400);
      }
      const saleNumber = normalizedSaleType === COMPONENT_SALE_TYPE && (!invoiceNumber || !invoiceNumber.trim())
        ? await generateComponentSaleNumber(saleDate, transaction)
        : invoiceNumber.trim();

      // Check if sale number already exists
      const existingSale = await Sale.findOne({ where: { saleNumber }, transaction });
      if (existingSale) {
        if (['CANCELLED', 'REJECTED'].includes(existingSale.status as string)) {
          // If the existing sale is cancelled or rejected, rename it to free up the original number
          const suffix = existingSale.status === 'CANCELLED' ? 'CANCELLED' : 'REJECTED';
          await existingSale.update(
            { saleNumber: `${saleNumber}-${suffix}-${Date.now()}` },
            { transaction }
          );
        } else {
          throw new AppError('Nomor Invoice sudah digunakan, gunakan nomor yang lain', 400);
        }
      }

      // Aggregate required stock per (productId, variantName) to handle duplicates correctly.
      // Component sales are manual/non-stock transactions, so they skip product stock checks.
      const stockRequired = new Map<string, number>();
      for (const item of items) {
        const itemType = String(item.itemType || normalizedSaleType || PRODUCT_SALE_TYPE).toUpperCase();
        if (itemType === COMPONENT_SALE_TYPE) continue;
        const key = `${item.productId}|${item.variantName || ''}`;
        stockRequired.set(key, (stockRequired.get(key) || 0) + Number(item.quantity));
      }

      // Validate all products, check aggregated stock, and calculate total
      let totalAmount = 0;
      const productCache = new Map<string, any>();

      for (const item of items) {
        const itemType = String(item.itemType || normalizedSaleType || PRODUCT_SALE_TYPE).toUpperCase();
        if (itemType === COMPONENT_SALE_TYPE) {
          const componentName = String(item.componentName || item.name || '').trim();
          if (!componentName) throw new AppError('Nama komponen wajib diisi', 400);
          if (Number(item.quantity) <= 0) throw new AppError(`Jumlah komponen ${componentName} harus lebih dari 0`, 400);
          if (Number(item.price) < 0) throw new AppError(`Harga komponen ${componentName} tidak valid`, 400);
          const discount = Number(item.discount) || 0;
          totalAmount += (Number(item.quantity) * Number(item.price)) - discount;
          continue;
        }
        let product = productCache.get(item.productId);
        if (!product) {
          product = await Product.findByPk(item.productId, { transaction });
          if (!product) throw new AppError(`Product with ID ${item.productId} not found`, 404);
          productCache.set(item.productId, product);
        }
        const discount = Number(item.discount) || 0;
        totalAmount += (Number(item.quantity) * Number(item.price)) - discount;
      }

      // Check aggregated stock per product/variant (prevents overselling same product twice)
      for (const [key, totalQty] of stockRequired) {
        const [productId, variantName] = key.split('|');
        const product = productCache.get(productId);
        if (variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId, value: variantName },
            transaction,
          });
          if (variant && variant.stock < totalQty) {
            throw new AppError(
              `Stok tidak cukup untuk produk ${product.name} varian ${variantName}. Tersedia: ${variant.stock}, Diminta: ${totalQty}`,
              400
            );
          }
        } else {
          if (product.stock < totalQty) {
            throw new AppError(
              `Stok tidak cukup untuk produk ${product.name}. Tersedia: ${product.stock}, Diminta: ${totalQty}`,
              400
            );
          }
        }
      }

      // Create sale
      const sale = await Sale.create(
        {
          saleNumber,
          saleDate,
          customerName,
          customerPhone,
          totalAmount,
          paymentMethod,
          platform: platform || 'OFFLINE_STORE',
          saleType: normalizedSaleType as any,
          status: 'WAITING_APPROVAL' as any, // Default status
          notes: isDocumentRequired ? null : notes,
          shippingService,
          shippingAddress: structuredShippingRegion?.shippingAddress || shippingAddress,
          shippingAddressDetail: structuredShippingRegion?.shippingAddressDetail || null,
          shippingProvinceId: structuredShippingRegion?.shippingProvinceId || null,
          shippingRegencyId: structuredShippingRegion?.shippingRegencyId || null,
          shippingDistrictId: structuredShippingRegion?.shippingDistrictId || null,
          shippingVillageId: structuredShippingRegion?.shippingVillageId || null,
          shippingPostalCode: structuredShippingRegion?.shippingPostalCode || null,
          shippingDocument,
          createdBy: req.user.id,
        },
        { transaction }
      );

      // Create sale items and update product stock
      for (const item of items) {
        const discount = item.discount || 0;
        const subtotal = (item.quantity * item.price) - discount;
        const itemType = String(item.itemType || normalizedSaleType || PRODUCT_SALE_TYPE).toUpperCase();

        await SaleItem.create(
          {
            saleId: sale.id,
            itemType: itemType === COMPONENT_SALE_TYPE ? COMPONENT_SALE_TYPE : PRODUCT_SALE_TYPE,
            productId: itemType === COMPONENT_SALE_TYPE ? null : item.productId,
            componentName: itemType === COMPONENT_SALE_TYPE ? String(item.componentName || item.name || '').trim() : null,
            componentNotes: itemType === COMPONENT_SALE_TYPE ? (item.componentNotes || item.notes || null) : null,
            variantName: itemType === COMPONENT_SALE_TYPE ? null : item.variantName,
            quantity: item.quantity,
            price: item.price,
            discount,
            subtotal,
          },
          { transaction }
        );

        if (itemType === COMPONENT_SALE_TYPE) continue;

        // Update stock: main product stock - quantity
        const product = await Product.findByPk(item.productId, { transaction });
        const stockBeforeSale = product!.stock;
        await product!.update(
          { stock: product!.stock - item.quantity },
          { transaction }
        );

        // If item has a variant, also deduct from that variant's stock
        if (item.variantName) {
          const variant = await ProductVariant.findOne({
            where: { productId: item.productId, value: item.variantName },
            transaction,
          });
          if (variant) {
            await variant.update({ stock: variant.stock - item.quantity }, { transaction });
          }
        }

        // Record Stock Movement (OUT)
        await StockMovement.create({
            productId: item.productId,
            type: MovementType.OUT,
            quantity: item.quantity,
            stockBefore: stockBeforeSale,
            stockAfter: stockBeforeSale - item.quantity,
            reference: `SALE:${sale.saleNumber}`,
            notes: `Sale created${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
            createdBy: req.user!.id
        }, { transaction });
      }

      // Log activity
      const formDuration = req.body.duration ? Number(req.body.duration) : null;
      await auditService.log(
        {
          userId: req.user.id,
          action: 'CREATE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: null,
          after: { ...sale.toJSON(), items },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
          duration: formDuration,
          metadata: { itemCount: items.length, totalAmount, platform: platform || 'OFFLINE_STORE', saleType: normalizedSaleType },
        },
        transaction
      );

      await transaction.commit();

      // Fetch complete sale with relations
      const completeSale = await Sale.findByPk(sale.id, {
        include: [
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
              },
            ],
          },
        ],
      });

      // Send real-time notification to admins
      socketService.emitToAdmins('approval:pending', {
        message: 'Persetujuan penjualan diperlukan',
        saleId: sale.id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        totalAmount: `Rp ${totalAmount.toLocaleString('id-ID')}`,
      });

      socketService.broadcastDataRefresh('sales');
      successResponse(res, completeSale, 'Sale created successfully', 201);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },

  async approve(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const sale = await Sale.findByPk(id, { transaction });

      if (!sale) throw new AppError('Sale not found', 404);
      if (sale.status !== 'WAITING_APPROVAL' as any) throw new AppError('Sale is not waiting for approval', 400);

      await sale.update({ status: 'APPROVED' as any }, { transaction });

      await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any, // Or APPROVE if available
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'WAITING_APPROVAL' },
          after: { status: 'APPROVED' },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
      }, transaction);

      await transaction.commit();
      successResponse(res, sale, 'Sale approved successfully');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const sale = await Sale.findByPk(id, { include: [{ model: SaleItem, as: 'items' }], transaction });

      if (!sale) throw new AppError('Sale not found', 404);
      if (sale.status !== 'WAITING_APPROVAL' as any) throw new AppError('Sale is not waiting for approval', 400);

      // Restore stock
      if (sale.items) {
          for (const item of sale.items) {
              if ((item as any).itemType === COMPONENT_SALE_TYPE || !item.productId) continue;
              const product = await Product.findByPk(item.productId, { transaction });
              if (product) {
                  const stockBeforeReject = product.stock;
                  await product.update({ stock: product.stock + item.quantity }, { transaction });

                  // Also restore variant stock if applicable
                  if (item.variantName) {
                      const variant = await ProductVariant.findOne({
                          where: { productId: item.productId, value: item.variantName },
                          transaction,
                      });
                      if (variant) {
                          await variant.update({ stock: variant.stock + item.quantity }, { transaction });
                      }
                  }

                  // Record Stock Movement (IN) - Return stock
                  await StockMovement.create({
                      productId: item.productId,
                      type: MovementType.IN,
                      quantity: item.quantity,
                      stockBefore: stockBeforeReject,
                      stockAfter: stockBeforeReject + item.quantity,
                      reference: `SALE_REJECT:${sale.saleNumber}`,
                      notes: `Sale rejected${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
                      createdBy: req.user!.id
                  }, { transaction });
              }
          }
      }

      await sale.update({ status: 'REJECTED' as any }, { transaction });

      await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any, // Or REJECT
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'WAITING_APPROVAL' },
          after: { status: 'REJECTED' },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
      }, transaction);

      await transaction.commit();
      successResponse(res, sale, 'Sale rejected successfully');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
  },

  async process(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const sale = await Sale.findByPk(id, { transaction });

      if (!sale) throw new AppError('Sale not found', 404);
      
      // Allow processing from both WAITING_APPROVAL (auto-approve for TCP) and APPROVED status
      if (!['WAITING_APPROVAL', 'APPROVED'].includes(sale.status as string)) {
        throw new AppError(
          `Sale cannot be processed. Current status: ${sale.status}. Sale must be WAITING_APPROVAL or APPROVED.`, 
          400
        );
      }
      
      // Auto-approve if still waiting (for TCP role workflow)
      if (sale.status === 'WAITING_APPROVAL' as any) {
        await sale.update({ status: 'APPROVED' as any }, { transaction });
        
        // Log the auto-approval
        await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'WAITING_APPROVAL' },
          after: { status: 'APPROVED' },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
        }, transaction);
      }

      // Mark as processed with timestamp
      await sale.update({ 
        status: 'PROCESSED' as any,
        processedAt: new Date()
      }, { transaction });

      await auditService.log({
          userId: req.user!.id,
          action: 'UPDATE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: { status: 'APPROVED' },
          after: { status: 'PROCESSED', processedAt: sale.processedAt },
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || ''
      }, transaction);

      await transaction.commit();
      
      // Send real-time notification to TCP team  
      socketService.emitToTCP('shipping:ready', {
        message: 'Pesanan siap untuk dikirim',
        saleId: sale.id,
        customerName: sale.customerName || 'N/A',
        totalAmount: sale.totalAmount || 0,
        processedBy: (req.user as any)?.fullName || req.user?.username,
      });
      
      successResponse(res, sale, 'Sale processed successfully');
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const sale = await Sale.findByPk(id);
      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      const previousData = sale.toJSON();

      await sale.update({
        status: status || sale.status,
        notes: notes !== undefined ? notes : sale.notes,
      });

      // Log activity
      await auditService.log({
        userId: req.user!.id,
        action: 'UPDATE' as any,
        entity: 'Sale',
        entityId: sale.id,
        before: previousData,
        after: sale.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      successResponse(res, sale, 'Sale updated successfully', 200);
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const sale = await Sale.findByPk(id, {
        include: [
          {
            model: SaleItem,
            as: 'items',
          },
        ],
        transaction,
      });

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      // Only restore stock if the sale was in an active state (stock was deducted).
      // REJECTED and CANCELLED sales already had stock restored at the time of rejection/cancellation.
      const stockWasDeducted = !['REJECTED', 'CANCELLED'].includes(sale.status as string);

      if (stockWasDeducted) {
        for (const item of sale.items!) {
          if ((item as any).itemType === COMPONENT_SALE_TYPE || !item.productId) continue;
          const product = await Product.findByPk(item.productId, { transaction });
          const stockBeforeDelete = product!.stock;
          await product!.update(
            { stock: product!.stock + item.quantity },
            { transaction }
          );

          // Also restore variant stock if applicable
          if (item.variantName) {
            const variant = await ProductVariant.findOne({
              where: { productId: item.productId, value: item.variantName },
              transaction,
            });
            if (variant) {
              await variant.update({ stock: variant.stock + item.quantity }, { transaction });
            }
          }

          // Record Stock Movement (IN) - Return stock
          await StockMovement.create({
              productId: item.productId,
              type: MovementType.IN,
              quantity: item.quantity,
              stockBefore: stockBeforeDelete,
              stockAfter: stockBeforeDelete + item.quantity,
              reference: `SALE_DELETE:${sale.saleNumber || id}`,
              notes: `Sale deleted${item.variantName ? ` (Varian: ${item.variantName})` : ''}`,
              createdBy: req.user!.id
          }, { transaction });
        }
      }

      // Log activity before deletion (since we have the data)
      await auditService.log(
        {
          userId: req.user!.id,
          action: 'DELETE' as any,
          entity: 'Sale',
          entityId: sale.id,
          before: sale.toJSON(),
          after: null,
          ip: req.ip || '',
          userAgent: req.get('User-Agent') || '',
        },
        transaction
      );

      // Delete sale (cascade will delete items)
      await sale.destroy({ transaction });

      await transaction.commit();

      successResponse(res, null, 'Sale deleted successfully', 200);
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  },
  async requestCancellation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        throw new AppError('Alasan pembatalan harus diisi', 400);
      }

      const sale = await Sale.findByPk(id);

      if (!sale) {
        throw new AppError('Sale not found', 404);
      }

      const existingSettlement = await Settlement.findOne({
        where: { saleId: id },
      });

      if (existingSettlement) {
        throw new AppError('Penjualan ini sudah memiliki pelunasan. Batalkan pelunasannya terlebih dahulu', 400);
      }

      if (['CANCELLED', 'REJECTED', 'COMPLETED', 'SETTLED'].includes(sale.status as string)) {
        throw new AppError('Penjualan ini sudah selesai dan tidak dapat dibatalkan', 400);
      }

      // Check if there's already a pending cancellation request
      const existingRequest = await ChangeRequest.findOne({
        where: {
          entityType: 'SALE',
          entityId: id,
          status: 'PENDING',
        },
      });

      if (existingRequest) {
        throw new AppError('Sudah ada pengajuan pembatalan yang sedang menunggu persetujuan', 400);
      }

      const changeRequest = await ChangeRequest.create({
        entityType: 'SALE',
        entityId: id,
        requestType: 'DELETE', // Using DELETE as identifying action for "Cancel"
        status: 'PENDING',
        payload: {
          saleId: id,
          saleNumber: sale.saleNumber,
          customerName: sale.customerName,
          totalAmount: sale.totalAmount,
          reason: reason.trim(),
        },
        requestedBy: req.user!.id,
      });

      await auditService.log({
        userId: req.user!.id,
        action: 'CREATE' as any,
        entity: 'ChangeRequest',
        entityId: changeRequest.id,
        before: null,
        after: changeRequest.toJSON(),
        ip: req.ip || '',
        userAgent: req.get('User-Agent') || '',
      });

      // Notify admins
      const { socketService } = require('../services/socket.service');
      socketService.emitToAdmins('notification:new', {
        message: 'Pengajuan Pembatalan Penjualan',
        description: `${(req.user as any)?.fullName || 'User'} mengajukan pembatalan penjualan #${sale.saleNumber}. Alasan: ${reason.trim()}`,
        type: 'WARNING',
      });

      successResponse(res, changeRequest, 'Pengajuan pembatalan penjualan berhasil dikirim', 201);
    } catch (error) {
      next(error);
    }
  },
};
