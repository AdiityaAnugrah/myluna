/** Pure receipt display rules; no mutations or provider calls. */
export type ReceiptSale = { platform?: string; notes?: string | null; saleDate?: string | null; createdAt?: string | null; status?: string; isCancelPending?: boolean };

export function websiteShippingBlock(sale: ReceiptSale): string {
  return sale.notes?.match(/\[Pengiriman Website\][\s\S]*?\[\/Pengiriman Website\]/)?.[0] || '';
}

export function websiteAwb(sale: ReceiptSale): string {
  if (String(sale.platform) !== 'WEBSITE') return '';
  const block = sale.notes?.match(/\[Pengiriman Website\]([\s\S]*?)\[\/Pengiriman Website\]/)?.[1] || '';
  return block.match(/(?:^|\n)Resi(?: internal toko)?:[ \t]*([^\n]+)/)?.[1]?.trim() || '';
}

export function receiptTransactionDate(sale: ReceiptSale): { label: string; value: string } {
  const original = sale.saleDate;
  const raw = original || (String(sale.platform) !== 'WEBSITE' ? sale.createdAt : null);
  const label = original || String(sale.platform) === 'WEBSITE' ? 'Tanggal transaksi' : 'Tanggal pencatatan';
  if (!raw) return { label, value: 'Belum tersedia' };
  // Legacy naive date strings are WIB; never let the browser timezone reinterpret them.
  const normalized = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw) ? raw.replace(' ', 'T') + '+07:00' : raw;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return { label, value: 'Tanggal perlu diperiksa' };
  return { label, value: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short', hour12: false }).format(date) + ' WIB' };
}

export function canPrintAwbBarcode(awb: string): boolean {
  // Long/non-ASCII resi stays complete as text, rather than an unreadable or overflowing barcode.
  return awb.length > 0 && awb.length <= 40 && /^[\x20-\x7E]+$/.test(awb);
}

export function needsProcessingConfirmation(sale: ReceiptSale): boolean {
  return !sale.isCancelPending && ['WAITING_APPROVAL', 'APPROVED'].includes(sale.status || '');
}
