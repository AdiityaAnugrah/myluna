import { websiteProductMap, websiteIdForMaster } from '../src/utils/websiteProductMap';

describe('explicit bidirectional website mapping', () => {
  const old = process.env.LUNA_WEB_PRODUCT_MAP;
  const id = '7ef42be0-9851-4d75-ab2b-13e9acd58990';
  beforeEach(() => { delete process.env.LUNA_WEB_PRODUCT_MAP; });
  afterAll(() => { if (old === undefined) delete process.env.LUNA_WEB_PRODUCT_MAP; else process.env.LUNA_WEB_PRODUCT_MAP = old; });
  test('same explicit map serves incoming orders and outgoing catalog', () => {
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ B20240116151233: id });
    expect(websiteProductMap().B20240116151233).toBe(id);
    expect(websiteIdForMaster({ id, sku: 'SKU-NEW' })).toBe('B20240116151233');
  });
  test.each(['null', '[]', '{broken', '{"B1":"not-a-uuid"}'])('invalid config %s fails closed', raw => {
    process.env.LUNA_WEB_PRODUCT_MAP = raw;
    expect(() => websiteProductMap()).toThrow();
  });
  test('two local IDs targeting same master reject', () => {
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ B1: id, B2: id });
    expect(() => websiteProductMap()).toThrow();
  });
  test('marketplace and configured identity conflict rejects', () => {
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ B1: id });
    expect(() => websiteIdForMaster({ id, sku: 'SKU', marketplaceLinks: { websiteId: 'B2' } })).toThrow();
  });
});
