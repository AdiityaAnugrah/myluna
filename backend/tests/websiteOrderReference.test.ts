jest.mock('../src/models', () => ({ Sale: { findAll: jest.fn() } }));
import { Sale } from '../src/models';
import { resolveWebsiteOrder } from '../src/services/websiteOrderResolver.service';
import { appendWebsiteOrderReference, websiteInternalSaleNumber, websiteExternalOrderId, preserveWebsiteOrderReference } from '../src/utils/websiteOrderReference';

describe('external website order identity and manual invoice isolation', () => {
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const sale = (orderId = 'L00000228') => ({ id: 'new-sale', saleNumber: websiteInternalSaleNumber(orderId), platform: 'WEBSITE', notes: appendWebsiteOrderReference('operator note', orderId) });
  test('new internal key is distinct, reversible through immutable source, and fits archive suffix', () => {
    expect(websiteInternalSaleNumber('L00000228')).toBe('LWEB-L00000228');
    expect(websiteExternalOrderId(sale())).toBe('L00000228');
    const long = sale('L' + 'x'.repeat(49));
    expect(long.saleNumber.length + '-CANCELLED-1234567890123'.length).toBeLessThanOrEqual(50);
    expect(websiteExternalOrderId(long)).toBe('L' + 'x'.repeat(49));
    expect(websiteExternalOrderId({ ...long, saleNumber: long.saleNumber + '-CANCELLED-1234567890123' })).toBe('L' + 'x'.repeat(49));
  });
  test('ordinary notes can change, but source cannot be replaced or injected', () => {
    const original = sale();
    expect(websiteExternalOrderId({ ...original, notes: preserveWebsiteOrderReference(original.notes, 'updated') })).toBe('L00000228');
    expect(() => preserveWebsiteOrderReference(original.notes, sale('LOTHER').notes)).toThrow();
    expect(() => preserveWebsiteOrderReference(null, original.notes)).toThrow();
  });
  test('corrupt, duplicate or mismatched source fails closed', () => {
    const original = sale();
    expect(() => websiteExternalOrderId({ ...original, saleNumber: 'LWEB-other' })).toThrow();
    expect(() => websiteExternalOrderId({ ...original, notes: original.notes + original.notes })).toThrow();
    expect(() => websiteExternalOrderId({ ...original, notes: '[LUNA_WEB_ORDER_V1:broken]' })).toThrow();
    expect(() => websiteExternalOrderId({ ...original, notes: '' })).toThrow();
  });
  test('manual L00000227 is never reused, renamed or imported again', async () => {
    const manual = { id: 'manual', saleNumber: 'L00000227', platform: 'WHATSAPP', notes: 'untouched' };
    (Sale.findAll as jest.Mock).mockResolvedValue([manual]);
    await expect(resolveWebsiteOrder('L00000227', tx)).rejects.toMatchObject({ statusCode: 409 });
    expect(manual).toEqual({ id: 'manual', saleNumber: 'L00000227', platform: 'WHATSAPP', notes: 'untouched' });
  });
  test('old WEBSITE records retain their key, while canonical namespaced records resolve explicitly', async () => {
    const legacy = { id: 'old', saleNumber: 'L00000228', platform: 'WEBSITE' };
    (Sale.findAll as jest.Mock).mockResolvedValue([legacy]);
    expect(await resolveWebsiteOrder('L00000228', tx)).toBe(legacy);
    const current = sale();
    (Sale.findAll as jest.Mock).mockResolvedValue([current, { id: 'manual', saleNumber: 'L00000228', platform: 'WHATSAPP' }]);
    expect(await resolveWebsiteOrder('L00000228', tx)).toBe(current);
    (Sale.findAll as jest.Mock).mockResolvedValue([current, legacy]);
    await expect(resolveWebsiteOrder('L00000228', tx)).rejects.toMatchObject({ statusCode: 409 });
  });
});
