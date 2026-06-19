const legacyPlatformNames: Record<string, string> = {
  TOKOPEDIA: 'Tokopedia',
  SHOPEE: 'Shopee',
  TIKTOK_SHOP: 'TikTok Shop',
  LAZADA: 'Lazada',
  OTHER: 'Lainnya',
};

export function normalizePlatformKey(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

export function createPlatformNameResolver(masterNames: string[]) {
  const masterNamesByKey = new Map(
    masterNames.map((name) => [normalizePlatformKey(name), name])
  );

  return (rawName: unknown) => {
    const raw = String(rawName || '').trim();
    const key = normalizePlatformKey(raw);
    const exactMasterName = masterNamesByKey.get(key);
    if (exactMasterName) return exactMasterName;

    if (key === 'OFFLINE_STORE' || key === 'TOKO_OFFLINE') {
      return masterNamesByKey.get('WEBSITE')
        || masterNamesByKey.get('TOKO_OFFLINE')
        || 'Toko Offline';
    }

    return legacyPlatformNames[key] || raw || 'Tanpa Platform';
  };
}
