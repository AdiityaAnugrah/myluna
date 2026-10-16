jest.mock('../src/models', () => ({ Sale: { findByPk: jest.fn(), findAll: jest.fn() } }));
jest.mock('../src/config/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../src/services/lunareaWebsiteHttp.service', () => ({ postJsonToLunareaWebsite: jest.fn() }));

import { Sale } from '../src/models';
import { sequelize } from '../src/config/database';
import { postJsonToLunareaWebsite } from '../src/services/lunareaWebsiteHttp.service';
import { notifyWebsiteProcessed, retryWebsiteProcessed, websiteFulfillment } from '../src/services/websiteFulfillment.service';
import { appendWebsiteOrderReference, websiteInternalSaleNumber } from '../src/utils/websiteOrderReference';

describe('TCP process acknowledgement', () => {
  const original = { ...process.env };
  let sale: any;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LUNA_WEB_ORDER_TOKEN = 'unit-only';
    process.env.LUNA_WEB_ORDER_STATUS_URL = 'https://lunarea.example.test/integrations/luna-order-status';
    sale = { id:'sale-test', saleNumber:'LTEST', platform:'WEBSITE', processedAt:new Date('2026-01-01T06:00:00Z'), notes:'Operator notes', update:jest.fn() };
    sale.update.mockImplementation(async (patch: any) => Object.assign(sale, patch));
    (Sale.findByPk as jest.Mock).mockResolvedValue(sale);
    (sequelize.transaction as jest.Mock).mockImplementation(async (fn:any) => fn({LOCK:{UPDATE:'UPDATE'}}));
    (postJsonToLunareaWebsite as jest.Mock).mockResolvedValue({ok:true, text:JSON.stringify({success:true,order_id:'LTEST',stage:'processed'})});
  });
  afterAll(() => { process.env = original; });
  test('only processed website orders send a callback without an AWB', async () => {
    expect(websiteFulfillment({...sale,processedAt:null}).stage).toBe('received');
    expect(await notifyWebsiteProcessed({...sale,platform:'SHOPEE'})).toBe(false);
    expect(await notifyWebsiteProcessed({...sale,processedAt:null})).toBe(false);
    expect(postJsonToLunareaWebsite).not.toHaveBeenCalled();
    expect(await notifyWebsiteProcessed(sale)).toBe(true);
    expect(postJsonToLunareaWebsite).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({stage:'processed',order_id:'LTEST',sale_id:'sale-test'}),expect.objectContaining({timeoutMs:8000}));
    expect(sale.notes).toContain('Operator notes');
    expect(sale.notes).toContain('[Lunarea Process Acknowledged]');
  });
  test('namespaced sale calls back with the original customer order number', async () => {
    sale.saleNumber = websiteInternalSaleNumber('LTEST');
    sale.notes = appendWebsiteOrderReference('Operator notes', 'LTEST');
    expect(await notifyWebsiteProcessed(sale)).toBe(true);
    expect(postJsonToLunareaWebsite).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ order_id: 'LTEST' }), expect.any(Object));
  });
  test('failed callbacks remain unacknowledged for retry, never roll back TCP', async () => {
    (postJsonToLunareaWebsite as jest.Mock).mockRejectedValue(new Error('timeout'));
    expect(await notifyWebsiteProcessed(sale)).toBe(false);
    expect(sale.update).not.toHaveBeenCalled();
    (Sale.findAll as jest.Mock).mockResolvedValue([sale]);
    (postJsonToLunareaWebsite as jest.Mock).mockResolvedValue({ok:true,text:JSON.stringify({success:true,order_id:'LTEST',stage:'processed'})});
    await retryWebsiteProcessed();
    expect(sale.update).toHaveBeenCalledTimes(1);
  });
  test('wrong response identity does not mark success', async () => {
    (postJsonToLunareaWebsite as jest.Mock).mockResolvedValue({ok:true,text:'{"success":true,"order_id":"OTHER","stage":"processed"}'});
    expect(await notifyWebsiteProcessed(sale)).toBe(false);
    expect(sale.update).not.toHaveBeenCalled();
  });
  test('database second precision does not create endless callback retries', async () => {
    const inMemory = {...sale, processedAt:new Date('2026-01-01T06:00:00.789Z')};
    expect(websiteFulfillment(inMemory).processed_at).toBe('2026-01-01T06:00:00.000Z');
    expect(await notifyWebsiteProcessed(inMemory)).toBe(true);
    expect(sale.update).toHaveBeenCalledTimes(1);
  });
  test('replay preserves notes and uses the persisted acknowledgement', async () => {
    await notifyWebsiteProcessed(sale); await notifyWebsiteProcessed(sale);
    expect(sale.update).toHaveBeenCalledTimes(1);
  });
  test('missing key or insecure URL never sends requests', async () => {
    delete process.env.LUNA_WEB_ORDER_TOKEN;
    expect(await notifyWebsiteProcessed(sale)).toBe(false);
    process.env.LUNA_WEB_ORDER_TOKEN='unit-only'; process.env.LUNA_WEB_ORDER_STATUS_URL='http://lunarea.example.test';
    expect(await notifyWebsiteProcessed(sale)).toBe(false);
    expect(postJsonToLunareaWebsite).not.toHaveBeenCalled();
  });
});
