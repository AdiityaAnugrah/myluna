jest.mock('../src/models', () => ({
  Sale: { findOne: jest.fn(), create: jest.fn() }, SaleItem: { create: jest.fn(), findAll: jest.fn() },
  Product: { findAll: jest.fn(), findByPk: jest.fn() }, ProductVariant: { findAll: jest.fn() },
  StockMovement: { create: jest.fn() }, User: { findOne: jest.fn() }, MovementType: { OUT: 'OUT' },
}));
jest.mock('../src/config/database', () => ({ sequelize: { transaction: jest.fn() } }));
jest.mock('../src/services/socket.service', () => ({ socketService: { emitToAdmins: jest.fn(), broadcastDataRefresh: jest.fn() } }));
jest.mock('../src/services/audit.service', () => ({ auditService: {} }));
jest.mock('../src/services/lunareaWebsiteHttp.service', () => ({ parseBoolean: jest.fn(), postJsonToLunareaWebsite: jest.fn() }));
import { webOrderIntegrationController, resolveSaleItemForWebsiteReturn } from '../src/controllers/webOrderIntegration.controller';
import { Sale, SaleItem, Product, ProductVariant, StockMovement, User } from '../src/models';
import { sequelize } from '../src/config/database';
import { socketService } from '../src/services/socket.service';
import { readWebsiteIdentities, appendWebsiteIdentities } from '../src/utils/websiteItemIdentities';

