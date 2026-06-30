import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import {
  AuditAction,
  Expense,
  MovementType,
  Product,
  ProductVariant,
  ReturnExecution,
  ReturnExecutionStatus,
  ReturnFinalDecision,
  ReturnTicket,
  ReturnTicketMessage,
  ReturnTicketMessageType,
  ReturnTicketParticipant,
  ReturnTicketStatus,
  Role,
  Sale,
  SaleItem,
  SaleReturn,
  SaleReturnDecision,
  SaleReturnItem,
  SaleReturnStatus,
  StockMovement,
  User,
} from '../models';
import type { AuthUser } from '../types/express';
import { auditService } from '../services/audit.service';
import { socketService } from '../services/socket.service';
import { AppError } from '../utils/errors';
import { successResponse } from '../utils/response';

function buildTicketRoom(ticketId: string) {
  return `return-ticket:${ticketId}`;
}

function generateTicketNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RTK-${y}${m}${d}-${random}`;
}

function getDefaultDeadline(days = 2) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);
  return deadline;
}

function buildExecutionItemPayload(rawItems: unknown) {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new AppError('Format item eksekusi tiket tidak valid', 400);
    }
  }
  return [];
}

async function resolveReplacementStock(options: {
  productId: string;
  variantName?: string | null;
  qty: number;
  transaction: any;
}) {
  const product = await Product.findByPk(options.productId, { transaction: options.transaction });
  if (!product) {
    throw new AppError('Produk eksekusi tidak ditemukan', 404);
  }

  if (product.stock < options.qty) {
    throw new AppError(`Stok produk ${product.name} tidak mencukupi untuk eksekusi`, 400);
  }

  let variant = null;
  if (options.variantName) {
    variant = await ProductVariant.findOne({
      where: { productId: options.productId, value: options.variantName },
      transaction: options.transaction,
    });

    if (!variant) {
      throw new AppError(`Varian ${options.variantName} tidak ditemukan`, 404);
    }

    if (variant.stock < options.qty) {
      throw new AppError(`Stok varian ${options.variantName} tidak mencukupi untuk eksekusi`, 400);
    }
  }

  return { product, variant };
}

async function createExpenseIfNeeded(options: {
  transaction: any;
  createdBy: string;
  category: 'SHIPPING' | 'OTHER';
  amount: number;
  description: string;
  notes?: string | null;
}) {
  if (!Number.isFinite(options.amount) || options.amount <= 0) return null;

  return Expense.create(
    {
      category: options.category,
      description: options.description,
      amount: options.amount.toFixed(2),
      expenseDate: new Date(),
      notes: options.notes || null,
      receiptDocument: null,
      createdBy: options.createdBy,
    },
    { transaction: options.transaction }
  );
}

async function ensureTicketAccess(ticketId: string, user: AuthUser) {
  const ticket = await ReturnTicket.findByPk(ticketId, {
    include: [
      {
        model: ReturnTicketParticipant,
        as: 'participants',
        include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'username'] }],
      },
      {
        model: SaleReturn,
        as: 'returnRecord',
        include: [
          {
            model: Sale,
            as: 'sale',
            attributes: ['id', 'saleNumber', 'saleDate', 'customerName', 'status'],
          },
          {
            model: SaleReturnItem,
            as: 'items',
            include: [
              { model: SaleItem, as: 'saleItem' },
              { model: Product, as: 'product', attributes: ['id', 'sku', 'name', 'unit'] },
              { model: Product, as: 'replacementProduct', attributes: ['id', 'sku', 'name', 'unit'] },
            ],
          },
          { model: User, as: 'requester', attributes: ['id', 'fullName', 'username'] },
        ],
      },
      {
        model: ReturnTicketMessage,
        as: 'messages',
        include: [{ model: User, as: 'sender', attributes: ['id', 'fullName', 'username'] }],
        separate: true,
        order: [['createdAt', 'ASC']],
      },
      {
        model: ReturnExecution,
        as: 'executions',
        include: [{ model: User, as: 'executor', attributes: ['id', 'fullName', 'username'] }],
        separate: true,
        order: [['createdAt', 'ASC']],
      },
      { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
      { model: User, as: 'finalizer', attributes: ['id', 'fullName', 'username'] },
      { model: User, as: 'tcpExecutor', attributes: ['id', 'fullName', 'username'] },
    ],
  });

  if (!ticket) {
    throw new AppError('Tiket retur tidak ditemukan', 404);
  }

  if (user.roleName === 'SUPER_ADMIN' || user.roleName === 'ADMIN') {
    return ticket;
  }

  if (user.roleName === 'TCP') {
    return ticket;
  }

  const isParticipant = (ticket.participants || []).some((participant) => participant.userId === user.id);
  if (!isParticipant) {
    throw new AppError('Anda tidak memiliki akses ke tiket ini', 403);
  }

  return ticket;
}

async function emitMessageNotification(ticket: any, senderId: string, message: string) {
  const participants = ticket.participants || [];
  const recipients = participants
    .map((participant: any) => participant.userId)
    .filter((userId: string) => userId !== senderId);

  const uniqueRecipients = [...new Set(recipients)] as string[];
  for (const userId of uniqueRecipients) {
    socketService.emitToUser(userId, 'notification:new', {
      message: 'Ada balasan baru di tiket retur',
      description: `Tiket ${ticket.ticketNumber}: ${message.substring(0, 80)}`,
      type: 'INFO',
    });
  }

  socketService.emitToRoom(buildTicketRoom(ticket.id), 'return-ticket:message:new', {
    ticketId: ticket.id,
  });
}

export const returnTicketController = {
  generateTicketNumber,
  getDefaultDeadline,

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      const { page = 1, limit = 10, status = '', search = '', overdue = '' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const where: any = {};
      const include: any[] = [
        {
          model: SaleReturn,
          as: 'returnRecord',
          include: [
            {
              model: Sale,
              as: 'sale',
              attributes: ['id', 'saleNumber', 'saleDate', 'customerName', 'status'],
            },
            { model: User, as: 'requester', attributes: ['id', 'fullName', 'username'] },
          ],
        },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'username'] },
        {
          model: ReturnTicketParticipant,
          as: 'participants',
          attributes: ['id', 'userId', 'roleSnapshot'],
          include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'username'] }],
        },
      ];

      if (status) where.status = status;
      if (String(overdue).toLowerCase() === 'true') {
        where.deadlineAt = { [Op.lt]: new Date() };
        where.status = { [Op.notIn]: [ReturnTicketStatus.COMPLETED, ReturnTicketStatus.REJECTED] };
      }

      if (search) {
        where[Op.or] = [
          { ticketNumber: { [Op.like]: `%${String(search)}%` } },
          { '$returnRecord.returnNumber$': { [Op.like]: `%${String(search)}%` } },
          { '$returnRecord.sale.saleNumber$': { [Op.like]: `%${String(search)}%` } },
          { '$returnRecord.sale.customerName$': { [Op.like]: `%${String(search)}%` } },
        ];
      }

      if (req.user.roleName === 'USER') where.createdBy = req.user.id;

      const { count, rows } = await ReturnTicket.findAndCountAll({
        where,
        include,
        distinct: true,
        limit: Number(limit),
        offset,
        order: [['updatedAt', 'DESC']],
      });

      return successResponse(
        res,
        {
          tickets: rows,
          pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
          },
        },
        'Daftar tiket retur berhasil diambil',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const ticket = await ensureTicketAccess(req.params.id, req.user);
      return successResponse(res, ticket, 'Detail tiket retur berhasil diambil', 200);
    } catch (error) {
      return next(error);
    }
  },

  async addMessage(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const ticket = await ensureTicketAccess(req.params.id, req.user);

      const message = String(req.body.message || '').trim();
      if (message.length < 1) {
        throw new AppError('Pesan tiket wajib diisi', 400);
      }
      if ([ReturnTicketStatus.COMPLETED, ReturnTicketStatus.REJECTED].includes(ticket.status)) {
        throw new AppError('Tiket retur yang sudah selesai atau ditolak tidak bisa ditambahkan pesan lagi', 400);
      }

      if (req.user.roleName === 'TCP') {
        const hasParticipant = (ticket.participants || []).some((participant: any) => participant.userId === req.user!.id);
        if (!hasParticipant) {
          await ReturnTicketParticipant.create(
            {
              ticketId: ticket.id,
              userId: req.user.id,
              roleSnapshot: req.user.roleName,
            },
            { transaction }
          );
        }
      }

      const createdMessage = await ReturnTicketMessage.create(
        {
          ticketId: ticket.id,
          senderId: req.user.id,
          message,
          messageType: ReturnTicketMessageType.TEXT,
        },
        { transaction }
      );

      const nextStatus =
        ticket.status === ReturnTicketStatus.OPEN ? ReturnTicketStatus.IN_DISCUSSION : ticket.status;

      if (nextStatus !== ticket.status) {
        await ticket.update({ status: nextStatus }, { transaction });
      }

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.CREATE,
          entity: 'ReturnTicketMessage',
          entityId: createdMessage.id,
          before: null,
          after: createdMessage.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();

      const refreshedTicket = await ensureTicketAccess(ticket.id, req.user);
      await emitMessageNotification(refreshedTicket, req.user.id, message);
      socketService.emitToRoom(buildTicketRoom(ticket.id), 'return-ticket:updated', { ticketId: ticket.id });
      socketService.broadcastDataRefresh('return-tickets');

      return successResponse(res, refreshedTicket, 'Pesan tiket berhasil dikirim', 201);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async updateDeadline(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const ticket = await ensureTicketAccess(req.params.id, req.user);

      const deadlineAt = new Date(String(req.body.deadlineAt || ''));
      if (Number.isNaN(deadlineAt.getTime())) {
        throw new AppError('Batas waktu tiket tidak valid', 400);
      }
      if ([ReturnTicketStatus.COMPLETED, ReturnTicketStatus.REJECTED].includes(ticket.status)) {
        throw new AppError('Batas waktu tidak bisa diubah karena tiket sudah ditutup', 400);
      }

      const before = ticket.toJSON();
      await ticket.update({ deadlineAt }, { transaction });

      await ReturnTicketMessage.create(
        {
          ticketId: ticket.id,
          senderId: req.user.id,
          message: `Batas waktu tiket diubah menjadi ${deadlineAt.toLocaleString('id-ID')}`,
          messageType: ReturnTicketMessageType.SYSTEM,
        },
        { transaction }
      );

      const afterState = {
        ...before,
        deadlineAt,
      };

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'ReturnTicket',
          entityId: ticket.id,
          before,
          after: afterState,
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();

      const refreshedTicket = await ensureTicketAccess(ticket.id, req.user);
      const recipients = (refreshedTicket.participants || []).map((participant: any) => participant.userId);
      for (const userId of [...new Set(recipients)]) {
        socketService.emitToUser(userId, 'notification:new', {
          message: 'Batas waktu tiket retur diperbarui',
          description: `Tiket ${ticket.ticketNumber} sekarang berbatas waktu ${deadlineAt.toLocaleString('id-ID')}`,
          type: 'INFO',
        });
      }
      socketService.emitToRoom(buildTicketRoom(ticket.id), 'return-ticket:deadline:updated', { ticketId: ticket.id });
      socketService.broadcastDataRefresh('return-tickets');

      return successResponse(res, refreshedTicket, 'Batas waktu tiket berhasil diperbarui', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async finalizeDecision(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const ticket = await ensureTicketAccess(req.params.id, req.user);

      const finalDecision = String(req.body.finalDecision || '') as ReturnFinalDecision;
      const finalDecisionNotes = String(req.body.finalDecisionNotes || '').trim() || null;

      if (!Object.values(ReturnFinalDecision).includes(finalDecision)) {
        throw new AppError('Keputusan akhir tiket tidak valid', 400);
      }
      if (!ticket.returnRecord) {
        throw new AppError('Data retur asal tiket tidak ditemukan', 404);
      }
      if (ticket.returnRecord.status !== SaleReturnStatus.ITEM_RECEIVED) {
        throw new AppError('Keputusan akhir tiket hanya boleh ditetapkan setelah barang retur diterima dan siap diinspeksi', 400);
      }
      if ([ReturnTicketStatus.COMPLETED, ReturnTicketStatus.REJECTED].includes(ticket.status)) {
        throw new AppError('Tiket retur ini sudah ditutup', 400);
      }
      if (ticket.finalizedAt || ticket.finalDecision) {
        throw new AppError('Keputusan akhir tiket sudah pernah difinalisasi', 400);
      }

      const before = ticket.toJSON();
      await ticket.update(
        {
          finalDecision,
          finalDecisionNotes,
          finalizedBy: req.user.id,
          finalizedAt: new Date(),
          status: ReturnTicketStatus.WAITING_TCP_EXECUTION,
        },
        { transaction }
      );

      const execution = await ReturnExecution.create(
        {
          ticketId: ticket.id,
          executionType: finalDecision,
          notes: finalDecisionNotes,
          status: ReturnExecutionStatus.PENDING,
        },
        { transaction }
      );

      await ReturnTicketMessage.create(
        {
          ticketId: ticket.id,
          senderId: req.user.id,
          message: `Keputusan akhir ditetapkan: ${finalDecision}${finalDecisionNotes ? ` — ${finalDecisionNotes}` : ''}`,
          messageType: ReturnTicketMessageType.DECISION,
          metadata: { finalDecision },
        },
        { transaction }
      );

      const afterState = {
        ...before,
        finalDecision,
        finalDecisionNotes,
        finalizedBy: req.user.id,
        finalizedAt: new Date(),
        status: ReturnTicketStatus.WAITING_TCP_EXECUTION,
      };

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'ReturnTicket',
          entityId: ticket.id,
          before,
          after: afterState,
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.CREATE,
          entity: 'ReturnExecution',
          entityId: execution.id,
          before: null,
          after: execution.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await transaction.commit();

      const refreshedTicket = await ensureTicketAccess(ticket.id, req.user);
      const requesterId = refreshedTicket.returnRecord?.requestedBy;
      if (requesterId) {
        socketService.emitToUser(requesterId, 'notification:new', {
          message: 'Keputusan retur sudah ditetapkan',
          description: `Tiket ${ticket.ticketNumber} masuk ke tahap eksekusi TCP`,
          type: 'INFO',
        });
      }
      socketService.emitToTCP('notification:new', {
        message: 'Tiket retur siap masuk tahap eksekusi',
        description: `Tiket ${ticket.ticketNumber} menunggu eksekusi TCP`,
        type: 'INFO',
      });
      socketService.emitToRoom(buildTicketRoom(ticket.id), 'return-ticket:decision:finalized', { ticketId: ticket.id });
      socketService.broadcastDataRefresh('return-tickets');

      return successResponse(res, refreshedTicket, 'Keputusan tiket berhasil difinalisasi', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async startExecution(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const ticket = await ensureTicketAccess(req.params.id, req.user);

      if (ticket.status !== ReturnTicketStatus.WAITING_TCP_EXECUTION) {
        throw new AppError('Tiket belum masuk tahap eksekusi TCP', 400);
      }

      const execution = await ReturnExecution.findOne({
        where: { ticketId: ticket.id },
        order: [['createdAt', 'DESC']],
        transaction,
      });

      if (!execution) {
        throw new AppError('Data eksekusi tiket belum tersedia', 404);
      }

      await ticket.update(
        {
          status: ReturnTicketStatus.TCP_EXECUTING,
          tcpExecutorId: req.user.id,
          tcpStartedAt: new Date(),
        },
        { transaction }
      );
      await execution.update(
        {
          status: ReturnExecutionStatus.STARTED,
          executedBy: req.user.id,
        },
        { transaction }
      );

      await ReturnTicketParticipant.findOrCreate({
        where: { ticketId: ticket.id, userId: req.user.id },
        defaults: {
          ticketId: ticket.id,
          userId: req.user.id,
          roleSnapshot: req.user.roleName,
        },
        transaction,
      });

      await ReturnTicketMessage.create(
        {
          ticketId: ticket.id,
          senderId: req.user.id,
          message: 'TCP mulai menjalankan eksekusi tiket retur ini',
          messageType: ReturnTicketMessageType.SYSTEM,
        },
        { transaction }
      );

      await transaction.commit();

      const refreshedTicket = await ensureTicketAccess(ticket.id, req.user);
      const requesterId = refreshedTicket.returnRecord?.requestedBy;
      if (requesterId) {
        socketService.emitToUser(requesterId, 'notification:new', {
          message: 'Retur sedang dieksekusi TCP',
          description: `Tiket ${ticket.ticketNumber} sedang dieksekusi`,
          type: 'INFO',
        });
      }
      socketService.emitToAdmins('notification:new', {
        message: 'TCP mulai menjalankan eksekusi tiket retur',
        description: `Tiket ${ticket.ticketNumber} sedang dieksekusi`,
        type: 'INFO',
      });
      socketService.emitToRoom(buildTicketRoom(ticket.id), 'return-ticket:execution:started', { ticketId: ticket.id });
      socketService.broadcastDataRefresh('return-tickets');

      return successResponse(res, refreshedTicket, 'Eksekusi tiket berhasil mulai diproses', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async completeExecution(req: Request, res: Response, next: NextFunction) {
    const transaction = await sequelize.transaction();
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const ticket = await ensureTicketAccess(req.params.id, req.user);

      if (ticket.status !== ReturnTicketStatus.TCP_EXECUTING) {
        throw new AppError('Tiket belum dalam proses eksekusi TCP', 400);
      }

      const execution = await ReturnExecution.findOne({
        where: { ticketId: ticket.id },
        order: [['createdAt', 'DESC']],
        transaction,
      });

      if (!execution) {
        throw new AppError('Data eksekusi tiket belum tersedia', 404);
      }

      const returnRecord = await SaleReturn.findByPk(ticket.saleReturnId, {
        include: [{ model: SaleReturnItem, as: 'items' }],
        transaction,
      });

      if (!returnRecord) {
        throw new AppError('Data retur asal tiket tidak ditemukan', 404);
      }

      const returnItems = (returnRecord.items || []) as SaleReturnItem[];
      if (!returnItems.length) {
        throw new AppError('Item retur tidak ditemukan', 400);
      }

      const notes = String(req.body.notes || '').trim() || execution.notes;
      const shippingService = String(req.body.shippingService || '').trim() || execution.shippingService;
      const shippingCost = req.body.shippingCost != null ? Number(req.body.shippingCost) : Number(execution.shippingCost);
      const expenseAmount = req.body.expenseAmount != null ? Number(req.body.expenseAmount) : Number(execution.expenseAmount);
      const payloadItems = buildExecutionItemPayload(req.body.items);

      if (!Number.isFinite(shippingCost) || shippingCost < 0) {
        throw new AppError('Biaya kirim eksekusi tidak valid', 400);
      }
      if (!Number.isFinite(expenseAmount) || expenseAmount < 0) {
        throw new AppError('Nominal biaya eksekusi tidak valid', 400);
      }

      const executionItems =
        payloadItems.length > 0
          ? payloadItems
          : returnItems.map((item) => ({
              returnItemId: item.id,
              qtyReceived: item.qtyRequested,
              replacementQty: item.qtyRequested,
              replacementProductId: item.productId,
              replacementVariantName: item.variantName || null,
            }));

      const itemsById = new Map(returnItems.map((item) => [item.id, item]));
      let calculatedImpact = 0;

      if (ticket.finalDecision === ReturnFinalDecision.RESTOCK) {
        for (const item of executionItems) {
          const returnItem = itemsById.get(String(item.returnItemId || ''));
          const qtyReceived = Number(item.qtyReceived || 0);

          if (!returnItem) throw new AppError('Item retur untuk restock tidak ditemukan', 400);
          if (!Number.isInteger(qtyReceived) || qtyReceived <= 0 || qtyReceived > returnItem.qtyRequested) {
            throw new AppError('Qty item restock tidak valid', 400);
          }

          const product = await Product.findByPk(returnItem.productId, { transaction });
          if (!product) throw new AppError('Produk retur tidak ditemukan', 404);

          const stockBefore = product.stock;
          await product.update({ stock: product.stock + qtyReceived }, { transaction });

          if (returnItem.variantName) {
            const variant = await ProductVariant.findOne({
              where: { productId: returnItem.productId, value: returnItem.variantName },
              transaction,
            });
            if (variant) {
              await variant.update({ stock: variant.stock + qtyReceived }, { transaction });
            }
          }

          await StockMovement.create(
            {
              productId: returnItem.productId,
              type: MovementType.IN,
              quantity: qtyReceived,
              stockBefore,
              stockAfter: stockBefore + qtyReceived,
              reference: `RETURN_TICKET_RESTOCK:${ticket.ticketNumber}`,
              notes: `Eksekusi tiket retur kembali ke stok${returnItem.variantName ? ` (Varian: ${returnItem.variantName})` : ''}`,
              createdBy: req.user.id,
            },
            { transaction }
          );

          await returnItem.update(
            {
              qtyReceived,
              resolution: SaleReturnDecision.RESTOCK,
              replacementProductId: null,
              replacementVariantName: null,
              replacementQty: null,
            },
            { transaction }
          );
        }
      } else if (
        ticket.finalDecision === ReturnFinalDecision.RESEND_UNIT ||
        ticket.finalDecision === ReturnFinalDecision.SEND_COMPONENT
      ) {
        for (const item of executionItems) {
          const returnItem = itemsById.get(String(item.returnItemId || ''));
          const qtyReceived = Number(item.qtyReceived || 0);
          const replacementQty = Number(item.replacementQty || qtyReceived);

          if (!returnItem) throw new AppError('Item retur untuk pengiriman tidak ditemukan', 400);
          if (!Number.isInteger(qtyReceived) || qtyReceived <= 0 || qtyReceived > returnItem.qtyRequested) {
            throw new AppError('Qty item pengiriman tidak valid', 400);
          }
          if (!Number.isInteger(replacementQty) || replacementQty <= 0) {
            throw new AppError('Qty pengganti / komponen tidak valid', 400);
          }

          const replacementProductId = String(item.replacementProductId || returnItem.productId);
          const replacementVariantName =
            item.replacementVariantName !== undefined
              ? String(item.replacementVariantName || '') || null
              : returnItem.variantName || null;

          const { product, variant } = await resolveReplacementStock({
            productId: replacementProductId,
            variantName: replacementVariantName,
            qty: replacementQty,
            transaction,
          });

          const stockBefore = product.stock;
          await product.update({ stock: product.stock - replacementQty }, { transaction });

          if (variant) {
            await variant.update({ stock: variant.stock - replacementQty }, { transaction });
          }

          await StockMovement.create(
            {
              productId: replacementProductId,
              type: MovementType.OUT,
              quantity: replacementQty,
              stockBefore,
              stockAfter: stockBefore - replacementQty,
              reference:
                ticket.finalDecision === ReturnFinalDecision.SEND_COMPONENT
                  ? `RETURN_TICKET_COMPONENT:${ticket.ticketNumber}`
                  : `RETURN_TICKET_RESEND:${ticket.ticketNumber}`,
              notes:
                ticket.finalDecision === ReturnFinalDecision.SEND_COMPONENT
                  ? `Eksekusi tiket retur kirim komponen${replacementVariantName ? ` (Varian: ${replacementVariantName})` : ''}`
                  : `Eksekusi tiket retur kirim ulang unit${replacementVariantName ? ` (Varian: ${replacementVariantName})` : ''}`,
              createdBy: req.user.id,
            },
            { transaction }
          );

          await returnItem.update(
            {
              qtyReceived,
              resolution: SaleReturnDecision.RESEND,
              replacementProductId,
              replacementVariantName,
              replacementQty,
            },
            { transaction }
          );

          const saleItem = await SaleItem.findByPk(returnItem.saleItemId, { transaction });
          if (saleItem) {
            const unitValue = Number(saleItem.subtotal) / Number(saleItem.quantity || 1);
            calculatedImpact += replacementQty * unitValue;
          }
        }
      } else {
        throw new AppError('Keputusan tiket belum valid untuk dieksekusi', 400);
      }

      await createExpenseIfNeeded({
        transaction,
        createdBy: req.user.id,
        category: 'SHIPPING',
        amount: shippingCost,
        description:
          ticket.finalDecision === ReturnFinalDecision.SEND_COMPONENT
            ? `Ongkir kirim komponen tiket retur ${ticket.ticketNumber}`
            : `Ongkir eksekusi tiket retur ${ticket.ticketNumber}`,
        notes: shippingService ? `Jasa kirim: ${shippingService}` : notes,
      });

      await createExpenseIfNeeded({
        transaction,
        createdBy: req.user.id,
        category: 'OTHER',
        amount: expenseAmount,
        description: `Biaya penanganan tiket retur ${ticket.ticketNumber}`,
        notes,
      });

      const totalFinancialImpact =
        ticket.finalDecision === ReturnFinalDecision.RESTOCK
          ? expenseAmount + shippingCost
          : shippingCost + expenseAmount + (ticket.finalDecision === ReturnFinalDecision.SEND_COMPONENT ? calculatedImpact : 0);

      const returnStatus =
        ticket.finalDecision === ReturnFinalDecision.RESTOCK
          ? SaleReturnStatus.RESTOCKED
          : SaleReturnStatus.RESENT;
      const returnDecision =
        ticket.finalDecision === ReturnFinalDecision.RESTOCK
          ? SaleReturnDecision.RESTOCK
          : SaleReturnDecision.RESEND;

      const returnBefore = returnRecord.toJSON();
      await returnRecord.update(
        {
          status: returnStatus,
          inspectionDecision: returnDecision,
          inspectionNotes: notes || ticket.finalDecisionNotes || null,
          receivedBy: returnRecord.receivedBy || req.user.id,
          receivedAt: returnRecord.receivedAt || new Date(),
          processedBy: req.user.id,
          processedAt: new Date(),
          resendShippingService:
            ticket.finalDecision === ReturnFinalDecision.RESTOCK ? null : shippingService || null,
          resendShippingCost:
            ticket.finalDecision === ReturnFinalDecision.RESTOCK ? '0.00' : shippingCost.toFixed(2),
          financialImpactAmount: totalFinancialImpact.toFixed(2),
        },
        { transaction }
      );

      await ticket.update(
        {
          status: ReturnTicketStatus.COMPLETED,
          tcpExecutorId: req.user.id,
          tcpCompletedAt: new Date(),
          resolvedAt: new Date(),
        },
        { transaction }
      );

      await execution.update(
        {
          status: ReturnExecutionStatus.COMPLETED,
          notes,
          shippingService,
          shippingCost: String(shippingCost),
          expenseAmount: String(expenseAmount),
          executedBy: req.user.id,
          executedAt: new Date(),
        },
        { transaction }
      );

      await auditService.log(
        {
          userId: req.user.id,
          action: AuditAction.UPDATE,
          entity: 'SaleReturn',
          entityId: returnRecord.id,
          before: returnBefore,
          after: returnRecord.toJSON(),
          ip: req.ip || req.socket.remoteAddress || '',
          userAgent: req.headers['user-agent'] || '',
        },
        transaction
      );

      await ReturnTicketMessage.create(
        {
          ticketId: ticket.id,
          senderId: req.user.id,
          message: 'TCP menandai eksekusi tiket retur ini sudah selesai',
          messageType: ReturnTicketMessageType.SYSTEM,
        },
        { transaction }
      );

      await transaction.commit();

      const refreshedTicket = await ensureTicketAccess(ticket.id, req.user);
      const requesterId = refreshedTicket.returnRecord?.requestedBy;
      if (requesterId) {
        socketService.emitToUser(requesterId, 'notification:new', {
          message: 'Retur selesai diproses',
          description: `Tiket ${ticket.ticketNumber} sudah selesai`,
          type: 'SUCCESS',
        });
      }
      socketService.emitToAdmins('notification:new', {
        message: 'Eksekusi tiket retur sudah selesai',
        description: `Tiket ${ticket.ticketNumber} sudah selesai`,
        type: 'SUCCESS',
      });
      socketService.emitToRoom(buildTicketRoom(ticket.id), 'return-ticket:execution:completed', { ticketId: ticket.id });
      socketService.broadcastDataRefresh('return-tickets');
      socketService.broadcastDataRefresh('returns');
      socketService.broadcastDataRefresh('stock');
      socketService.broadcastDataRefresh('expense');
      socketService.broadcastDataRefresh('finance');

      return successResponse(res, refreshedTicket, 'Eksekusi tiket berhasil diselesaikan', 200);
    } catch (error) {
      await transaction.rollback();
      return next(error);
    }
  },

  async createForReturn(options: {
    saleReturnId: string;
    createdBy: string;
    createdByRole: string;
    transaction: any;
    requestMeta?: { ip?: string; userAgent?: string };
  }) {
    const adminUsers = await User.findAll({
      include: [
        {
          model: Role,
          as: 'role',
          where: {
            name: {
              [Op.in]: ['ADMIN', 'SUPER_ADMIN'],
            },
          },
          attributes: ['name'],
        },
      ],
      attributes: ['id'],
      transaction: options.transaction,
    });

    const ticket = await ReturnTicket.create(
      {
        ticketNumber: generateTicketNumber(),
        saleReturnId: options.saleReturnId,
        createdBy: options.createdBy,
        status: ReturnTicketStatus.OPEN,
        deadlineAt: getDefaultDeadline(2),
      },
      { transaction: options.transaction }
    );

    const participantIds = [options.createdBy, ...adminUsers.map((user) => user.id)];
    const uniqueParticipantIds = [...new Set(participantIds)];

    await ReturnTicketParticipant.bulkCreate(
      uniqueParticipantIds.map((userId) => ({
        ticketId: ticket.id,
        userId,
        roleSnapshot:
          userId === options.createdBy
            ? options.createdByRole
            : ((adminUsers.find((user) => user.id === userId) as any)?.role?.name || 'ADMIN'),
      })),
      { transaction: options.transaction }
    );

    await ReturnTicketMessage.create(
      {
        ticketId: ticket.id,
        senderId: options.createdBy,
        message: 'Tiket retur dibuat dan siap untuk didiskusikan',
        messageType: ReturnTicketMessageType.SYSTEM,
      },
      { transaction: options.transaction }
    );

    await auditService.log(
      {
        userId: options.createdBy,
        action: AuditAction.CREATE,
        entity: 'ReturnTicket',
        entityId: ticket.id,
        before: null,
        after: ticket.toJSON(),
        ip: options.requestMeta?.ip || '',
        userAgent: options.requestMeta?.userAgent || '',
      },
      options.transaction
    );

    return ticket;
  },
};
