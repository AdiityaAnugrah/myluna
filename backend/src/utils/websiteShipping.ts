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
  if (!allowed[status]?.includes(shippingStatus)) {
    throw new AppError('Status pengiriman website tidak valid', 400);
  }
  const courier = String(body.courier || '').trim();
  const awb = String(body.tracking_number || '').trim();
  if (!courier || courier.length > 255 || awb.length > 120 || /[<>\[\]\x00-\x1F\x7F]/.test(courier + awb)
    || (!awb && status !== 'Proses') || (awb && /menunggu|^(kosong|none|null|n\/a|-)$/i.test(awb))) {
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
  const lines = [START, `Status: ${shippingStatus}`, `Kurir: ${internal ? 'Jasa Kirim Toko' : clean(courier)}`];
  if (awb) lines.push(`${internal ? 'Resi internal toko' : 'Resi'}: ${clean(awb)}`);
  if (body.shipping_revision !== null && body.shipping_revision !== undefined && body.shipping_revision !== '') {
    const revision = String(body.shipping_revision);
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(revision)) throw new AppError('Revisi pengiriman tidak valid', 400);
    lines.push(`Revisi website: ${revision}`);
  }
  if (body.service_name) lines.push(`Layanan: ${clean(String(body.service_name))}`);
  if (typeof cost === 'number') lines.push(`Ongkir: Rp ${cost.toLocaleString('id-ID')}`);
  lines.push(END);
  const original = (oldNotes || '').replace(blockPattern, '').trim();
  if (body.shipping_pricing && Number((body.shipping_pricing as Record<string, unknown>).payable_cost) !== cost) {
    throw new AppError('Ongkir pengiriman berbeda dengan rincian pesanan', 400);
  }
  return websiteShippingPricingNotes(body.shipping_pricing, [original, lines.join('\n')].filter(Boolean).join('\n\n'));
}


export function websiteShippingReference(notes: string | null) {
  const block = (notes || '').match(blockPattern)?.[0] || '';
  const field = (name: string) => block.match(new RegExp('(?:^|\\n)' + name + ':[ \\t]*([^\\n]+)'))?.[1]?.trim() || '';
  return { awb: field('Resi(?: internal toko)?'), courier: field('Kurir'), service: field('Layanan'), revision: field('Revisi website') };
}

/** Lock the Sale before calling. A stale resend must never silently overwrite a newer AWB. */
export function assertWebsiteShippingReferenceChange(body: Record<string, unknown>, saleStatus: string, oldNotes: string | null): boolean {
  const previous = websiteShippingReference(oldNotes);
  const awb = String(body.tracking_number || '').trim();
  const courier = body.shipping_method_code === 'internal_delivery' ? 'Jasa Kirim Toko' : String(body.courier || '').trim();
  const serviceChanged = body.service_name !== undefined && String(body.service_name || '').trim() !== previous.service;
  const changed = previous.awb !== awb || previous.courier !== courier || serviceChanged;
  const incomingRevision = String(body.shipping_revision || '');
  if (previous.revision && incomingRevision && incomingRevision < previous.revision) throw new AppError('Revisi pengiriman lama ditolak.', 409);
  if (!changed) return false;
  const firstAwbAfterProcessing = saleStatus === 'PROCESSED' && !previous.awb && !!awb && previous.courier === courier && !serviceChanged;
  if (!['WAITING_APPROVAL', 'APPROVED'].includes(saleStatus) && !firstAwbAfterProcessing) throw new AppError('Resi/ekspedisi pesanan yang sudah diproses TCP tidak boleh diganti melalui sinkron ulang.', 409);
  if (previous.awb) {
    const revision = String(body.shipping_revision || '');
    if (!previous.revision || !revision || revision <= previous.revision) throw new AppError('Revisi pengiriman lama atau tidak tersedia. Simpan ulang resi terbaru sebelum sinkron.', 409);
  }
  return true;
}

export function websitePreparedResyncNotes(body: Record<string, unknown>, saleStatus: string, oldNotes: string | null): string {
  // A delayed no-AWB review resend must not clear a resi entered later.
  if (!String(body.tracking_number || '').trim() && websiteShippingReference(oldNotes).awb) return websiteShippingPricingNotes(body.shipping_pricing, oldNotes);
  if (!assertWebsiteShippingReferenceChange(body, saleStatus, oldNotes)) {
    const previous = websiteShippingReference(oldNotes);
    const incomingRevision = String(body.shipping_revision || '');
    const prepared = (oldNotes || '').match(blockPattern)?.[0]?.includes('Status: Disiapkan');
    if (['WAITING_APPROVAL', 'APPROVED'].includes(saleStatus) && prepared && incomingRevision > previous.revision) {
      return websiteShippingNotes({ ...body, status: 'Proses', shipping_status: 'Disiapkan' }, oldNotes);
    }
    return websiteShippingPricingNotes(body.shipping_pricing, oldNotes);
  }
  return websiteShippingNotes({ ...body, status: 'Proses', shipping_status: 'Disiapkan' }, oldNotes);
}


export function assertWebsitePrintConfirmation(platform: string, notes: string | null, input: Record<string, unknown>) {
  if (platform !== 'WEBSITE') return;
  const block = (notes || '').match(blockPattern)?.[0] || '';
  if (input.printConfirmed !== true) throw new AppError('Konfirmasi hasil cetak diperlukan sebelum memproses pesanan website.', 422);
  if (!block || input.expectedWebsiteShipping !== block) throw new AppError('Resi atau rincian pengiriman berubah sejak cetak dibuka. Muat ulang dan cetak ulang sebelum konfirmasi.', 409);
}
