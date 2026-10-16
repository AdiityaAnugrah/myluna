import { websiteProductMap } from '../utils/websiteProductMap';
import { Op } from 'sequelize';
import { Product, ProductVariant, Sale, SaleItem } from '../models';
import { AppError } from '../utils/errors';

import { UUID, readWebsiteIdentities } from '../utils/websiteItemIdentities';
export { appendWebsiteIdentities, readWebsiteIdentities, WebsiteItemIdentity } from '../utils/websiteItemIdentities';

/** No fuzzy names and no automatic creation of master products. */
export async function resolveWebsiteProduct(item: any, transaction: any): Promise<Product> {
  const websiteId = String(item?.id || '').trim();
  if (!websiteId || websiteId.length > 100) throw new AppError('ID produk website tidak valid', 422);
  const mappedId = websiteProductMap()[websiteId];
  const explicitId = item.luna_product_id;
  if (explicitId !== undefined && (typeof explicitId !== 'string' || !UUID.test(explicitId))) {
    throw new AppError(`Identitas MyLuna tidak valid untuk produk ${websiteId}`, 422);
  }
  if (mappedId && (!UUID.test(mappedId) || (explicitId && mappedId !== explicitId))) {
    throw new AppError(`Pemetaan produk ${websiteId} bertentangan`, 409);
  }
  // Include explicit ID in the candidate set so conflicting SKU/mappings fail closed.
  const candidates = await Product.findAll({ where: { [Op.or]: [
    { sku: websiteId }, ...(UUID.test(websiteId) ? [{ id: websiteId }] : []),
    ...(explicitId || mappedId ? [{ id: explicitId || mappedId }] : []),
    { 'marketplaceLinks.websiteId': websiteId }, { 'marketplaceLinks.website_id': websiteId },
  ] }, transaction, lock: transaction.LOCK.UPDATE });
  if (candidates.length !== 1) throw new AppError(`Produk website ${websiteId} belum memiliki pemetaan MyLuna yang tunggal`, 422);
  const product = candidates[0];
  if ((explicitId || mappedId) && product.id !== (explicitId || mappedId)) {
    throw new AppError(`Pemetaan produk ${websiteId} bertentangan`, 409);
  }
  const linkedWebsiteId = product.marketplaceLinks?.websiteId || product.marketplaceLinks?.website_id;
  if (linkedWebsiteId && linkedWebsiteId !== websiteId && (explicitId || mappedId)) throw new AppError(`Produk ${websiteId} sudah terhubung ke ID website lain`, 409);
  if (product.isActive === false) throw new AppError(`Produk website ${websiteId} tidak aktif di MyLuna`, 422);
  return product;
}

export async function resolveWebsiteVariant(productId: string, item: any, legacyName: string, transaction: any): Promise<ProductVariant | null> {
  const variants = await ProductVariant.findAll({ where: { productId }, transaction, lock: transaction.LOCK.UPDATE });
  if (item.luna_variant_id !== undefined && item.luna_variant_id !== null) {
    if (typeof item.luna_variant_id !== 'string' || !UUID.test(item.luna_variant_id)) throw new AppError('ID varian MyLuna tidak valid', 422);
    const variant = variants.find(v => v.id === item.luna_variant_id);
    if (!variant) throw new AppError('Varian bukan milik produk pesanan atau sudah dihapus', 422);
    if (variants.filter(v => v.value === variant.value).length !== 1) throw new AppError('Nama varian master duplikat; perlu rekonsiliasi operator', 422);
    return variant;
  }
  if (item.luna_product_id && variants.length) throw new AppError('Snapshot pesanan wajib menyertakan ID varian MyLuna', 422);
  if (!variants.length) {
    if (legacyName && legacyName !== 'Default') throw new AppError('Varian pesanan belum terpetakan di MyLuna', 422);
    return null;
  }
  const matches = variants.filter(v => v.value === legacyName);
  if (matches.length !== 1) throw new AppError('Nama varian pesanan belum memiliki pemetaan tunggal', 422);
  return matches[0];
}

/** Restore using the frozen variant UUID, including after a variant rename. Legacy rows retain their old path. */
export async function originalSaleVariant(sale: { notes?: string | null }, item: { id: string; productId: string | null; variantName?: string | null }, transaction: any) {
  const identities = readWebsiteIdentities(sale.notes);
  if (identities) {
    const identity = identities.find(i => i.saleItemId === item.id);
    if (!identity || identity.productId !== item.productId) throw new AppError('Identitas stok pesanan tidak cocok', 409);
    if (!identity.variantId) return null;
    const variant = await ProductVariant.findOne({ where: { id: identity.variantId, productId: identity.productId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!variant) throw new AppError('Varian asli pesanan perlu direkonsiliasi sebelum stok dipulihkan', 409);
    return variant;
  }
  if (!item.productId) throw new AppError('Produk asli pesanan tidak tersedia', 409);
  if (!item.variantName) return null;
  const variants = await ProductVariant.findAll({ where: { productId: item.productId, value: item.variantName }, transaction, lock: transaction.LOCK.UPDATE });
  if (variants.length !== 1) throw new AppError('Varian stok lama perlu direkonsiliasi operator', 409);
  return variants[0];
}

export async function originalReturnVariant(item: { saleItemId: string; productId: string; variantName?: string | null }, transaction: any) {
  const original = await SaleItem.findByPk(item.saleItemId, { transaction });
  if (!original || original.productId !== item.productId) throw new AppError('Item retur tidak cocok dengan pesanan asli', 409);
  const sale = await Sale.findByPk(original.saleId, { transaction });
  if (!sale) throw new AppError('Pesanan asli retur belum ditemukan', 409);
  return originalSaleVariant(sale, original, transaction);
}
