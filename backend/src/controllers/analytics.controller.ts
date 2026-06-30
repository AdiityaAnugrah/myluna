import { Request, Response, NextFunction } from 'express';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import {
  Complaint,
  ComplaintStatus,
  ReturnTicket,
  ReturnTicketStatus,
  SaleReturn,
  SaleReturnStatus,
} from '../models';
import { successResponse } from '../utils/response';
import { createPlatformNameResolver } from '../utils/platformName';
import { formatRegionLabel } from '../utils/regionLabel';

type RegionLevel = 'province' | 'regency' | 'district' | 'village';

const regionConfig: Record<RegionLevel, { saleColumn: string; table: string; alias: string }> = {
  province: { saleColumn: 'shippingProvinceId', table: 'provinsi', alias: 'r' },
  regency: { saleColumn: 'shippingRegencyId', table: 'kabupaten', alias: 'r' },
  district: { saleColumn: 'shippingDistrictId', table: 'kecamatan', alias: 'r' },
  village: { saleColumn: 'shippingVillageId', table: 'kelurahan', alias: 'r' },
};

const regionLabels: Record<RegionLevel, string> = {
  province: 'provinsi',
  regency: 'kabupaten/kota',
  district: 'kecamatan',
  village: 'kelurahan/desa',
};

function parseRegionLevel(value: unknown): RegionLevel | null {
  const level = String(value || '') as RegionLevel;
  return regionConfig[level] ? level : null;
}

function normalizeDate(value: unknown, fallback: string) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function getDefaultDateRange(req: Request) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: normalizeDate(req.query.startDate, firstDay.toISOString().slice(0, 10)),
    endDate: normalizeDate(req.query.endDate, now.toISOString().slice(0, 10)),
  };
}

function getScope(req: Request) {
  const level = parseRegionLevel(req.query.scopeLevel);
  const parsedId = Number(req.query.scopeRegionId);
  const regionId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  return { level, regionId };
}

function extractPostalCode(value: unknown) {
  return String(value || '').match(/\b\d{5}\b/)?.[0] || null;
}

