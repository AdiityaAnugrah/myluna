import { AppError } from './errors';

export function websiteProductMap(): Record<string, string> {
  const raw = process.env.LUNA_WEB_PRODUCT_MAP;
  if (!raw) return {};
  try {
    const map = JSON.parse(raw);
    if (!map || Array.isArray(map) || typeof map !== 'object') throw new Error('Invalid map');
    const masterIds = new Set<string>();
    for (const [websiteId, masterId] of Object.entries(map)) {
      if (!websiteId.trim() || websiteId !== websiteId.trim() || websiteId.length > 100 || typeof masterId !== 'string'
        || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(masterId) || masterIds.has(masterId.toLowerCase())) throw new Error('Invalid map');
      masterIds.add(masterId.toLowerCase());
    }
    return map;
  } catch (_) { throw new AppError('Konfigurasi pemetaan produk perlu diperiksa operator', 422); }
}

export function websiteIdForMaster(product: { id: string; sku: string; marketplaceLinks?: any }): string {
  const links = product.marketplaceLinks || {};
  if (links.websiteId && links.website_id && links.websiteId !== links.website_id) throw new AppError('Pemetaan website pada master produk bertentangan', 409);
  const linked = links.websiteId || links.website_id;
  const configured = Object.entries(websiteProductMap()).find(([, id]) => id === product.id)?.[0];
  if (linked && configured && linked !== configured) throw new AppError('Pemetaan konfigurasi dan master produk bertentangan', 409);
  return linked || configured || product.sku;
}
