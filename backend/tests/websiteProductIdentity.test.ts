jest.mock('../src/models', () => ({
  Product: { findAll: jest.fn() }, ProductVariant: { findAll: jest.fn(), findOne: jest.fn() },
  SaleItem: { findByPk: jest.fn() }, Sale: { findByPk: jest.fn() },
}));
import { Product, ProductVariant, Sale, SaleItem } from '../src/models';
import { resolveWebsiteProduct, resolveWebsiteVariant, originalSaleVariant, originalReturnVariant } from '../src/services/websiteProductIdentity.service';
import { appendWebsiteIdentities, readWebsiteIdentities, preserveWebsiteIdentities } from '../src/utils/websiteItemIdentities';

const productId = '7ef42be0-9851-4d75-ab2b-13e9acd58990';
const variantId = '11111111-1111-4111-8111-111111111111';
const saleItemId = '22222222-2222-4222-8222-222222222222';
const transaction = { LOCK: { UPDATE: 'UPDATE' } };
const item = { id: 'B20240116151233', name: 'Meja Tulis - MT 120 (CHERRY HITAM)' };
const identity = { saleItemId, websiteId: item.id, productId, variantId };

describe('website master identity safety (mock database only)', () => {
  const oldMap = process.env.LUNA_WEB_PRODUCT_MAP;
  beforeEach(() => { jest.resetAllMocks(); delete process.env.LUNA_WEB_PRODUCT_MAP; });
  afterAll(() => { if (oldMap === undefined) delete process.env.LUNA_WEB_PRODUCT_MAP; else process.env.LUNA_WEB_PRODUCT_MAP = oldMap; });
  test('unmatched physical product is rejected, never converted into a component', async () => {
    (Product.findAll as jest.Mock).mockResolvedValue([]);
    await expect(resolveWebsiteProduct(item, transaction)).rejects.toMatchObject({ statusCode: 422 });
  });
  test('ambiguous candidates fail closed', async () => {
    (Product.findAll as jest.Mock).mockResolvedValue([{ id: productId }, { id: variantId }]);
    await expect(resolveWebsiteProduct(item, transaction)).rejects.toMatchObject({ statusCode: 422 });
  });
  test('explicit legacy mapping resolves by master ID, never by product name', async () => {
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ [item.id]: productId });
    (Product.findAll as jest.Mock).mockResolvedValue([{ id: productId }]);
    expect((await resolveWebsiteProduct(item, transaction)).id).toBe(productId);
    expect(Product.findAll).toHaveBeenCalledWith(expect.objectContaining({ transaction, lock: 'UPDATE' }));
    expect(JSON.stringify((Product.findAll as jest.Mock).mock.calls)).not.toContain('Meja Tulis');
  });
  test('conflicting explicit mapping and snapshot reject before database access', async () => {
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ [item.id]: productId });
    await expect(resolveWebsiteProduct({ ...item, luna_product_id: variantId }, transaction)).rejects.toMatchObject({ statusCode: 409 });
    expect(Product.findAll).not.toHaveBeenCalled();
  });
  test('malformed mapping and inactive master are rejected', async () => {
    process.env.LUNA_WEB_PRODUCT_MAP = '{broken';
    await expect(resolveWebsiteProduct(item, transaction)).rejects.toMatchObject({ statusCode: 422 });
    delete process.env.LUNA_WEB_PRODUCT_MAP;
    (Product.findAll as jest.Mock).mockResolvedValue([{ id: productId, isActive: false }]);
    await expect(resolveWebsiteProduct(item, transaction)).rejects.toMatchObject({ statusCode: 422 });
  });
  test('stable variant UUID survives a rename', async () => {
    const variant = { id: variantId, productId, value: 'NAMA BARU' };
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([variant]);
    expect(await resolveWebsiteVariant(productId, { ...item, luna_product_id: productId, luna_variant_id: variantId }, 'CHERRY HITAM', transaction)).toBe(variant);
  });
  test('foreign or missing canonical variant rejects', async () => {
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([{ id: variantId, value: 'HITAM' }]);
    await expect(resolveWebsiteVariant(productId, { luna_variant_id: saleItemId }, 'HITAM', transaction)).rejects.toMatchObject({ statusCode: 422 });
    await expect(resolveWebsiteVariant(productId, { luna_product_id: productId }, 'HITAM', transaction)).rejects.toMatchObject({ statusCode: 422 });
  });
  test('legacy names must match one actual variant; no silent stock skip', async () => {
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([{ id: variantId, value: 'CHERRY HITAM' }]);
    expect((await resolveWebsiteVariant(productId, item, 'CHERRY HITAM', transaction))?.id).toBe(variantId);
    await expect(resolveWebsiteVariant(productId, item, 'PUTIH', transaction)).rejects.toMatchObject({ statusCode: 422 });
  });
  test('snapshot codec and operator note edits preserve immutable identities', () => {
    const notes = appendWebsiteIdentities('Catatan awal', [identity]);
    expect(readWebsiteIdentities(notes)).toEqual([identity]);
    const edited = preserveWebsiteIdentities(notes, 'Catatan diperbarui');
    expect(readWebsiteIdentities(edited)).toEqual([identity]);
    expect(edited).toContain('Catatan diperbarui');
    expect(() => preserveWebsiteIdentities(notes, appendWebsiteIdentities('', [{ ...identity, variantId: null }]))).toThrow();
  });
  test('broken, duplicate or oversized snapshot rejects instead of truncating', () => {
    expect(() => readWebsiteIdentities('[LUNA_ITEM_IDENTITIES_V1:broken]')).toThrow();
    const notes = appendWebsiteIdentities('', [identity]);
    expect(() => readWebsiteIdentities(notes + notes)).toThrow();
    expect(() => appendWebsiteIdentities('x'.repeat(60000), [identity])).toThrow();
  });
  test('cancellation restores frozen variant rather than name lookup', async () => {
    const variant = { id: variantId, value: 'RENAMED' };
    (ProductVariant.findOne as jest.Mock).mockResolvedValue(variant);
    const notes = appendWebsiteIdentities('', [identity]);
    expect(await originalSaleVariant({ notes }, { id: saleItemId, productId, variantName: 'CHERRY HITAM' }, transaction)).toBe(variant);
    expect(ProductVariant.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: variantId, productId } }));
    expect(ProductVariant.findAll).not.toHaveBeenCalled();
  });
  test('missing frozen variant or mismatched product blocks restoration', async () => {
    const notes = appendWebsiteIdentities('', [identity]);
    (ProductVariant.findOne as jest.Mock).mockResolvedValue(null);
    await expect(originalSaleVariant({ notes }, { id: saleItemId, productId, variantName: 'OLD' }, transaction)).rejects.toMatchObject({ statusCode: 409 });
    await expect(originalSaleVariant({ notes }, { id: saleItemId, productId: variantId }, transaction)).rejects.toMatchObject({ statusCode: 409 });
  });
  test('return resolves original sale item before restoring stock', async () => {
    (SaleItem.findByPk as jest.Mock).mockResolvedValue({ id: saleItemId, productId, saleId: 'sale', variantName: 'OLD' });
    (Sale.findByPk as jest.Mock).mockResolvedValue({ notes: appendWebsiteIdentities('', [identity]) });
    (ProductVariant.findOne as jest.Mock).mockResolvedValue({ id: variantId });
    expect((await originalReturnVariant({ saleItemId, productId }, transaction))?.id).toBe(variantId);
  });
});