function buildCreatedAtFilter(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return undefined;

  const filter: Record<symbol, Date> = {} as Record<symbol, Date>;
  if (startDate) {
    filter[Op.gte] = new Date(`${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    filter[Op.lte] = new Date(`${endDate}T23:59:59.999Z`);
  }

  return filter;
}

export const analyticsController = {
  async getOperationalSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const createdAt = buildCreatedAtFilter(startDate, endDate);
      const roleName = req.user?.roleName || '';
      const isUserRole = roleName === 'USER';

      const complaintWhere: any = {};
      const returnWhere: any = {};
      const ticketWhere: any = {};

      if (createdAt) {
        complaintWhere.createdAt = createdAt;
        returnWhere.createdAt = createdAt;
        ticketWhere.createdAt = createdAt;
      }

      if (isUserRole && req.user?.id) {
        complaintWhere.createdBy = req.user.id;
        returnWhere.requestedBy = req.user.id;
        ticketWhere.createdBy = req.user.id;
      }

      const [
        complaintRows,
        returnRows,
        ticketRows,
      ] = await Promise.all([
        Complaint.findAll({
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          where: complaintWhere,
          group: ['status'],
          raw: true,
        }),
        SaleReturn.findAll({
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          where: returnWhere,
          group: ['status'],
          raw: true,
        }),
        ReturnTicket.findAll({
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          where: ticketWhere,
          group: ['status'],
          raw: true,
        }),
      ]);

      const complaints = {
        total: 0,
        active: 0,
        pendingReview: 0,
        acceptedByTcp: 0,
        replacementShipped: 0,
        completed: 0,
        convertedToReturn: 0,
        rejected: 0,
      };

      for (const row of complaintRows as any[]) {
        const count = Number(row.count || 0);
        complaints.total += count;

        switch (row.status as ComplaintStatus) {
          case ComplaintStatus.PENDING_TCP_REVIEW:
            complaints.pendingReview = count;
            complaints.active += count;
            break;
          case ComplaintStatus.ACCEPTED_BY_TCP:
            complaints.acceptedByTcp = count;
            complaints.active += count;
            break;
          case ComplaintStatus.REPLACEMENT_SHIPPED:
            complaints.replacementShipped = count;
            complaints.active += count;
            break;
          case ComplaintStatus.COMPLETED:
            complaints.completed = count;
            break;
          case ComplaintStatus.CONVERTED_TO_RETURN:
            complaints.convertedToReturn = count;
            break;
          case ComplaintStatus.REJECTED_BY_TCP:
            complaints.rejected = count;
            break;
        }
      }

      const returns = {
        total: 0,
        active: 0,
        pendingReview: 0,
        waitingItemReturn: 0,
        itemReceived: 0,
        restocked: 0,
        damaged: 0,
        resent: 0,
        completed: 0,
        rejected: 0,
      };

      for (const row of returnRows as any[]) {
        const count = Number(row.count || 0);
        returns.total += count;

        switch (row.status as SaleReturnStatus) {
          case SaleReturnStatus.PENDING_REVIEW:
            returns.pendingReview = count;
            returns.active += count;
            break;
          case SaleReturnStatus.WAITING_ITEM_RETURN:
            returns.waitingItemReturn = count;
            returns.active += count;
            break;
          case SaleReturnStatus.ITEM_RECEIVED:
            returns.itemReceived = count;
            returns.active += count;
            break;
          case SaleReturnStatus.RESTOCKED:
            returns.restocked = count;
            break;
          case SaleReturnStatus.DAMAGED:
            returns.damaged = count;
            break;
          case SaleReturnStatus.RESENT:
            returns.resent = count;
            break;
          case SaleReturnStatus.COMPLETED:
            returns.completed = count;
            break;
          case SaleReturnStatus.REJECTED:
            returns.rejected = count;
            break;
        }
      }

      const tickets = {
        total: 0,
        active: 0,
        open: 0,
        inDiscussion: 0,
        waitingTcpExecution: 0,
        tcpExecuting: 0,
        overdue: 0,
        completed: 0,
        rejected: 0,
      };

      for (const row of ticketRows as any[]) {
        const count = Number(row.count || 0);
        tickets.total += count;

        switch (row.status as ReturnTicketStatus) {
          case ReturnTicketStatus.OPEN:
            tickets.open = count;
            tickets.active += count;
            break;
          case ReturnTicketStatus.IN_DISCUSSION:
            tickets.inDiscussion = count;
            tickets.active += count;
            break;
          case ReturnTicketStatus.WAITING_TCP_EXECUTION:
            tickets.waitingTcpExecution = count;
            tickets.active += count;
            break;
          case ReturnTicketStatus.TCP_EXECUTING:
            tickets.tcpExecuting = count;
            tickets.active += count;
            break;
          case ReturnTicketStatus.OVERDUE:
            tickets.overdue = count;
            tickets.active += count;
            break;
          case ReturnTicketStatus.COMPLETED:
            tickets.completed = count;
            break;
          case ReturnTicketStatus.REJECTED:
            tickets.rejected = count;
            break;
        }
      }

      return successResponse(
        res,
        {
          period: startDate || endDate ? { startDate: startDate || null, endDate: endDate || null } : null,
          complaints,
          returns,
          tickets,
        },
        'Operational analytics retrieved successfully',
        200
      );
    } catch (error) {
      return next(error);
    }
  },

  async getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = getDefaultDateRange(req);
      const regionLevel = parseRegionLevel(req.query.regionLevel) || 'province';
      const { level: scopeLevel, regionId: scopeRegionId } = getScope(req);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const region = regionConfig[regionLevel];

      const replacements = { startDate, endDate, limit, scopeRegionId };
      const scopeWhere = (saleAlias: string) => (
        scopeLevel && scopeRegionId
          ? `AND ${saleAlias}.${regionConfig[scopeLevel].saleColumn} = :scopeRegionId`
          : ''
      );
      const activeSaleWhere = (saleAlias: string) => `
        ${saleAlias}.isInitialBalance = 0
        AND ${saleAlias}.status NOT IN ('CANCELLED', 'REJECTED')
        AND DATE(${saleAlias}.saleDate) BETWEEN :startDate AND :endDate
        ${scopeWhere(saleAlias)}
      `;

      const [summaryRows, productRows, variantRows, regionRows, rawPlatformRows, masterPlatformRows] = await Promise.all([
        sequelize.query(
          `
            SELECT
              (
                SELECT COUNT(DISTINCT s1.id)
                FROM sales s1
                WHERE ${activeSaleWhere('s1')}
              ) AS totalSales,
              (
                SELECT COALESCE(SUM(s2.totalAmount), 0)
                FROM sales s2
                WHERE ${activeSaleWhere('s2')}
              ) AS totalRevenue,
              (
                SELECT COALESCE(SUM(si2.quantity), 0)
                FROM sale_items si2
                INNER JOIN sales s3 ON s3.id = si2.saleId
                WHERE ${activeSaleWhere('s3')}
              ) AS totalQuantitySold,
              (
                SELECT COUNT(DISTINCT si3.productId)
                FROM sale_items si3
                INNER JOIN sales s4 ON s4.id = si3.saleId
                WHERE ${activeSaleWhere('s4')}
              ) AS totalProductsSold,
              (
                SELECT COUNT(DISTINCT CASE
                  WHEN COALESCE(si4.variantName, '') <> '' THEN CONCAT(si4.productId, '::', si4.variantName)
                  ELSE NULL
                END)
                FROM sale_items si4
                INNER JOIN sales s5 ON s5.id = si4.saleId
                WHERE ${activeSaleWhere('s5')}
              ) AS totalVariantsSold,
              (
                SELECT COUNT(DISTINCT mapped2.id)
                FROM sales s6
                INNER JOIN ${region.table} mapped2
                  ON mapped2.id = s6.${region.saleColumn}
                  AND mapped2.isActive = 1
                WHERE ${activeSaleWhere('s6')}
              ) AS totalRegionsCovered,
              (
                SELECT COUNT(DISTINCT CASE WHEN mapped3.id IS NOT NULL THEN s7.id END)
                FROM sales s7
                LEFT JOIN ${region.table} mapped3
                  ON mapped3.id = s7.${region.saleColumn}
                  AND mapped3.isActive = 1
                WHERE ${activeSaleWhere('s7')}
              ) AS mappedSales
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
            SELECT
              p.id AS productId,
              p.name AS productName,
              p.sku,
              SUM(si.quantity) AS quantitySold,
              COUNT(DISTINCT si.saleId) AS orderCount,
              COALESCE(SUM(si.subtotal), 0) AS revenue
            FROM sale_items si
            INNER JOIN sales s ON s.id = si.saleId
            INNER JOIN products p ON p.id = si.productId
            WHERE ${activeSaleWhere('s')}
            GROUP BY p.id, p.name, p.sku
            ORDER BY quantitySold DESC, revenue DESC
            LIMIT :limit
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
            SELECT
              p.id AS productId,
              p.name AS productName,
              p.sku,
              si.variantName,
              SUM(si.quantity) AS quantitySold,
              COUNT(DISTINCT si.saleId) AS orderCount,
              COALESCE(SUM(si.subtotal), 0) AS revenue
            FROM sale_items si
            INNER JOIN sales s ON s.id = si.saleId
            INNER JOIN products p ON p.id = si.productId
            WHERE ${activeSaleWhere('s')}
              AND COALESCE(si.variantName, '') <> ''
            GROUP BY p.id, p.name, p.sku, si.variantName
            ORDER BY quantitySold DESC, revenue DESC
            LIMIT :limit
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
            SELECT
              r.id AS regionId,
              r.label AS regionName,
              COUNT(DISTINCT s.id) AS orderCount,
              COALESCE(SUM(s.totalAmount), 0) AS revenue,
              COALESCE(SUM(si.quantity), 0) AS quantityPurchased
            FROM sales s
            INNER JOIN ${region.table} ${region.alias}
              ON ${region.alias}.id = s.${region.saleColumn}
              AND ${region.alias}.isActive = 1
            LEFT JOIN (
              SELECT saleId, SUM(quantity) AS quantity
              FROM sale_items
              GROUP BY saleId
            ) si ON si.saleId = s.id
            WHERE ${activeSaleWhere('s')}
            GROUP BY r.id, r.label
            ORDER BY orderCount DESC, revenue DESC
            LIMIT :limit
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
            SELECT
              s.platform AS platformName,
              COUNT(DISTINCT s.id) AS orderCount,
              COALESCE(SUM(s.totalAmount), 0) AS revenue,
              COALESCE(SUM(si.quantity), 0) AS quantitySold
            FROM sales s
            LEFT JOIN (
              SELECT saleId, SUM(quantity) AS quantity
              FROM sale_items
              GROUP BY saleId
            ) si ON si.saleId = s.id
            WHERE ${activeSaleWhere('s')}
            GROUP BY s.platform
            ORDER BY orderCount DESC, revenue DESC
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `SELECT name FROM platforms WHERE isActive = 1 ORDER BY name ASC`,
          { type: QueryTypes.SELECT }
        ),
      ]);

      const rawSummary = (summaryRows[0] || {}) as any;
      const totalSales = Number(rawSummary.totalSales || 0);
      const totalRevenue = Number(rawSummary.totalRevenue || 0);
      const mappedSales = Number(rawSummary.mappedSales || 0);
      const resolvePlatformName = createPlatformNameResolver(
        masterPlatformRows.map((row: any) => String(row.name))
      );
      const platformsByName = new Map<string, {
        platformName: string;
        orderCount: number;
        revenue: number;
        quantitySold: number;
      }>();

      for (const row of rawPlatformRows as any[]) {
        const platformName = resolvePlatformName(row.platformName);
        const current = platformsByName.get(platformName) || {
          platformName,
          orderCount: 0,
          revenue: 0,
          quantitySold: 0,
        };
        current.orderCount += Number(row.orderCount || 0);
        current.revenue += Number(row.revenue || 0);
        current.quantitySold += Number(row.quantitySold || 0);
        platformsByName.set(platformName, current);
      }

      const topPlatforms = Array.from(platformsByName.values())
        .sort((left, right) => right.orderCount - left.orderCount || right.revenue - left.revenue)
        .slice(0, limit)
        .map((platform) => ({
          ...platform,
          averageOrderValue: platform.orderCount > 0
            ? Math.round((platform.revenue / platform.orderCount) * 100) / 100
            : 0,
          revenueShare: totalSales > 0 && totalRevenue > 0
            ? Math.round((platform.revenue / totalRevenue) * 10000) / 100
            : 0,
        }));

      successResponse(
        res,
        {
          period: { startDate, endDate },
          regionLevel,
          scope: scopeLevel && scopeRegionId
            ? { level: scopeLevel, regionId: scopeRegionId }
            : null,
          summary: {
            totalSales,
            totalRevenue,
            totalQuantitySold: Number(rawSummary.totalQuantitySold || 0),
            averageOrderValue: totalSales > 0 ? Math.round((totalRevenue / totalSales) * 100) / 100 : 0,
            totalProductsSold: Number(rawSummary.totalProductsSold || 0),
            totalVariantsSold: Number(rawSummary.totalVariantsSold || 0),
            totalRegionsCovered: Number(rawSummary.totalRegionsCovered || 0),
            totalPlatformsUsed: topPlatforms.length,
            mappedSales,
            unmappedSales: Math.max(totalSales - mappedSales, 0),
            mappingCoverage: totalSales > 0 ? Math.round((mappedSales / totalSales) * 10000) / 100 : 0,
          },
          topProducts: productRows.map((row: any) => ({
            ...row,
            quantitySold: Number(row.quantitySold || 0),
            orderCount: Number(row.orderCount || 0),
            revenue: Number(row.revenue || 0),
          })),
          topVariants: variantRows.map((row: any) => ({
            ...row,
            variantName: String(row.variantName || '-'),
            quantitySold: Number(row.quantitySold || 0),
            orderCount: Number(row.orderCount || 0),
            revenue: Number(row.revenue || 0),
          })),
          topRegions: regionRows.map((row: any) => ({
            ...row,
            regionName: formatRegionLabel(row.regionName),
            orderCount: Number(row.orderCount || 0),
            revenue: Number(row.revenue || 0),
            quantityPurchased: Number(row.quantityPurchased || 0),
          })),
          topPlatforms,
        },
        'Sales analytics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  },

  async getUnmappedSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = getDefaultDateRange(req);
      const regionLevel = parseRegionLevel(req.query.regionLevel) || 'province';
      const { level: scopeLevel, regionId: scopeRegionId } = getScope(req);
      const region = regionConfig[regionLevel];
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
      const scopeWhere = scopeLevel && scopeRegionId
        ? `AND s.${regionConfig[scopeLevel].saleColumn} = :scopeRegionId`
        : '';
      const replacements = { startDate, endDate, scopeRegionId, limit };

      const [countRows, sales] = await Promise.all([
        sequelize.query(
          `
            SELECT COUNT(*) AS total
            FROM sales s
            LEFT JOIN ${region.table} mapped
              ON mapped.id = s.${region.saleColumn}
              AND mapped.isActive = 1
            WHERE s.isInitialBalance = 0
              AND s.status NOT IN ('CANCELLED', 'REJECTED')
              AND DATE(s.saleDate) BETWEEN :startDate AND :endDate
              AND mapped.id IS NULL
              ${scopeWhere}
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
        sequelize.query(
          `
            SELECT
              s.id,
              s.saleNumber,
              s.saleDate,
              s.customerName,
              s.shippingAddress,
              s.shippingPostalCode
            FROM sales s
            LEFT JOIN ${region.table} mapped
              ON mapped.id = s.${region.saleColumn}
              AND mapped.isActive = 1
            WHERE s.isInitialBalance = 0
              AND s.status NOT IN ('CANCELLED', 'REJECTED')
              AND DATE(s.saleDate) BETWEEN :startDate AND :endDate
              AND mapped.id IS NULL
              ${scopeWhere}
            ORDER BY s.saleDate DESC, s.saleNumber ASC
            LIMIT :limit
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
      ]);

      const saleRows = sales as Array<{
        id: string;
        saleNumber: string;
        saleDate: Date;
        customerName: string | null;
        shippingAddress: string | null;
        shippingPostalCode: string | null;
      }>;
      const postalCodes = Array.from(new Set(
        saleRows
          .map((sale) => extractPostalCode(sale.shippingPostalCode) || extractPostalCode(sale.shippingAddress))
          .filter((postalCode): postalCode is string => Boolean(postalCode))
      ));

      const postalCandidates = postalCodes.length > 0
        ? await sequelize.query(
          `
            SELECT
              v.kodepos AS postalCode,
              v.label AS village,
              d.label AS district,
              k.label AS regency,
              p.label AS province
            FROM kelurahan v
            INNER JOIN kecamatan d ON d.id = v.kecamatan_id
            INNER JOIN kabupaten k ON k.id = v.kabupaten_id
            INNER JOIN provinsi p ON p.id = v.provinsi_id
            WHERE v.kodepos IN (:postalCodes)
              AND v.isActive = 1
              AND d.isActive = 1
              AND k.isActive = 1
              AND p.isActive = 1
          `,
          { replacements: { postalCodes }, type: QueryTypes.SELECT }
        ) as Array<{
          postalCode: string;
          village: string;
          district: string;
          regency: string;
          province: string;
        }>
        : [];

      const candidatesByPostalCode = new Map<string, typeof postalCandidates>();
      for (const candidate of postalCandidates) {
        candidatesByPostalCode.set(candidate.postalCode, [
          ...(candidatesByPostalCode.get(candidate.postalCode) || []),
          candidate,
        ]);
      }

      const getCandidateLabel = (candidate: typeof postalCandidates[number]) => {
        const village = formatRegionLabel(candidate.village);
        const district = formatRegionLabel(candidate.district);
        const regency = formatRegionLabel(candidate.regency);
        const province = formatRegionLabel(candidate.province);

        if (regionLevel === 'province') return province;
        if (regionLevel === 'regency') return `${regency}, ${province}`;
        if (regionLevel === 'district') {
          return `${district}, ${regency}, ${province}`;
        }
        return `${village}, ${district}, ${regency}, ${province}`;
      };

      const items = saleRows.map((sale) => {
        const postalCode = extractPostalCode(sale.shippingPostalCode)
          || extractPostalCode(sale.shippingAddress);
        const postalMatches = postalCode ? candidatesByPostalCode.get(postalCode) || [] : [];
        const candidates = Array.from(new Set(postalMatches.map(getCandidateLabel))).slice(0, 5);

        let reason = 'Nama wilayah tidak dikenali; periksa kemungkinan typo atau format alamat.';
        if (!sale.shippingAddress?.trim()) {
          reason = 'Alamat pengiriman kosong.';
        } else if (!postalCode) {
          reason = 'Kode pos 5 digit tidak ditemukan; periksa format alamat atau kemungkinan typo.';
        } else if (postalMatches.length === 0) {
          reason = 'Kode pos tidak tersedia di master wilayah atau kemungkinan salah ketik.';
        } else if (candidates.length > 1) {
          reason = `Kode pos digunakan oleh beberapa ${regionLabels[regionLevel]}; perlu verifikasi alamat.`;
        } else {
          reason = 'Kode pos dikenali dan data dapat dicoba dipetakan ulang.';
        }

        return {
          ...sale,
          postalCode,
          reason,
          candidates,
        };
      });

      successResponse(
        res,
        {
          regionLevel,
          total: Number((countRows[0] as any)?.total || 0),
          shown: items.length,
          items,
        },
        'Unmapped sales diagnostics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  },
};
