import { AppError } from './errors';

const START = '[Pengiriman Website]';
const END = '[/Pengiriman Website]';
const blockPattern = /\[Pengiriman Website\][\s\S]*?\[\/Pengiriman Website\]/g;

export function websiteShippingPricingNotes(raw: unknown, oldNotes: string | null): string {
  if (raw === null || raw === undefined) return oldNotes || '';
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new AppError('Rincian ongkir tidak valid', 400);
  const p = raw as Record<string, unknown>;
  const amounts = [p.original_cost, p.subsidy_amount, p.payable_cost];
  if (p.currency !== 'IDR' || amounts.some(v => typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0 || v > 2000000000)
      || Number(p.subsidy_amount) + Number(p.payable_cost) !== p.original_cost) {
    throw new AppError('Tarif asli, subsidi, dan ongkir pembeli tidak sesuai', 400);
  }
  const block = ['[Rincian Ongkir Website]',
    `Tarif ekspedisi asli: Rp ${Number(p.original_cost).toLocaleString('id-ID')}`,
    `Subsidi ditanggung toko: Rp ${Number(p.subsidy_amount).toLocaleString('id-ID')}`,
    `Ongkir dibayar pembeli: Rp ${Number(p.payable_cost).toLocaleString('id-ID')}`,
    '[/Rincian Ongkir Website]'].join('\n');
  const previous = (oldNotes || '').match(/\[Rincian Ongkir Website\][\s\S]*?\[\/Rincian Ongkir Website\]/)?.[0];
  if (previous && previous !== block) throw new AppError('Rincian ongkir pesanan sudah tercatat dan tidak boleh berubah lewat sinkronisasi', 409);
  return previous ? oldNotes || '' : [oldNotes?.trim(), block].filter(Boolean).join('\n\n');
}

export function websiteShippingNotes(body: Record<string, unknown>, oldNotes: string | null): string {
  const status = String(body.status || '');
  const shippingStatus = String(body.shipping_status || '');
  const internal = body.shipping_method_code === 'internal_delivery';
  const allowed: Record<string, string[]> = {
    Proses: ['Disiapkan'],
    Dikirim: ['Dalam Pengiriman', 'Gagal Kirim'],
    Selesai: ['Terkirim'],
  };
  if (!allowed[status]?.includes(shippingStatus) || (!internal && shippingStatus === 'Disiapkan')) {
    throw new AppError('Status pengiriman website tidak valid', 400);
  }
  const courier = String(body.courier || '').trim();
  const awb = String(body.tracking_number || '').trim();
  if (!courier || courier.length > 255 || awb.length > 120 || /[\x00-\x1F\x7F]/.test(courier + awb)
    || (internal && awb !== '') || (!internal && (!awb || /^(kosong|menunggu)/i.test(awb)))) {
    throw new AppError('Kurir atau nomor resi tidak valid', 400);
  }
  const previous = (oldNotes || '').match(blockPattern)?.[0] || '';
  if ((previous.includes('Status: Terkirim') && shippingStatus !== 'Terkirim')
    || (previous.includes('Status: Dalam Pengiriman') && shippingStatus === 'Disiapkan')
    || (previous.includes('Status: Gagal Kirim') && shippingStatus === 'Disiapkan')) {
    throw new AppError('Pembaruan pengiriman lama diabaikan; status sudah lebih lanjut', 409);
  }
  const cost = body.shipping_cost;
  if (cost !== null && cost !== undefined && (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost < 0)) {
    throw new AppError('Nominal ongkir tidak valid', 400);
  }
  const clean = (text: string) => text.replace(/[\[\]]/g, ' ');
  const lines = [START, `Status: ${shippingStatus}`, `Kurir: ${internal ? 'Jasa Kirim Toko' : clean(courier)}`,
    `Resi: ${internal ? 'Tanpa resi eksternal' : clean(awb)}`];
  if (typeof cost === 'number') lines.push(`Ongkir: Rp ${cost.toLocaleString('id-ID')}`);
  lines.push(END);
  const original = (oldNotes || '').replace(blockPattern, '').trim();
  if (body.shipping_pricing && Number((body.shipping_pricing as Record<string, unknown>).payable_cost) !== cost) {
    throw new AppError('Ongkir pengiriman berbeda dengan rincian pesanan', 400);
  }
  return websiteShippingPricingNotes(body.shipping_pricing, [original, lines.join('\n')].filter(Boolean).join('\n\n'));
}
