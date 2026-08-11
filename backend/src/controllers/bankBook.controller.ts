import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import { Sale, Settlement, SettlementRequest, SettlementRequestStatus, User } from '../models';
import { successResponse } from '../utils/response';

type CandidateSource = 'SETTLEMENT' | 'REQUEST';

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function amountText(value: unknown) {
  const numeric = Number(value || 0);
  return [String(value ?? ''), String(numeric), numeric.toLocaleString('id-ID')].join(' ').toLowerCase();
}

function toDateInput(value: unknown) {
  if (!value) return '';
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function matchesDateRange(dateValue: string, startDate?: string, endDate?: string) {
  if (!dateValue) return false;
  if (startDate && dateValue < startDate) return false;
  if (endDate && dateValue > endDate) return false;
  return true;
}

function platformLabel(platform?: string | null) {
  const value = String(platform || 'OTHER').toUpperCase();
  const labels: Record<string, string> = {
    OFFLINE_STORE: 'Offline Store',
    TOKOPEDIA: 'Tokopedia',
    SHOPEE: 'Shopee',
    TIKTOK_SHOP: 'TikTok Shop',
    LAZADA: 'Lazada',
    OTHER: 'Lainnya',
  };
  return labels[value] || value.replace(/_/g, ' ');
}

function buildCandidate(row: any, source: CandidateSource) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const sale = plain.sale || {};
  const grossAmount = Number(sale.totalAmount || 0);
  const netAmount = Number(plain.netAmount || 0);
  const settlementDate = toDateInput(plain.settlementDate);
  const platform = sale.platform || 'OTHER';

  return {
    id: `${source}:${plain.id}`,
    source,
    sourceId: plain.id,
    settlementId: source === 'SETTLEMENT' ? plain.id : plain.settlementId || null,
    settlementRequestId: source === 'REQUEST' ? plain.id : null,
    saleId: plain.saleId,
    invoiceNumber: sale.saleNumber || plain.invoiceNumber || '-',
    platform,
    platformLabel: platformLabel(platform),
    customerName: sale.customerName || '-',
    customerPhone: sale.customerPhone || '-',
    grossAmount,
    netAmount,
    difference: Math.max(grossAmount - netAmount, 0),
    settlementDate,
    inputDate: plain.createdAt || plain.updatedAt || plain.settlementDate,
    responsibleName:
      source === 'REQUEST'
        ? plain.requester?.fullName || sale.creator?.fullName || '-'
        : sale.creator?.fullName || plain.creator?.fullName || '-',
    responsibleEmail:
      source === 'REQUEST'
        ? plain.requester?.email || sale.creator?.email || ''
        : sale.creator?.email || plain.creator?.email || '',
    statusLabel: source === 'REQUEST' ? 'Pending lama' : 'Siap dicocokkan',
    statusTone: source === 'REQUEST' ? 'pending' : 'ready',
    notes: plain.notes || '',
  };
}

export const bankBookController = {
  async getCandidates(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 200,
        source = 'ALL',
        platform = 'ALL',
        search = '',
        startDate = '',
        endDate = '',
      } = req.query;

      const currentPage = Math.max(Number(page) || 1, 1);
      const perPage = Math.min(Math.max(Number(limit) || 200, 1), 500);
      const requestedSource = String(source || 'ALL').toUpperCase();
      const requestedPlatform = String(platform || 'ALL').toUpperCase();
      const keyword = normalize(search).trim();
      const start = String(startDate || '').trim();
      const end = String(endDate || '').trim();

      const includeSale = {
        model: Sale,
        as: 'sale',
        required: true,
        include: [{ model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] }],
      };

      const sources: CandidateSource[] = requestedSource === 'SETTLEMENT'
        ? ['SETTLEMENT']
        : requestedSource === 'REQUEST'
          ? ['REQUEST']
          : ['REQUEST', 'SETTLEMENT'];

      const candidates: any[] = [];

      if (sources.includes('SETTLEMENT')) {
        const settlementWhere: any = {};
        if (start && end) settlementWhere.settlementDate = { [Op.between]: [start, end] };
        else if (start) settlementWhere.settlementDate = { [Op.gte]: start };
        else if (end) settlementWhere.settlementDate = { [Op.lte]: end };

        const settlements = await Settlement.findAll({
          where: settlementWhere,
          include: [includeSale, { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] }],
          order: [['settlementDate', 'ASC'], ['createdAt', 'ASC']],
        });
        candidates.push(...settlements.map((row) => buildCandidate(row, 'SETTLEMENT')));
      }

      if (sources.includes('REQUEST')) {
        const requestWhere: any = { status: SettlementRequestStatus.PENDING };
        if (start && end) requestWhere.settlementDate = { [Op.between]: [start, end] };
        else if (start) requestWhere.settlementDate = { [Op.gte]: start };
        else if (end) requestWhere.settlementDate = { [Op.lte]: end };

        const requests = await SettlementRequest.findAll({
          where: requestWhere,
          include: [includeSale, { model: User, as: 'requester', attributes: ['id', 'fullName', 'email'] }],
          order: [['settlementDate', 'ASC'], ['createdAt', 'ASC']],
        });
        candidates.push(...requests.map((row) => buildCandidate(row, 'REQUEST')));
      }

      const filtered = candidates
        .filter((candidate) => requestedPlatform === 'ALL' || String(candidate.platform).toUpperCase() === requestedPlatform)
        .filter((candidate) => !start && !end ? true : matchesDateRange(candidate.settlementDate, start || undefined, end || undefined))
        .filter((candidate) => {
          if (!keyword) return true;
          const searchable = [
            candidate.invoiceNumber,
            candidate.platform,
            candidate.platformLabel,
            candidate.customerName,
            candidate.customerPhone,
            candidate.responsibleName,
            candidate.responsibleEmail,
            candidate.settlementDate,
            amountText(candidate.grossAmount),
            amountText(candidate.netAmount),
            amountText(candidate.difference),
            candidate.notes,
          ].join(' ').toLowerCase();
          return searchable.includes(keyword);
        })
        .sort((a, b) => {
          const dateCompare = String(a.settlementDate || '').localeCompare(String(b.settlementDate || ''));
          if (dateCompare !== 0) return dateCompare;
          return String(a.invoiceNumber || '').localeCompare(String(b.invoiceNumber || ''));
        });

      const offset = (currentPage - 1) * perPage;
      const rows = filtered.slice(offset, offset + perPage);
      const platforms = Array.from(new Set(candidates.map((candidate) => candidate.platform).filter(Boolean)))
        .sort((a, b) => platformLabel(a).localeCompare(platformLabel(b)))
        .map((value) => ({ value, label: platformLabel(value) }));

      return successResponse(
        res,
        {
          candidates: rows,
          platforms,
          summary: {
            totalGrossAmount: filtered.reduce((sum, item) => sum + item.grossAmount, 0),
            totalNetAmount: filtered.reduce((sum, item) => sum + item.netAmount, 0),
            totalDifference: filtered.reduce((sum, item) => sum + item.difference, 0),
          },
          pagination: {
            total: filtered.length,
            page: currentPage,
            limit: perPage,
            totalPages: Math.max(Math.ceil(filtered.length / perPage), 1),
          },
        },
        'Bank book candidates retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },
};
