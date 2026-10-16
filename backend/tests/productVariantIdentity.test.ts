jest.mock('../src/models', () => ({ ProductVariant: { findAll: jest.fn(), create: jest.fn() } }));
import { ProductVariant } from '../src/models';
import { updateProductVariantsPreservingIdentity } from '../src/services/productVariantIdentity.service';

describe('non-destructive variant editing', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let existing: any;
  beforeEach(() => {
    jest.resetAllMocks(); existing = { id: 'original-uuid', value: 'HITAM', stock: 26, update: jest.fn() };
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([existing]);
  });
  test('rename retains the original UUID', async () => {
    await updateProductVariantsPreservingIdentity('product', [{ id: existing.id, value: 'CHERRY HITAM', stock: 33 }], transaction);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ value: 'CHERRY HITAM', stock: 26 }), { transaction });
    expect(ProductVariant.create).not.toHaveBeenCalled();
  });
  test('old clients without IDs can keep an exactly matching existing variant', async () => {
    await updateProductVariantsPreservingIdentity('product', [{ value: 'HITAM', stock: 33 }], transaction);
    expect(existing.update).toHaveBeenCalled(); expect(ProductVariant.create).not.toHaveBeenCalled();
  });
  test('omitted variant is blocked before any write rather than deleted', async () => {
    await expect(updateProductVariantsPreservingIdentity('product', [], transaction)).rejects.toMatchObject({ statusCode: 409 });
    expect(existing.update).not.toHaveBeenCalled(); expect(ProductVariant.create).not.toHaveBeenCalled();
  });
  test('foreign UUID and ambiguous rename without ID reject before writes', async () => {
    await expect(updateProductVariantsPreservingIdentity('product', [{ id: 'foreign', value: 'HITAM' }], transaction)).rejects.toMatchObject({ statusCode: 409 });
    await expect(updateProductVariantsPreservingIdentity('product', [{ value: 'RENAMED' }], transaction)).rejects.toMatchObject({ statusCode: 409 });
    expect(existing.update).not.toHaveBeenCalled(); expect(ProductVariant.create).not.toHaveBeenCalled();
  });
  test('new variant is added without deleting existing variants', async () => {
    await updateProductVariantsPreservingIdentity('product', [{ id: existing.id, value: 'HITAM' }, { value: 'PUTIH', stock: 0 }], transaction);
    expect(existing.update).toHaveBeenCalledTimes(1);
    expect(ProductVariant.create).toHaveBeenCalledWith(expect.objectContaining({ productId: 'product', value: 'PUTIH' }), { transaction });
  });
  test.each([-1, 1.5, NaN])('invalid variant stock %s causes no write', async stock => {
    await expect(updateProductVariantsPreservingIdentity('product', [{ id: existing.id, value: 'HITAM', stock }], transaction)).rejects.toMatchObject({ statusCode: 422 });
    expect(existing.update).not.toHaveBeenCalled();
  });
});
