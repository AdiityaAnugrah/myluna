import { Request, Response, NextFunction } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database';
import { successResponse } from '../utils/response';

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

export const analyticsController = {
  async getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = getDefaultDateRange(req);
      const regionLevel = parseRegionLevel(req.query.regionLevel) || 'province';
      const { level: scopeLevel, regionId: scopeRegionId } = getScope(req);
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const region = regionConfig[regionLevel];

      const replacements = { startDate, endDate, limit, scopeRegionId };
      const scopeWhere = scopeLevel && scopeRegionId
        ? `AND s.${regionConfig[scopeLevel].saleColumn} = :scopeRegionId`
        : '';
      const activeSaleWhere = `
        s.isInitialBalance = 0
        AND s.status NOT IN ('CANCELLED', 'REJECTED')
        AND DATE(s.saleDate) BETWEEN :startDate AND :endDate
        ${scopeWhere}
      `;

      const [summaryRows, productRows, regionRows] = await Promise.all([
        sequelize.query(
          `
            SELECT
              COUNT(DISTINCT s.id) AS totalSales,
              COALESCE(SUM(s.totalAmount), 0) AS totalRevenue,
              COUNT(DISTINCT CASE WHEN s.${region.saleColumn} IS NOT NULL THEN s.id END) AS mappedSales
            FROM sales s
            WHERE ${activeSaleWhere}
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
            WHERE ${activeSaleWhere}
            GROUP BY p.id, p.name, p.sku
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
            LEFT JOIN (
              SELECT saleId, SUM(quantity) AS quantity
              FROM sale_items
              GROUP BY saleId
            ) si ON si.saleId = s.id
            WHERE ${activeSaleWhere}
            GROUP BY r.id, r.label
            ORDER BY orderCount DESC, revenue DESC
            LIMIT :limit
          `,
          { replacements, type: QueryTypes.SELECT }
        ),
      ]);

      const rawSummary = (summaryRows[0] || {}) as any;
      const totalSales = Number(rawSummary.totalSales || 0);
      const mappedSales = Number(rawSummary.mappedSales || 0);

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
            totalRevenue: Number(rawSummary.totalRevenue || 0),
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
          topRegions: regionRows.map((row: any) => ({
            ...row,
            orderCount: Number(row.orderCount || 0),
            revenue: Number(row.revenue || 0),
            quantityPurchased: Number(row.quantityPurchased || 0),
          })),
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
            WHERE s.isInitialBalance = 0
              AND s.status NOT IN ('CANCELLED', 'REJECTED')
              AND DATE(s.saleDate) BETWEEN :startDate AND :endDate
              AND s.${region.saleColumn} IS NULL
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
            WHERE s.isInitialBalance = 0
              AND s.status NOT IN ('CANCELLED', 'REJECTED')
              AND DATE(s.saleDate) BETWEEN :startDate AND :endDate
              AND s.${region.saleColumn} IS NULL
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
        if (regionLevel === 'province') return candidate.province;
        if (regionLevel === 'regency') return `${candidate.regency}, ${candidate.province}`;
        if (regionLevel === 'district') {
          return `${candidate.district}, ${candidate.regency}, ${candidate.province}`;
        }
        return `${candidate.village}, ${candidate.district}, ${candidate.regency}, ${candidate.province}`;
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
