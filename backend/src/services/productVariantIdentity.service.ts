import { ProductVariant } from '../models';
import { AppError } from '../utils/errors';

/** Edits retain UUIDs. Destructive variant removal requires a separate archival workflow. */
export async function updateProductVariantsPreservingIdentity(productId: string, input: unknown, transaction: any) {
  if (!Array.isArray(input)) throw new AppError('Daftar varian tidak valid', 422);
  const existing = await ProductVariant.findAll({ where: { productId }, transaction, lock: transaction.LOCK.UPDATE });
  const usedIds = new Set<string>();
  const usedValues = new Set<string>();
  const plan = input.map(raw => {
    if (!raw || typeof raw !== 'object') throw new AppError('Varian tidak valid', 422);
    const value = String(raw.value || '').trim();
    const stock = Number(raw.stock ?? 0);
    const adjustment = Number(raw.priceAdjustment ?? 0);
    if (!value || value.length > 255 || usedValues.has(value) || !Number.isSafeInteger(stock) || stock < 0
      || !Number.isFinite(adjustment)) throw new AppError('Nama, stok, atau harga varian tidak valid/duplikat', 422);
    usedValues.add(value);
    let current: ProductVariant | undefined;
    if (raw.id) {
      current = existing.find(v => v.id === raw.id);
      if (!current) throw new AppError('ID varian bukan milik produk ini. Muat ulang data produk.', 409);
    } else {
      const matches = existing.filter(v => v.value === value);
      if (matches.length > 1) throw new AppError('Nama varian lama duplikat; perlu rekonsiliasi operator', 409);
      current = matches[0];
    }
    if (current) {
      if (usedIds.has(current.id)) throw new AppError('ID varian duplikat', 422);
      usedIds.add(current.id);
    }
    return { current, values: { name: String(raw.name || value).trim(), value, stock: current ? current.stock : 0, priceAdjustment: adjustment } };
  });
  if (existing.some(v => !usedIds.has(v.id))) {
    throw new AppError('Varian lama harus tetap disertakan. Penghapusan varian memerlukan pemeriksaan riwayat transaksi terpisah.', 409);
  }
  for (const change of plan) {
    if (change.current) await change.current.update(change.values, { transaction });
    else await ProductVariant.create({ productId, ...change.values }, { transaction });
  }
}
