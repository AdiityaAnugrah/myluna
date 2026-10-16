export {};
const fs = require('node:fs');
const path = require('node:path');
const { select, readOnlySnapshot, websiteConfig, mappingEvidence, operatorEvidence, orderEvidence,
  collectWebsite, collectMaster, safeAuditFailure } = require('../scripts/auditWebsiteIdentityEvidence.cjs');

describe('read-only production evidence', () => {
  test('failure diagnostics never echo credentials or raw SQL', () => {
    expect(safeAuditFailure({ code: 'ER_BAD_FIELD_ERROR', message: 'private query' })).toBe('ER_BAD_FIELD_ERROR');
    expect(safeAuditFailure(new Error('private password'))).toBe('UNCLASSIFIED_FAILURE');
  });
  const productId = '7ef42be0-9851-4d75-ab2b-13e9acd58990';
  const variantId = '3b2bb1d3-df78-4272-92b2-87612eac4c1d';
  const fixtures = () => ({
    web: { products: [{ id: 'B20240116151233', nama: 'Meja Tulis - MT 120', active: 1, varian: '["CHERRY HITAM"]' }], identities: [], orders: [] },
    master: { products: [{ id: productId, name: 'MT 120', sku: 'SKU-MT120', isActive: 1, marketplaceLinks: null, stock: 23 }],
      variants: [{ id: variantId, productId, value: 'CHERRY HITAM', stock: 33 }], orders: [], items: [] },
  });
  test('names are candidates only, never proof of canonical identity', () => {
    const { web, master } = fixtures();
    const report = mappingEvidence(web, master, '{}');
    expect(report.summary.explicit_product_references).toBe(0);
    expect(report.rows[0].name_candidates_not_approved).toHaveLength(1);
    expect(report.rows[0].master_product_id).toBeNull();
  });
  test('confirmed exact UUID pair and variant are checked against actual records', () => {
    const { web, master } = fixtures();
    const report = mappingEvidence(web, master, JSON.stringify({ B20240116151233: productId }));
    expect(report.rows[0].status).toBe('EXPLICIT_REFERENCE_PRESENT');
    expect(report.rows[0].variants[0].status).toBe('OPERATOR_CONFIRMED_AND_PRESENT');
    expect(report.summary.stock_parent_differs_from_variant_sum).toBe(1);
    expect(JSON.stringify(report)).not.toContain('"stock":');
  });
  test('conflicting references and variant ownership are not approved', () => {
    const { web, master } = fixtures();
    (web.identities as any[]).push({ label: 'luna_product_identity_B20240116151233', value: JSON.stringify({ version: 1, product_id: productId, variants: { 'CHERRY HITAM': 'foreign-variant' } }) });
    const report = mappingEvidence(web, master, '{}');
    expect(report.rows[0].status).toBe('CONFLICT_OR_INVALID');
    expect(report.rows[0].issues).toContain('VARIANT_UUID_OWNERSHIP_MISMATCH');
  });
  test('one master linked to multiple website IDs fails evidence classification', () => {
    const { web, master } = fixtures();
    (web.products as any[]).push({ ...web.products[0], id: 'BOTHER' });
    const report = mappingEvidence(web, master, JSON.stringify({ B20240116151233: productId, BOTHER: productId }));
    expect(report.summary.conflicting_or_invalid).toBe(2);
  });
  test('operator fallback is described, not silently assigned or called approved', () => {
    const report = operatorEvidence([{ id: 'private-id', isActive: 1, createdAt: '2026-01-01', role_name: 'ADMIN', email: 'private-email' }], '');
    expect(report.resolution_source).toBe('OLDEST_ACTIVE_USER_FALLBACK');
    expect(report.business_owner_approval).toMatch(/^UNVERIFIED/);
    expect(JSON.stringify(report)).not.toContain('private-');
  });
  test('customer fields and payment credentials are excluded from order evidence', () => {
    const report = orderEvidence({ orders: [{ status: 'Proses', items: '[]', email_cus: 'private-email', data_mid: '{"transaction_status":"settlement","secret":"private-value"}' }] }, { orders: [], items: [] });
    expect(report.saved_midtrans_status).toBe('settlement');
    expect(report.gateway_status_checked_live).toBe(false);
    expect(JSON.stringify(report)).not.toContain('private-');
  });
  test('snapshot always rolls back and selects only guarded queries', async () => {
    const db = { query: jest.fn().mockResolvedValue(undefined), rollback: jest.fn().mockResolvedValue(undefined), execute: jest.fn().mockResolvedValue([[]]) };
    await expect(readOnlySnapshot(db, () => { throw new Error('synthetic'); })).rejects.toThrow('synthetic');
    expect(db.query.mock.calls[1][0]).toContain('READ ONLY');
    expect(db.rollback).toHaveBeenCalledTimes(1);
    await expect(select(db, 'DELETE FROM products')).rejects.toThrow();
    await expect(select(db, 'SELECT * FROM products FOR UPDATE')).rejects.toThrow();
    await collectMaster(db); await collectWebsite(db);
    for (const [sql] of db.execute.mock.calls) expect(sql).toMatch(/^SELECT /);
    expect(db.execute.mock.calls.some(([sql]: any[]) => /SELECT\s+\*/i.test(sql))).toBe(false);
  });
  test('connection ambiguity is rejected rather than guessed', () => {
    expect(() => websiteConfig({ 'database.default.DSN': 'private-dsn' })).toThrow();
    expect(() => websiteConfig({})).toThrow();
  });
  test('audit workflow never pulls, deploys, installs, restarts or migrates production', () => {
    const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/identity-evidence.yml'), 'utf8');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/git (?:pull|reset)|npm (?:ci|install)|pm2|migrat|apply_verified/i);
    expect(workflow).toContain('LUNA_READONLY_AUDIT_STDIN=1');
  });
  test('PHP inspector uses the CI4 parser, read-only transaction and no application bootstrap', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../scripts/readWebsiteIdentityEvidence.php'), 'utf8');
    expect(source).toContain('CodeIgniter\\Config\\DotEnv');
    expect(source).toContain('WITH CONSISTENT SNAPSHOT, READ ONLY');
    expect(source).toContain('$db->rollback()');
    expect(source).not.toMatch(/INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|Boot::|spark/);
  });
});
