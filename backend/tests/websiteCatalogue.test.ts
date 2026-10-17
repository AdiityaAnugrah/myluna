jest.mock('../src/models', () => ({ Product: { findAll: jest.fn() }, ProductVariant: {} }));
import { Product } from '../src/models';
import { websiteCatalogue } from '../src/controllers/websiteCatalogue.controller';

describe('read-only website catalogue projection', () => {
  const id = '7ef42be0-9851-4d75-ab2b-13e9acd58990';
  const originalToken = process.env.LUNA_WEB_ORDER_TOKEN;
  const originalMap = process.env.LUNA_WEB_PRODUCT_MAP;
  let res: any, next: jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks(); process.env.LUNA_WEB_ORDER_TOKEN = 'catalogue-test-token';
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ B20240116151233: id });
    res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }; next = jest.fn();
  });
  afterAll(() => {
    if (originalToken === undefined) delete process.env.LUNA_WEB_ORDER_TOKEN; else process.env.LUNA_WEB_ORDER_TOKEN = originalToken;
    if (originalMap === undefined) delete process.env.LUNA_WEB_PRODUCT_MAP; else process.env.LUNA_WEB_PRODUCT_MAP = originalMap;
  });
  const request = (token = 'catalogue-test-token', query: any = {}) => ({ headers: { 'x-luna-webhook-token': token }, query } as any);
  test.each(['', 'wrong', 'catalogue-test-tokeX'])('rejects invalid token before querying (%s)', async token => {
    await websiteCatalogue(request(token), res, next);
    expect(res.status).toHaveBeenCalledWith(401); expect(Product.findAll).not.toHaveBeenCalled();
  });
  test('empty server credential is never an open endpoint', async () => {
    delete process.env.LUNA_WEB_ORDER_TOKEN;
    await websiteCatalogue(request(''), res, next); expect(res.status).toHaveBeenCalledWith(401);
  });
  test.each(['bad-id', ['bad'], { value: id }])('rejects invalid product filter', async product_id => {
    await websiteCatalogue(request(undefined, { product_id }), res, next);
    expect(next).toHaveBeenCalled(); expect(Product.findAll).not.toHaveBeenCalled();
  });
  test('returns only approved fields, owners and real variant IDs', async () => {
    (Product.findAll as jest.Mock).mockResolvedValue([{ toJSON: () => ({ id, sku: 'MT12', name: 'MT 120', isActive: true,
      stock: 33, purchasePrice: 1, marketplaceLinks: { websiteId: 'B20240116151233', secret: 'excluded' },
      variantItems: [{ id: '3b2bb1d3-df78-4272-92b2-87612eac4c1d', value: 'CHERRY HITAM', stock: 44 }] }) }]);
    await websiteCatalogue(request(undefined, { product_id: id }), res, next);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ success: true, data: { complete: true, products: [{ id, sku: 'MT12', name: 'MT 120', active: true, stock: 33,
      website_ids: ['B20240116151233'], variants: [{ id: '3b2bb1d3-df78-4272-92b2-87612eac4c1d', value: 'CHERRY HITAM', stock: 44 }] }] } });
    expect(Product.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { id }, limit: 1, attributes: ['id', 'sku', 'name', 'isActive', 'marketplaceLinks', 'stock'], include: [{ model: expect.anything(), as: 'variantItems', attributes: ['id', 'value', 'stock'] }] }));
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store'); expect(next).not.toHaveBeenCalled();
  });
  test('does not silently return a truncated catalogue', async () => {
    (Product.findAll as jest.Mock).mockResolvedValue(new Array(2001).fill({}));
    await websiteCatalogue(request(), res, next); expect(next).toHaveBeenCalled(); expect(res.json).not.toHaveBeenCalled();
  });
});
