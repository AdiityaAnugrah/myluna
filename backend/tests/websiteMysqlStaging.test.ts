import fs from 'fs';
import { randomUUID } from 'crypto';
import { websiteInternalSaleNumber, websiteExternalOrderId, appendWebsiteOrderReference } from '../src/utils/websiteOrderReference';

// Opt-in only: never use the application .env or a default database for this suite.
const enabled = Boolean(process.env.LUNA_IDENTITY_STAGING_CONNECTION);
(enabled ? describe : describe.skip)('MySQL 8 restored-copy shipping identity integration', () => {
  let models: any, db: any, integration: any, sales: any, returns: any, editVariants: any;
  let product: any, variant: any, operator: any, websiteId: string;
  const originalEnv = { ...process.env };
  const ids: string[] = [];
  const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
  const order = () => {
    const id = 'LAUDIT' + randomUUID().replace(/-/g, '').slice(0, 20); ids.push(id);
    return { order_id: id, payment_environment: 'production', customer_email: 'synthetic@audit.invalid',
      status: 'Proses', transaction_time: '2026-10-15T14:32:09+07:00', total: 1000000, courier: 'JNE',
      items: [{ id: websiteId, name: 'Synthetic audit (HITAM)', luna_product_id: product.id,
        luna_variant_id: variant.id, quantity: 2, value: 500000 }] };
  };
  async function invoke(handler: any, body: any, params: any = {}) {
    const res = response(), next = jest.fn();
    await handler({ body, params, headers: { 'x-luna-webhook-token': 'isolated-test-token' },
      user: { id: operator.id, roleName: 'ADMIN' }, ip: '127.0.0.1', socket: {}, get: () => 'isolated-test' }, res, next);
    return { res, next };
  }
  async function stock() {
    return [(await models.Product.findByPk(product.id)).stock, (await models.ProductVariant.findByPk(variant.id)).stock];
  }
  beforeAll(async () => {
    const config = JSON.parse(fs.readFileSync(process.env.LUNA_IDENTITY_STAGING_CONNECTION!, 'utf8'));
    if (config.host !== '127.0.0.1' || config.myluna !== 'shipping_audit_wms' || config.user !== 'shipping_audit'
      || !Number.isInteger(config.port) || config.port < 1024 || config.port === 3306) throw new Error('Non-isolated DB rejected');
    process.env.NODE_ENV = 'test'; process.env.LUNAREA_WEBSITE_PRODUCT_SYNC_ENABLED = 'false';
    process.env.LUNA_WEB_RETURN_STATUS_URL = ''; process.env.LUNA_WEB_ORDER_TOKEN = 'isolated-test-token';
    delete process.env.LUNA_WEB_PRODUCT_MAP;
    jest.doMock('../src/config/env', () => ({ env: { DB_HOST: config.host, DB_PORT: config.port,
      DB_NAME: config.myluna, DB_USER: config.user, DB_PASSWORD: config.password, DB_DIALECT: 'mysql', DB_LOGGING: false } }));
    jest.doMock('../src/utils/logger', () => ({ logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
    jest.doMock('../src/services/socket.service', () => ({ socketService: { emitToAdmins: jest.fn(), broadcastDataRefresh: jest.fn() } }));
    jest.doMock('../src/services/audit.service', () => ({ auditService: { log: jest.fn().mockResolvedValue(undefined) } }));
    jest.doMock('../src/services/lunareaWebsiteHttp.service', () => ({ parseBoolean: (v: any) => v === true,
      postJsonToLunareaWebsite: () => { throw new Error('External HTTP prohibited in staging test'); } }));
    models = require('../src/models'); db = require('../src/config/database').sequelize;
    const [rows] = await db.query('SELECT DATABASE() AS name, @@port AS port, VERSION() AS version');
    expect(rows[0].name).toBe(config.myluna); expect(Number(rows[0].port)).toBe(config.port); expect(rows[0].version).toMatch(/^8\./);
    operator = await models.User.findOne({ where: { isActive: true } });
    if (!operator) throw new Error('Audit copy has no active integration operator');
    process.env.WEBSITE_ORDER_USER_ID = operator.id;
    const category = await models.Category.findOne();
    product = await models.Product.create({ sku: 'AUDIT-' + randomUUID(), name: 'Synthetic audit product',
      categoryId: category.id, unit: 'pcs', purchasePrice: 0, sellingPrice: 500000, stock: 100, minStock: 0, isActive: true });
    variant = await models.ProductVariant.create({ productId: product.id, name: 'HITAM', value: 'HITAM', stock: 100, priceAdjustment: 0 });
    websiteId = 'BA' + randomUUID().replace(/-/g, '').slice(0, 12);
    integration = require('../src/controllers/webOrderIntegration.controller').webOrderIntegrationController;
    sales = require('../src/controllers/sale.controller').saleController;
    returns = require('../src/controllers/return.controller').returnController;
    editVariants = require('../src/services/productVariantIdentity.service').updateProductVariantsPreservingIdentity;
  }, 30000);
  afterAll(async () => {
    if (db) await db.close();
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });
  test('LONGTEXT marketplace JSON query works against the actual restored schema', async () => {
    await product.update({ marketplaceLinks: { websiteId } });
    const result = await invoke(integration.importLunareaOrder, { ...order(), dry_run: true });
    expect(result.next).not.toHaveBeenCalled(); expect(await stock()).toEqual([100, 100]);
  });
  test('paid import and identical retry change inventory exactly once', async () => {
    const body = order(); const first = await invoke(integration.importLunareaOrder, body);
    expect(first.next).not.toHaveBeenCalled(); expect(first.res.status).toHaveBeenCalledWith(201);
    const second = await invoke(integration.importLunareaOrder, body);
    expect(second.next).not.toHaveBeenCalled(); expect(await stock()).toEqual([98, 98]);
    const sale = await models.Sale.findOne({ where: { saleNumber: websiteInternalSaleNumber(body.order_id) } });
    expect(Number(sale.totalAmount)).toBe(1000000);
    expect(await models.SaleItem.count({ where: { saleId: sale.id } })).toBe(1);
  });
  test('mid-transaction item failure rolls back sale and stock in InnoDB', async () => {
    const baseline = await stock(), body = order();
    const spy = jest.spyOn(models.SaleItem, 'create').mockRejectedValueOnce(new Error('Synthetic insertion failure'));
    const result = await invoke(integration.importLunareaOrder, body); spy.mockRestore();
    expect(result.next).toHaveBeenCalled(); expect(await stock()).toEqual(baseline);
    expect(await models.Sale.count({ where: { saleNumber: websiteInternalSaleNumber(body.order_id) } })).toBe(0);
  });
  test('variant rename preserves UUID and stale form stock cannot overwrite inventory', async () => {
    const baseline = await stock();
    await db.transaction((transaction: any) => editVariants(product.id, [{ id: variant.id, value: 'RENAMED', stock: 0 }], transaction));
    expect((await models.ProductVariant.findByPk(variant.id)).value).toBe('RENAMED'); expect(await stock()).toEqual(baseline);
  });
  test('concurrent rejection restores original renamed variant only once', async () => {
    const sale = await models.Sale.findOne({ where: { saleNumber: websiteInternalSaleNumber(ids[1]) } });
    const results = await Promise.all([invoke(sales.reject, {}, { id: sale.id }), invoke(sales.reject, {}, { id: sale.id })]);
    expect(results.filter(r => r.next.mock.calls.length === 0)).toHaveLength(1); expect(await stock()).toEqual([100, 100]);
  });
  test('concurrent return restock uses frozen UUID and only restores once', async () => {
    const body = order(); const imported = await invoke(integration.importLunareaOrder, body);
    expect(imported.next).not.toHaveBeenCalled();
    const sale = await models.Sale.findOne({ where: { saleNumber: websiteInternalSaleNumber(body.order_id) } });
    const line = await models.SaleItem.findOne({ where: { saleId: sale.id } });
    const record = await models.SaleReturn.create({ returnNumber: 'AUDIT-' + randomUUID(), saleId: sale.id,
      requestedBy: operator.id, status: 'ITEM_RECEIVED', reason: 'Synthetic staging return', requestDate: '2026-10-16' });
    const item = await models.SaleReturnItem.create({ returnId: record.id, saleItemId: line.id, productId: product.id,
      variantName: line.variantName, qtySold: 2, qtyRequested: 2 });
    await db.transaction((transaction: any) => editVariants(product.id, [{ id: variant.id, value: 'RENAMED AGAIN', stock: 0 }], transaction));
    const payload = { items: [{ returnItemId: item.id, qtyReceived: 2 }] };
    const result = await Promise.all([invoke(returns.restock, payload, { id: record.id }), invoke(returns.restock, payload, { id: record.id })]);
    expect(result.filter(r => r.next.mock.calls.length === 0)).toHaveLength(1); expect(await stock()).toEqual([100, 100]);
  });
  test('concurrent import followed by retry creates only one sale and stock deduction', async () => {
    const body = order();
    await Promise.all([invoke(integration.importLunareaOrder, body), invoke(integration.importLunareaOrder, body)]);
    const retry = await invoke(integration.importLunareaOrder, body);
    expect(retry.next).not.toHaveBeenCalled();
    expect(await models.Sale.count({ where: { saleNumber: websiteInternalSaleNumber(body.order_id) } })).toBe(1);
    expect(await stock()).toEqual([98, 98]);
  });
  test('copied L00000227 snapshot validates with the verified MT120 mapping without importing or changing stock', async () => {
    const [orders] = await db.query("SELECT id_midtrans,status,email_cus,nama_pen,hp_pen,alamat_pen,kurir,items,data_mid FROM shipping_audit_web.pemesanan WHERE id_midtrans = 'L00000227'");
    expect(orders.length).toBe(1);
    const original = orders[0];
    const items = JSON.parse(original.items), mid = JSON.parse(original.data_mid);
    const originalProduct = await models.Product.findByPk('7ef42be0-9851-4d75-ab2b-13e9acd58990');
    const originalVariant = await models.ProductVariant.findByPk('3b2bb1d3-df78-4272-92b2-87612eac4c1d');
    const before = [originalProduct.stock, originalVariant.stock];
    const countBefore = await models.Sale.count({ where: { saleNumber: original.id_midtrans } });
    process.env.LUNA_WEB_PRODUCT_MAP = JSON.stringify({ B20240116151233: originalProduct.id });
    try {
      const time = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(mid.transaction_time)
        ? mid.transaction_time.replace(' ', 'T') + '+07:00' : mid.transaction_time;
      const result = await invoke(integration.importLunareaOrder, { order_id: original.id_midtrans,
        status: original.status, payment_environment: 'production', customer_email: original.email_cus,
        customer_name: original.nama_pen, customer_phone: original.hp_pen, alamat_pen: original.alamat_pen,
        courier: original.kurir, items, data_mid: mid, transaction_time: time, dry_run: true });
      expect(result.next).not.toHaveBeenCalled();
      expect(result.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ dryRun: true }) }));
      expect([(await originalProduct.reload()).stock, (await originalVariant.reload()).stock]).toEqual(before);
      expect(await models.Sale.count({ where: { saleNumber: original.id_midtrans } })).toBe(countBefore);
    } finally { delete process.env.LUNA_WEB_PRODUCT_MAP; }
  });
  test('manual invoice collision leaves existing row and inventory untouched in MySQL', async () => {
    const body = order(), baseline = await stock();
    const manual = await models.Sale.create({ saleNumber: body.order_id, saleDate: new Date(), totalAmount: 999,
      paymentMethod: 'TRANSFER', platform: 'WHATSAPP', status: 'WAITING_APPROVAL', createdBy: operator.id });
    const result = await invoke(integration.importLunareaOrder, body);
    expect(result.next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    expect(await stock()).toEqual(baseline);
    expect((await manual.reload()).platform).toBe('WHATSAPP');
    expect(await models.Sale.count({ where: { saleNumber: websiteInternalSaleNumber(body.order_id) } })).toBe(0);
  });
  test('source reference survives ordinary notes edits and cannot be rewritten through ORM', async () => {
    const body = order();
    const result = await invoke(integration.importLunareaOrder, body);
    expect(result.next).not.toHaveBeenCalled();
    const sale = await models.Sale.findOne({ where: { saleNumber: websiteInternalSaleNumber(body.order_id) } });
    expect(websiteExternalOrderId(sale)).toBe(body.order_id);
    await sale.update({ notes: 'Synthetic operator notes update' });
    expect(websiteExternalOrderId(await sale.reload())).toBe(body.order_id);
    await expect(sale.update({ notes: appendWebsiteOrderReference('', 'LOTHER') })).rejects.toMatchObject({ statusCode: 409 });
    expect(websiteExternalOrderId(await sale.reload())).toBe(body.order_id);
  });
});
