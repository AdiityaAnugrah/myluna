import { websiteShippingNotes, websiteShippingPricingNotes, websitePreparedResyncNotes, websiteShippingReference, assertWebsitePrintConfirmation } from '../src/utils/websiteShipping';

const shipment = { status: 'Dikirim', shipping_status: 'Dalam Pengiriman', courier: 'JNE', tracking_number: 'TEST12345', shipping_cost: 25000 };

describe('website shipping updates', () => {
  test('preserves operator notes and is idempotent', () => {
    const notes = websiteShippingNotes(shipment, 'Catatan admin tetap ada');
    expect(notes).toContain('Catatan admin tetap ada');
    expect(notes).toContain('TEST12345');
    expect(websiteShippingNotes(shipment, notes)).toBe(notes);
  });
  test('internal delivery keeps admin-supplied internal AWB', () => {
    const notes = websiteShippingNotes({ ...shipment, courier: 'Jasa Kirim Toko', shipping_method_code: 'internal_delivery', tracking_number: 'TOKO-227', shipping_cost: 0 }, null);
    expect(notes).toContain('Resi internal toko: TOKO-227');
    expect(() => websiteShippingNotes({ ...shipment, shipping_method_code: 'internal_delivery', tracking_number: '' }, null)).toThrow();
    expect(notes).toContain('Rp 0');
  });
  test('rejects negative costs, missing AWB and inconsistent statuses', () => {
    expect(() => websiteShippingNotes({ ...shipment, shipping_cost: -1 }, null)).toThrow();
    expect(() => websiteShippingNotes({ ...shipment, tracking_number: '' }, null)).toThrow();
    expect(() => websiteShippingNotes({ ...shipment, status: 'Proses' }, null)).toThrow();
  });
  test('delivered shipments cannot regress', () => {
    const notes = websiteShippingNotes({ ...shipment, status: 'Selesai', shipping_status: 'Terkirim' }, null);
    expect(() => websiteShippingNotes(shipment, notes)).toThrow();
  });
  test('updates replace only the shipping block', () => {
    const notes = websiteShippingNotes(shipment, 'Catatan admin');
    const updated = websiteShippingNotes({ ...shipment, tracking_number: 'TEST67890' }, notes);
    expect(updated).toContain('TEST67890');
    expect(updated).not.toContain('TEST12345');
    expect(updated).toContain('Catatan admin');
  });
  test('subsidy breakdown is recorded independently and remains immutable', () => {
    const pricing = { currency: 'IDR', original_cost: 100000, subsidy_amount: 10000, payable_cost: 90000 };
    const notes = websiteShippingPricingNotes(pricing, 'Catatan admin');
    expect(notes).toContain('Subsidi ditanggung toko: Rp 10.000');
    expect(websiteShippingPricingNotes(pricing, notes)).toBe(notes);
    expect(() => websiteShippingPricingNotes({ ...pricing, subsidy_amount: 20000, payable_cost: 80000 }, notes)).toThrow();
    expect(() => websiteShippingPricingNotes({ ...pricing, subsidy_amount: -1 }, null)).toThrow();
    expect(() => websiteShippingNotes({ ...shipment, shipping_cost: 90000, shipping_pricing: { ...pricing, payable_cost: 123 } }, null)).toThrow();
  });
});


describe('website AWB resync policy', () => {
  const prepared = { status: 'Proses', shipping_status: 'Disiapkan', courier: 'JNE', tracking_number: 'OLD227', shipping_revision: '2026-10-15 14:00:00', shipping_cost: 25000 };
  const old = websiteShippingNotes(prepared, 'Catatan operator');
  test('waiting sale accepts a newer AWB without changing unrelated notes', () => {
    const updated = websitePreparedResyncNotes({ ...prepared, tracking_number: 'NEW227', shipping_revision: '2026-10-15 14:01:00' }, 'WAITING_APPROVAL', old);
    expect(websiteShippingReference(updated).awb).toBe('NEW227');
    expect(updated).toContain('Catatan operator');
    expect(updated).not.toContain('OLD227');
  });
  test.each(['PROCESSED', 'SETTLED', 'COMPLETED'])('processed sale %s rejects changed AWB', status => {
    expect(() => websitePreparedResyncNotes({ ...prepared, tracking_number: 'NEW227', shipping_revision: '2026-10-15 14:01:00' }, status, old)).toThrow();
  });
  test.each(['2026-10-15 13:59:00', '2026-10-15 14:00:00', ''])('stale revision %s cannot replace resi', revision => {
    expect(() => websitePreparedResyncNotes({ ...prepared, tracking_number: 'NEW227', shipping_revision: revision }, 'WAITING_APPROVAL', old)).toThrow();
  });
  test('identical replay preserves shipping progress even after processing', () => {
    const dispatched=websiteShippingNotes({ ...prepared, status: 'Dikirim', shipping_status: 'Dalam Pengiriman' }, old);
    expect(websitePreparedResyncNotes(prepared,'PROCESSED',dispatched)).toBe(dispatched);
  });
  test('internal store AWB is parsed separately', () => {
    const note=websiteShippingNotes({ ...prepared, courier: 'Jasa Kirim Toko', shipping_method_code: 'internal_delivery', tracking_number: 'TOKO227' }, null);
    expect(websiteShippingReference(note).awb).toBe('TOKO227');
  });
});


describe('website print confirmation', () => {
  const notes=websiteShippingNotes({ status:'Proses', shipping_status:'Disiapkan', courier:'JNE', tracking_number:'AWB227' },null);
  const block=notes.match(/\[Pengiriman Website\][\s\S]*?\[\/Pengiriman Website\]/)![0];
  test('opening/cancelling print does not authorize processing',()=> {
    expect(()=>assertWebsitePrintConfirmation('WEBSITE',notes,{})).toThrow();
    expect(()=>assertWebsitePrintConfirmation('WEBSITE',notes,{printConfirmed:false,expectedWebsiteShipping:block})).toThrow();
  });
  test('explicit confirmation of current shipping snapshot is accepted',()=> {
    expect(()=>assertWebsitePrintConfirmation('WEBSITE',notes,{printConfirmed:true,expectedWebsiteShipping:block})).not.toThrow();
  });
  test('changed resi invalidates an older print confirmation',()=> {
    expect(()=>assertWebsitePrintConfirmation('WEBSITE',notes.replace('AWB227','NEW227'),{printConfirmed:true,expectedWebsiteShipping:block})).toThrow();
  });
  test('non-website processing contract remains compatible',()=> {
    expect(()=>assertWebsitePrintConfirmation('OFFLINE',null,{})).not.toThrow();
  });
});


test('same AWB replay advances revision so an older changed AWB cannot overwrite it', () => {
  const data={ status:'Proses',shipping_status:'Disiapkan',courier:'JNE',tracking_number:'AWB227',shipping_revision:'2026-10-15 14:00:00' };
  const first=websiteShippingNotes(data,null);
  const updated=websitePreparedResyncNotes({...data,shipping_revision:'2026-10-15 14:02:00'},'WAITING_APPROVAL',first);
  expect(websiteShippingReference(updated).revision).toBe('2026-10-15 14:02:00');
  expect(()=>websitePreparedResyncNotes({...data,tracking_number:'STALE227',shipping_revision:'2026-10-15 14:01:00'},'WAITING_APPROVAL',updated)).toThrow();
});
