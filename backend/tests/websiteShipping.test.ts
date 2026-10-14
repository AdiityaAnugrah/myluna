import { websiteShippingNotes } from '../src/utils/websiteShipping';

const shipment = { status: 'Dikirim', shipping_status: 'Dalam Pengiriman', courier: 'JNE', tracking_number: 'TEST12345', shipping_cost: 25000 };

describe('website shipping updates', () => {
  test('preserves operator notes and is idempotent', () => {
    const notes = websiteShippingNotes(shipment, 'Catatan admin tetap ada');
    expect(notes).toContain('Catatan admin tetap ada');
    expect(notes).toContain('TEST12345');
    expect(websiteShippingNotes(shipment, notes)).toBe(notes);
  });
  test('internal delivery has no fabricated AWB', () => {
    const notes = websiteShippingNotes({ ...shipment, courier: 'Jasa Kirim Toko', shipping_method_code: 'internal_delivery', tracking_number: '', shipping_cost: 0 }, null);
    expect(notes).toContain('Tanpa resi eksternal');
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
});
