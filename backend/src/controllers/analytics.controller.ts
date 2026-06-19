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

function normalizeDate(value: unknown, fallback: string) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export const analyticsController = {
  async getSalesAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const defaultStart = firstDay.toISOString().slice(0, 10);
      const defaultEnd = now.toISOString().slice(0, 10);
      const startDate = normalizeDate(req.query.startDate, defaultStart);
      const endDate = normalizeDate(req.query.endDate, defaultEnd);
      const requestedLevel = String(req.query.regionLevel || 'province') as RegionLevel;
      const regionLevel = regionConfig[requestedLevel] ? requestedLevel : 'province';
      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
      const region = regionConfig[regionLevel];

      const replacements = { startDate, endDate, limit };
      const activeSaleWhere = `
        s.isInitialBalance = 0
        AND s.status NOT IN ('CANCELLED', 'REJECTED')
        AND DATE(s.saleDate) BETWEEN :startDate AND :endDate
      `;

      const [summaryRows, productRows, regionRows] = await Promise.all([
        sequelize.query(
          `
            SELECT
              COUNT(DISTINCT s.id) AS totalSales,
              COALESCE(SUM(s.totalAmount), 0) AS totalRevenue,
              COUNT(DISTINCT CASE WHEN s.shippingProvinceId IS NOT NULL THEN s.id END) AS mappedSales
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
};
