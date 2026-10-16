import { AppError } from './errors';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIX = '[LUNA_ITEM_IDENTITIES_V1:';
export type WebsiteItemIdentity = { saleItemId: string; websiteId: string; productId: string; variantId: string | null };

export function readWebsiteIdentities(notes: string | null | undefined): WebsiteItemIdentity[] | null {
  if (!notes?.includes(PREFIX)) return null;
  const matches = [...notes.matchAll(/\[LUNA_ITEM_IDENTITIES_V1:([A-Za-z0-9+/=]+)\]/g)];
  if (matches.length !== 1) throw new AppError('Snapshot identitas produk perlu diperiksa operator', 409);
  try {
    const items = JSON.parse(Buffer.from(matches[0][1], 'base64').toString('utf8'));
    if (!Array.isArray(items) || !items.length || items.some(i => !UUID.test(i.saleItemId) || !UUID.test(i.productId)
      || typeof i.websiteId !== 'string' || !i.websiteId || (i.variantId !== null && !UUID.test(i.variantId)))
      || new Set(items.map(i => i.saleItemId)).size !== items.length) throw new Error('Invalid identities');
    return items;
  } catch (_) { throw new AppError('Snapshot identitas produk perlu diperiksa operator', 409); }
}

export function appendWebsiteIdentities(notes: string, identities: WebsiteItemIdentity[]): string {
  if (notes.includes(PREFIX)) throw new AppError('Snapshot identitas sudah tersedia', 409);
  const result = `${notes}\n${PREFIX}${Buffer.from(JSON.stringify(identities)).toString('base64')}]`;
  readWebsiteIdentities(result);
  // Existing notes is TEXT. Fail rather than truncate an immutable identity snapshot.
  if (Buffer.byteLength(result, 'utf8') > 60000) throw new AppError('Rincian pesanan melebihi kapasitas snapshot', 422);
  return result;
}

/** Keep the immutable block when an operator edits ordinary notes. Never accept a replacement block. */
export function preserveWebsiteIdentities(previous: string | null, incoming: string | null): string | null {
  const original = readWebsiteIdentities(previous);
  if (!original) {
    if (incoming?.includes(PREFIX)) throw new AppError('Snapshot identitas hanya dibuat melalui integrasi pesanan', 409);
    return incoming;
  }
  const oldBlock = previous!.match(/\[LUNA_ITEM_IDENTITIES_V1:[A-Za-z0-9+/=]+\]/)![0];
  const proposed = readWebsiteIdentities(incoming);
  if (proposed && JSON.stringify(proposed) !== JSON.stringify(original)) throw new AppError('Snapshot identitas pesanan bersifat tetap', 409);
  const notes = (incoming || '').replace(/\[LUNA_ITEM_IDENTITIES_V1:[A-Za-z0-9+/=]+\]/g, '').trim();
  const result = `${notes}\n${oldBlock}`;
  if (Buffer.byteLength(result, 'utf8') > 60000) throw new AppError('Catatan pesanan melebihi kapasitas', 422);
  return result;
}
