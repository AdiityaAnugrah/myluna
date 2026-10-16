import { createHash } from 'crypto';
import { AppError } from './errors';

const PREFIX = '[LUNA_WEB_ORDER_V1:';
export const validWebsiteOrderId = (id: string) => /^L[A-Za-z0-9_-]{1,49}$/.test(id);

/** Leave room for the existing cancellation suffix in sales.saleNumber VARCHAR(50). */
export function websiteInternalSaleNumber(orderId: string): string {
  if (!validWebsiteOrderId(orderId)) throw new AppError('Nomor pesanan website tidak valid', 422);
  const readable = `LWEB-${orderId}`;
  return readable.length <= 25 ? readable : `LWEB-${createHash('sha256').update(orderId).digest('hex').slice(0, 20)}`;
}

export function readWebsiteOrderReference(notes?: string | null): string | null {
  if (!notes?.includes(PREFIX)) return null;
  const matches = [...notes.matchAll(/\[LUNA_WEB_ORDER_V1:([A-Za-z0-9+/=]+)\]/g)];
  try {
    if (matches.length !== 1) throw new Error('Ambiguous reference');
    const value = JSON.parse(Buffer.from(matches[0][1], 'base64').toString('utf8'));
    if (value.version !== 1 || value.source !== 'lunareafurniture.com' || typeof value.order_id !== 'string'
      || !validWebsiteOrderId(value.order_id)) throw new Error('Invalid reference');
    return value.order_id;
  } catch { throw new AppError('Identitas sumber pesanan perlu diperiksa operator', 409); }
}

export function appendWebsiteOrderReference(notes: string, orderId: string): string {
  websiteInternalSaleNumber(orderId);
  if (notes.includes(PREFIX)) throw new AppError('Referensi sumber sudah tersedia', 409);
  const value = { version: 1, source: 'lunareafurniture.com', order_id: orderId };
  const result = `${notes}\n${PREFIX}${Buffer.from(JSON.stringify(value)).toString('base64')}]`;
  if (Buffer.byteLength(result, 'utf8') > 60000) throw new AppError('Catatan pesanan melebihi kapasitas', 422);
  return result;
}

export function preserveWebsiteOrderReference(previous?: string | null, incoming?: string | null): string | null {
  const original = readWebsiteOrderReference(previous);
  const proposed = readWebsiteOrderReference(incoming);
  if (!original) {
    if (proposed) throw new AppError('Referensi sumber hanya dibuat melalui integrasi', 409);
    return incoming ?? null;
  }
  if (proposed && proposed !== original) throw new AppError('Referensi sumber pesanan bersifat tetap', 409);
  const result = proposed ? incoming! : `${incoming || ''}\n${previous!.match(/\[LUNA_WEB_ORDER_V1:[A-Za-z0-9+/=]+\]/)![0]}`;
  if (Buffer.byteLength(result, 'utf8') > 60000) throw new AppError('Catatan pesanan melebihi kapasitas', 422);
  return result;
}

type ReferencedSale = { saleNumber: string; platform: unknown; notes?: string | null };
export function websiteExternalOrderId(sale: ReferencedSale): string {
  if (String(sale.platform) !== 'WEBSITE') throw new AppError('Transaksi bukan berasal dari website', 409);
  const reference = readWebsiteOrderReference(sale.notes);
  if (!reference) {
    if (!validWebsiteOrderId(sale.saleNumber) || sale.saleNumber.startsWith('LWEB-')) throw new AppError('Referensi website belum terverifikasi', 409);
    return sale.saleNumber; // Existing WEBSITE orders retain their original key.
  }
  const expected = websiteInternalSaleNumber(reference);
  if (sale.saleNumber !== expected && !new RegExp(`^${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(?:CANCELLED|REJECTED)-[0-9]+$`).test(sale.saleNumber)) {
    throw new AppError('Nomor internal dan referensi website bertentangan', 409);
  }
  return reference;
}
