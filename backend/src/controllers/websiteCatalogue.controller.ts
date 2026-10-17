import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Product, ProductVariant } from '../models';
import { websiteProductMap } from '../utils/websiteProductMap';
import { AppError } from '../utils/errors';

/** Read-only projection for trusted website admins. Never returns stock, costs or secrets. */
export async function websiteCatalogue(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  const expected = Buffer.from(process.env.LUNA_WEB_ORDER_TOKEN || '');
  const actual = Buffer.from(String(req.headers['x-luna-webhook-token'] || ''));
  if (!expected.length || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return res.status(401).json({ success: false, message: 'Akses integrasi diperlukan.' });
  }
  try {
    const id = req.query.product_id;
    if (id !== undefined && (typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))) {
      throw new AppError('ID produk tidak valid.', 422);
    }
    const map = websiteProductMap();
    const products = await Product.findAll({
      attributes: ['id', 'sku', 'name', 'isActive', 'marketplaceLinks', 'stock'],
      ...(id ? { where: { id } } : {}),
      include: [{ model: ProductVariant, as: 'variantItems', attributes: ['id', 'value'] }],
      order: [['id', 'ASC']], limit: id ? 1 : 2001,
    });
    if (products.length > 2000) throw new AppError('Katalog melebihi batas review. Hubungi pengelola sistem.', 422);
    const data = products.map(product => {
      const row = product.toJSON() as any;
      const linked = row.marketplaceLinks || {};
      const websiteIds = new Set<string>();
      for (const value of [linked.websiteId, linked.website_id, ...Object.entries(map).filter(([, value]) => value === row.id).map(([key]) => key)]) {
        if (typeof value === 'string' && value) websiteIds.add(value);
      }
      return { id: row.id, sku: row.sku, name: row.name, active: !!row.isActive, stock: Number(row.stock),
        website_ids: [...websiteIds].sort(),
        variants: (row.variantItems || []).map((v: any) => ({ id: v.id, value: v.value, stock: Number(v.stock) })).sort((a: any, b: any) => a.id.localeCompare(b.id)) };
    });
    return res.json({ success: true, data: { products: data, complete: true } });
  } catch (error) { return next(error); }
}