describe('physical website order import atomic safety', () => {
  const oldToken = process.env.LUNA_WEB_ORDER_TOKEN;
  let transaction: any, product: any, variant: any, saved: any, res: any, next: jest.Mock;
  const request = () => ({ headers: { 'x-luna-webhook-token': 'unit-token' }, body: {
    order_id: 'L00000227', status: 'Proses', customer_email: 'buyer@test.invalid', payment_environment: 'production',
    transaction_time: '2026-10-15T14:32:09+07:00', total: 3118850, courier: 'JNE',
    items: [{ id: 'B20240116151233', name: 'Meja Tulis - MT 120 (CHERRY HITAM)', quantity: 7, value: 445550 }],
  } });
  beforeEach(() => {
    jest.resetAllMocks(); process.env.LUNA_WEB_ORDER_TOKEN = 'unit-token';
    transaction = { LOCK: { UPDATE: 'UPDATE' }, commit: jest.fn(), rollback: jest.fn() };
    (sequelize.transaction as jest.Mock).mockResolvedValue(transaction);
    (Sale.findOne as jest.Mock).mockResolvedValue(null);
    (User.findOne as jest.Mock).mockResolvedValue({ id: 'operator' });
    product = { id: '7ef42be0-9851-4d75-ab2b-13e9acd58990', name: 'MT 120', stock: 23 };
    product.update = jest.fn(async patch => Object.assign(product, patch));
    variant = { id: '11111111-1111-4111-8111-111111111111', value: 'CHERRY HITAM', stock: 33 };
    variant.update = jest.fn(async patch => Object.assign(variant, patch));
    (Product.findAll as jest.Mock).mockResolvedValue([product]);
    (Product.findByPk as jest.Mock).mockResolvedValue(product);
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([variant]);
    (SaleItem.create as jest.Mock).mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    (Sale.create as jest.Mock).mockImplementation(async attributes => {
      saved = { id: 'sale', ...attributes };
      saved.update = jest.fn(async patch => Object.assign(saved, patch));
      saved.toJSON = () => ({ ...saved }); return saved;
    });
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }; next = jest.fn();
  });
  afterAll(() => { if (oldToken === undefined) delete process.env.LUNA_WEB_ORDER_TOKEN; else process.env.LUNA_WEB_ORDER_TOKEN = oldToken; });
  test('valid import preserves financial snapshot, records IDs and deducts stock once', async () => {
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(next).not.toHaveBeenCalled(); expect(product.stock).toBe(16); expect(variant.stock).toBe(26);
    expect(SaleItem.create).toHaveBeenCalledWith(expect.objectContaining({ productId: product.id, itemType: 'PRODUCT', quantity: 7, price: 445550 }), { transaction });
    expect(saved.totalAmount).toBe(3118850); expect(saved.saleDate).toEqual(new Date('2026-10-15T14:32:09+07:00'));
    expect(readWebsiteIdentities(saved.notes)?.[0]).toMatchObject({ websiteId: 'B20240116151233', productId: product.id, variantId: variant.id });
    expect(transaction.commit).toHaveBeenCalledTimes(1); expect(transaction.rollback).not.toHaveBeenCalled();
  });
  test('unmatched master rejects before creating sale or mutating inventory', async () => {
    (Product.findAll as jest.Mock).mockResolvedValue([]);
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }));
    expect(Sale.create).not.toHaveBeenCalled(); expect(SaleItem.create).not.toHaveBeenCalled();
    expect(product.update).not.toHaveBeenCalled(); expect(variant.update).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled(); expect(transaction.rollback).toHaveBeenCalledTimes(1);
  });
  test('variant mismatch rejects before any stock mutation', async () => {
    (ProductVariant.findAll as jest.Mock).mockResolvedValue([{ id: 'other', value: 'PUTIH', stock: 33 }]);
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }));
    expect(Sale.create).not.toHaveBeenCalled(); expect(StockMovement.create).not.toHaveBeenCalled();
  });
  test.each([0, -1, 1.5, 'bad'])('invalid quantity %s blocks import', async quantity => {
    const req: any = request(); req.body.items[0].quantity = quantity;
    await webOrderIntegrationController.importLunareaOrder(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }));
    expect(Sale.create).not.toHaveBeenCalled(); expect(StockMovement.create).not.toHaveBeenCalled();
  });
  test('combined demand checks product stock, not just each variant', async () => {
    product.stock = 10; const req = request(); req.body.items.push({ ...req.body.items[0] });
    await webOrderIntegrationController.importLunareaOrder(req as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 })); expect(Sale.create).not.toHaveBeenCalled();
  });
  test('valid dry run validates stock but creates no sale or movement', async () => {
    const req: any = request(); req.body.dry_run = true;
    await webOrderIntegrationController.importLunareaOrder(req, res, next);
    expect(next).not.toHaveBeenCalled(); expect(Product.findAll).toHaveBeenCalled();
    expect(Sale.create).not.toHaveBeenCalled(); expect(product.update).not.toHaveBeenCalled();
    expect(StockMovement.create).not.toHaveBeenCalled(); expect(transaction.rollback).toHaveBeenCalledTimes(1);
  });
  test('socket failure after commit still acknowledges persisted order', async () => {
    (socketService.emitToAdmins as jest.Mock).mockImplementationOnce(() => { throw new Error('offline'); });
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(next).not.toHaveBeenCalled(); expect(transaction.commit).toHaveBeenCalledTimes(1);
    expect(transaction.rollback).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(201);
  });
  test('transaction connection failure is forwarded to error handler', async () => {
    (sequelize.transaction as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' })); expect(Sale.create).not.toHaveBeenCalled();
  });
  test('retry confirms the same immutable order without deducting stock twice', async () => {
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    (Sale.findOne as jest.Mock).mockResolvedValue(saved);
    (SaleItem.findAll as jest.Mock).mockResolvedValue([{ id: '22222222-2222-4222-8222-222222222222', quantity: 7, price: 445550 }]);
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(next).not.toHaveBeenCalled(); expect(Sale.create).toHaveBeenCalledTimes(1);
    expect(StockMovement.create).toHaveBeenCalledTimes(1); expect(product.stock).toBe(16);
  });
  test('retry with changed amount rejects and does not modify the original order', async () => {
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    (Sale.findOne as jest.Mock).mockResolvedValue(saved);
    (SaleItem.findAll as jest.Mock).mockResolvedValue([{ id: '22222222-2222-4222-8222-222222222222', quantity: 7, price: 445550 }]);
    const req = request(); req.body.total = 1;
    await webOrderIntegrationController.importLunareaOrder(req as any, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(saved.totalAmount).toBe(3118850); expect(StockMovement.create).toHaveBeenCalledTimes(1);
  });
  test('failed item insert rolls back rather than committing a partial order', async () => {
    (SaleItem.create as jest.Mock).mockRejectedValueOnce(new Error('write failed'));
    await webOrderIntegrationController.importLunareaOrder(request() as any, res, next);
    expect(transaction.rollback).toHaveBeenCalledTimes(1); expect(transaction.commit).not.toHaveBeenCalled();
    expect(product.update).not.toHaveBeenCalled(); expect(StockMovement.create).not.toHaveBeenCalled();
  });
  test('return selection distinguishes variants of the same website product', async () => {
    const first = '22222222-2222-4222-8222-222222222222';
    const second = '33333333-3333-4333-8333-333333333333';
    const notes = appendWebsiteIdentities('', [
      { saleItemId: first, websiteId: 'B1', productId: product.id, variantId: variant.id },
      { saleItemId: second, websiteId: 'B1', productId: product.id, variantId: '44444444-4444-4444-8444-444444444444' },
    ]);
    const lines = [{ id: first, productId: product.id, variantName: 'HITAM' }, { id: second, productId: product.id, variantName: 'PUTIH' }];
    const sale: any = { notes, items: lines };
    expect((await resolveSaleItemForWebsiteReturn(sale, { id: 'B1', name: 'MT 120 (PUTIH)' }, transaction)).id).toBe(second);
    await expect(resolveSaleItemForWebsiteReturn(sale, { id: 'B1', name: 'MT 120' }, transaction)).rejects.toMatchObject({ statusCode: 422 });
  });
});
