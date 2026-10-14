import { AppError } from './errors';

const START = '[Pengiriman Website]';
const END = '[/Pengiriman Website]';
const blockPattern = /\[Pengiriman Website\][\s\S]*?\[\/Pengiriman Website\]/g;

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
  return [original, lines.join('\n')].filter(Boolean).join('\n\n');
}
