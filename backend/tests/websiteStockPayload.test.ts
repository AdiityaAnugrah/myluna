jest.mock('../src/models', () => ({ Product: {}, ProductVariant: {}, Category: {} }));
jest.mock('../src/utils/websiteProductMap', () => ({ websiteIdForMaster: jest.fn() }));
jest.mock('../src/services/lunareaWebsiteHttp.service', () => ({ parseBoolean: jest.fn(), postJsonToLunareaWebsite: jest.fn() }));

import { buildWebsiteStockPayload } from '../src/services/websiteProductSync.service';

describe('MyLuna stock push payload', () => {
  test('contains only canonical identifiers and inventory quantities', async () => {
    const product: any = {
      id: 'master-uuid', sku: 'MT12', stock: 42,
      toJSON: () => ({ variantItems: [
        { id: 'variant-a', name: 'Color', value: 'PUTIH', stock: 9, priceAdjustment: 5000 },
        { id: 'variant-b', name: 'Color', value: 'HITAM', stock: 3, priceAdjustment: 0 },
      ] }),
      sellingPrice: 999, imageUrl: 'https://example.test/master.jpg',
    };
    expect(await buildWebsiteStockPayload(product)).toEqual({
      id: 'master-uuid', sku: 'MT12', stock: 42,
      variants: [
        { id: 'variant-a', value: 'PUTIH', stock: 9 },
        { id: 'variant-b', value: 'HITAM', stock: 3 },
      ],
    });
  });
});
