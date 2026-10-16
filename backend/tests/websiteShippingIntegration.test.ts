jest.mock('../src/models', () => ({
  Sale: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  StockMovement: { create: jest.fn() },
  Product: { findByPk: jest.fn(), findAll: jest.fn() },
  ProductVariant: { findOne: jest.fn(), findAll: jest.fn() },
  SaleItem: { create: jest.fn(), findAll: jest.fn() },
  User: { findOne: jest.fn() }, MovementType: { OUT: 'OUT' },
}));
jest.mock('../src/config/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../src/services/socket.service', () => ({ socketService: { broadcastDataRefresh: jest.fn(), emitToAdmins: jest.fn() } }));
jest.mock('../src/services/audit.service', () => ({ auditService: {} }));
jest.mock('../src/services/lunareaWebsiteHttp.service', () => ({ parseBoolean: jest.fn(), postJsonToLunareaWebsite: jest.fn() }));

import { webOrderIntegrationController } from '../src/controllers/webOrderIntegration.controller';
import { Sale, StockMovement, SaleItem, Product, ProductVariant, User } from '../src/models';
import { sequelize } from '../src/config/database';
import { websiteShippingNotes } from '../src/utils/websiteShipping';

describe('shipping-only webhook isolation', () => {
  const originalToken = process.env.LUNA_WEB_ORDER_TOKEN;
  let transaction: any;
  let sale: any;
  let response: any;
  let next: jest.Mock;
  const request = () => ({ headers: { 'x-luna-webhook-token': 'unit-test-token' }, body: {
    event_type: 'shipping_update', order_id: 'LTEST', status: 'Dikirim', shipping_status: 'Dalam Pengiriman',
    courier: 'JNE', tracking_number: 'TEST123', shipping_cost: 10000,
  } });

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.LUNA_WEB_ORDER_TOKEN = 'unit-test-token';
    transaction = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
    (sequelize.transaction as jest.Mock).mockResolvedValue(transaction);
    sale = { id: 'sale-test', saleNumber: 'LTEST', platform: 'WEBSITE', status: 'PROCESSED', notes: websiteShippingNotes({ status: 'Proses', shipping_status: 'Disiapkan', courier: 'JNE', tracking_number: 'TEST123' }, 'Catatan operator'), update: jest.fn() };
    sale.update.mockImplementation(async (patch: any) => { sale.notes = patch.notes; });
    (Sale.findAll as jest.Mock).mockResolvedValue([sale]);
    (Sale.findOne as jest.Mock).mockResolvedValue(null);
    response = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  afterAll(() => {
    if (originalToken === undefined) delete process.env.LUNA_WEB_ORDER_TOKEN;
    else process.env.LUNA_WEB_ORDER_TOKEN = originalToken;
  });

  test('updates shipping notes only, never sales or inventory', async () => {
    await webOrderIntegrationController.importLunareaOrder(request() as any, response, next);
    expect(next).not.toHaveBeenCalled();
    expect(sale.update).toHaveBeenCalledWith({ notes: expect.stringContaining('TEST123') }, { transaction });
    expect(Sale.create).not.toHaveBeenCalled();
    expect(SaleItem.create).not.toHaveBeenCalled();
    expect(Product.findByPk).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ shipping_updated: true, saleNumber: 'LTEST' }) }));
    expect(sale.status).toBe('PROCESSED');
  });

  test('replayed webhook does not duplicate shipping notes', async () => {
    await webOrderIntegrationController.importLunareaOrder(request() as any, response, next);
    await webOrderIntegrationController.importLunareaOrder(request() as any, response, next);
    expect(sale.update).toHaveBeenCalledTimes(1);
    expect(Sale.create).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
  });

  test('missing sale is not imported by a shipping event', async () => {
    (Sale.findAll as jest.Mock).mockResolvedValue([]);
    await webOrderIntegrationController.importLunareaOrder(request() as any, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(transaction.rollback).toHaveBeenCalled();
    expect(Sale.create).not.toHaveBeenCalled();
  });

  test('invalid webhook token never reaches database', async () => {
    const req = request(); req.headers['x-luna-webhook-token'] = 'invalid';
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test('paid-order replay adds pricing audit without repeating sale or stock', async () => {
    sale.status = 'WAITING_APPROVAL';
    sale.notes = 'Catatan operator';
    sale.toJSON = () => ({ saleNumber: 'LTEST', notes: sale.notes });
    const req = { headers: { 'x-luna-webhook-token': 'unit-test-token' }, body: {
      order_id: 'LTEST', status: 'Proses', courier: 'JNE', tracking_number: 'TEST227', customer_email: 'buyer@test.invalid',
      shipping_cost: 90000, shipping_pricing: { currency: 'IDR', original_cost: 100000, subsidy_amount: 10000, payable_cost: 90000 },
    } };
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(next).not.toHaveBeenCalled();
    expect(sale.update).toHaveBeenCalledTimes(1);
    expect(sale.notes).toContain('Subsidi ditanggung toko: Rp 10.000');
    expect(Sale.create).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
  });
  test.each([
    { payment_environment: 'sandbox' },
    { is_test: true },
    { is_test: 'true' },
    { data_mid: { _app_payment_environment: 'sandbox' } },
    { customer_email: ' LUNAREAFURNITURE@gmail.com ' },
  ])('sandbox lane cannot reach production stock: %j', async lane => {
    const req = request(); Object.assign(req.body, lane);
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ skipped: true, reason: 'sandbox_order' }) }));
    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(Sale.create).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
  });

  test('unknown environment fails before opening transaction', async () => {
    const req = request(); Object.assign(req.body, { payment_environment: 'unknown' });
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  test('cancelled or rejected existing order cannot be re-imported', async () => {
    sale.status = 'CANCELLED'; sale.platform = 'WEBSITE'; sale.saleNumber = 'L00000227';
    const req = { headers: { 'x-luna-webhook-token': 'unit-test-token' }, body: {
      order_id: 'L00000227', status: 'Proses', courier: 'JNE', tracking_number: 'TEST227', customer_email: 'buyer@test.invalid', payment_environment: 'production',
    } };
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(Sale.create).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  test('renamed cancelled order cannot create a second sale or stock movement', async () => {
    (Sale.findAll as jest.Mock).mockResolvedValue([]);
    (Sale.findOne as jest.Mock).mockResolvedValueOnce({ saleNumber: 'L00000227-CANCELLED-123456', status: 'CANCELLED' });
    const req = { headers: { 'x-luna-webhook-token': 'unit-test-token' }, body: {
      order_id: 'L00000227', status: 'Proses', courier: 'JNE', tracking_number: 'TEST227', customer_email: 'buyer@test.invalid', payment_environment: 'production',
    } };
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(Sale.create).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

  test.each(['legacy', 'internal_delivery'])('reviewed order without AWB passes import validation for %s', async method => {
    const req = { headers: { 'x-luna-webhook-token': 'unit-test-token' }, body: {
      order_id: 'L00000227', status: 'Proses', customer_email: 'buyer@test.invalid', dry_run: true,
      items: [{ id: 'MT120', name: 'MT 120 (HITAM)', quantity: 7, value: 445550 }], transaction_time: '2026-10-15T14:32:09+07:00', total: 3118850,
      courier: method === 'internal_delivery' ? 'Jasa Kirim Toko' : 'JNE', shipping_method_code: method,
    } };
    (Sale.findAll as jest.Mock).mockResolvedValue([]);
    (User.findOne as jest.Mock).mockResolvedValue({ id: 'operator' });
    const product = { id: '7ef42be0-9851-4d75-ab2b-13e9acd58990', name: 'MT 120', stock: 23 };
    (Product.findAll as jest.Mock).mockResolvedValue([product]);
    (Product.findByPk as jest.Mock).mockResolvedValue(product);
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111', value: 'HITAM', stock: 33 }]);
    await webOrderIntegrationController.importLunareaOrder(req as any, response, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({success:true,data:expect.objectContaining({dryRun:true})}));
    expect(Sale.create).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled();
    expect(transaction.rollback).toHaveBeenCalled();
  });

});
