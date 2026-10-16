const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { spawnSync } = require('node:child_process');

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const PREFIX = 'luna_product_identity_';
const CONFIRMED = Object.freeze({ website: 'B20240116151233', product: '7ef42be0-9851-4d75-ab2b-13e9acd58990',
  variant: '3b2bb1d3-df78-4272-92b2-87612eac4c1d', value: 'CHERRY HITAM' });
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => {
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) return value;
  try { return JSON.parse(String(value)); } catch { return null; }
};
const normalized = value => String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
const fingerprint = rows => sha(JSON.stringify(rows));
let auditStage = 'INITIALIZE';

async function select(db, sql, params = []) {
  if (!/^SELECT\s/i.test(sql) || /\b(?:INTO|FOR\s+UPDATE|GET_LOCK|RELEASE_LOCK|SLEEP|BENCHMARK)\b/i.test(sql)) {
    throw new Error('Non-read-only query rejected');
  }
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function readOnlySnapshot(db, operation) {
  await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await db.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
  try { return await operation(); } finally { await db.rollback(); }
}

function websiteConfig(values) {
  const get = key => values['database.default.' + key];
  if (get('DSN') || (get('DBDriver') && get('DBDriver') !== 'MySQLi') || get('DBPrefix')) {
    throw new Error('Website connection requires explicit review');
  }
  if (!get('database') || !get('username') || !get('hostname')) throw new Error('Website connection incomplete');
  return { host: get('hostname'), port: Number(get('port') || 3306), database: get('database'),
    user: get('username'), password: get('password') || '', connectTimeout: 10000 };
}

async function collectWebsite(db) {
  return readOnlySnapshot(db, async () => ({
    context: await select(db, 'SELECT DATABASE() AS database_name, VERSION() AS server_version, UTC_TIMESTAMP(6) AS observed_at'),
    schema: await select(db, 'SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = ? AND COLUMN_NAME = ?) OR (TABLE_NAME = ? AND COLUMN_NAME = ?)) ORDER BY TABLE_NAME, COLUMN_NAME', ['konstanta', 'value', 'stok', 'nama']),
    products: await select(db, 'SELECT id, nama, active, varian FROM barang ORDER BY id'),
    identities: await select(db, 'SELECT label, value FROM konstanta WHERE LEFT(label, ?) = ? ORDER BY id', [PREFIX.length, PREFIX]),
    orders: await select(db, 'SELECT id_midtrans, status, items, data_mid FROM pemesanan WHERE id_midtrans = ? ORDER BY id', ['L00000227']),
  }));
}

async function collectMaster(db) {
  return readOnlySnapshot(db, async () => ({
    context: await select(db, 'SELECT DATABASE() AS database_name, VERSION() AS server_version, UTC_TIMESTAMP(6) AS observed_at'),
    products: await select(db, 'SELECT id, sku, name, isActive, marketplaceLinks, stock FROM products ORDER BY id'),
    variants: await select(db, 'SELECT id, productId, name, value, stock FROM product_variants ORDER BY productId, id'),
    operators: await select(db, 'SELECT u.id, u.isActive, u.createdAt, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.roleId ORDER BY u.createdAt, u.id'),
    orders: await select(db, 'SELECT id, saleNumber, status, notes FROM sales WHERE saleNumber = ? OR saleNumber LIKE ? OR saleNumber LIKE ? ORDER BY saleNumber', ['L00000227', 'L00000227-CANCELLED-%', 'L00000227-REJECTED-%']),
    items: await select(db, 'SELECT i.id, i.saleId, i.productId, i.variantName, i.quantity, i.price FROM sale_items i JOIN sales s ON s.id = i.saleId WHERE s.saleNumber = ? ORDER BY i.id', ['L00000227']),
  }));
}

function mappingEvidence(web, master, rawMap) {
  const configured = rawMap ? json(rawMap) : {};
  const globalIssues = [];
  if (!configured || Array.isArray(configured) || typeof configured !== 'object') globalIssues.push('INVALID_ENV_MAP');
  const claims = [];
  const add = (website, product, source) => claims.push({ website, product, source });
  for (const [website, product] of Object.entries(configured || {})) {
    if (typeof product !== 'string' || !UUID.test(product)) globalIssues.push('INVALID_ENV_MASTER_UUID');
    else add(website, product, 'CONFIG_EXPLICIT_ID');
  }
  const metadata = new Map();
  for (const row of web.identities) {
    const website = row.label.slice(PREFIX.length), data = json(row.value);
    if (metadata.has(website)) globalIssues.push('DUPLICATE_WEBSITE_METADATA');
    metadata.set(website, data);
    if (data?.version !== 1 || !UUID.test(String(data?.product_id || ''))) globalIssues.push('INVALID_WEBSITE_METADATA');
    else add(website, data.product_id, 'WEBSITE_CANONICAL_METADATA');
  }
  for (const p of master.products) {
    const links = json(p.marketplaceLinks);
    for (const key of ['websiteId', 'website_id']) {
      if (typeof links?.[key] === 'string' && links[key]) add(links[key], p.id, 'MASTER_EXPLICIT_WEBSITE_ID');
    }
    if (web.products.some(w => w.id === p.sku)) add(p.sku, p.id, 'EXACT_SKU_EQUALS_WEBSITE_ID');
  }
  const webIds = new Set(web.products.map(p => p.id));
  const masterIds = new Set(master.products.map(p => p.id));
  for (const claim of claims) {
    if (!webIds.has(claim.website)) globalIssues.push('REFERENCE_TO_MISSING_WEBSITE_PRODUCT');
    if (!masterIds.has(claim.product)) globalIssues.push('REFERENCE_TO_MISSING_MASTER_PRODUCT');
  }
  const rows = web.products.map(w => {
    const matching = claims.filter(c => c.website === w.id);
    const targets = [...new Set(matching.map(c => c.product))];
    const issues = [];
    if (targets.length > 1) issues.push('CONFLICTING_PRODUCT_IDS');
    const product = targets.length === 1 ? master.products.find(p => p.id === targets[0]) : null;
    if (targets.length === 1 && !product) issues.push('MASTER_NOT_FOUND');
    if (product && claims.some(c => c.product === product.id && c.website !== w.id)) issues.push('MASTER_LINKED_TO_MULTIPLE_WEBSITE_IDS');
    const data = metadata.get(w.id);
    const names = json(w.varian);
    if (!Array.isArray(names) || names.some(v => typeof v !== 'string')) issues.push('WEBSITE_VARIANTS_REQUIRE_REVIEW');
    const variants = (Array.isArray(names) ? names.filter(v => typeof v === 'string') : []).map(name => {
      const id = data?.variants?.[name];
      const available = product ? master.variants.filter(v => v.productId === product.id) : [];
      if (id) {
        const exists = available.find(v => v.id === id);
        if (!exists) issues.push('VARIANT_UUID_OWNERSHIP_MISMATCH');
        return { name, status: exists ? 'CANONICAL_REFERENCE_VERIFIED' : 'INVALID_CANONICAL_REFERENCE', master_variant_id: exists?.id || null };
      }
      const exact = available.filter(v => v.value === name);
      const confirmed = w.id === CONFIRMED.website && product?.id === CONFIRMED.product && name === CONFIRMED.value
        && exact.length === 1 && exact[0].id === CONFIRMED.variant;
      return { name, status: confirmed ? 'OPERATOR_CONFIRMED_AND_PRESENT' : (exact.length === 1 ? 'EXACT_LEGACY_NAME_ONLY' : 'UNVERIFIED'),
        master_variant_id: confirmed ? exact[0].id : null };
    });
    const candidates = !product ? master.products.filter(p => normalized(w.nama) === normalized(p.name)
      || (p.name && normalized(w.nama).endsWith(' - ' + normalized(p.name)))) : [];
    return { website_id: w.id, website_name: w.nama, active: Boolean(Number(w.active)),
      status: issues.length ? 'CONFLICT_OR_INVALID' : (product ? 'EXPLICIT_REFERENCE_PRESENT' : 'NO_EXPLICIT_REFERENCE'),
      master_product_id: product?.id || null, master_name: product?.name || null,
      master_active: product ? Boolean(Number(product.isActive)) : null,
      evidence_sources: [...new Set(matching.map(c => c.source))], variants, issues,
      name_candidates_not_approved: candidates.map(p => ({ id: p.id, name: p.name })),
    };
  });
  return { global_issues: [...new Set(globalIssues)],
    summary: { website_products: web.products.length, active_website_products: rows.filter(r => r.active).length,
      master_products: master.products.length, master_variants: master.variants.length,
      explicit_product_references: rows.filter(r => r.status === 'EXPLICIT_REFERENCE_PRESENT').length,
      missing_product_references: rows.filter(r => r.status === 'NO_EXPLICIT_REFERENCE').length,
      conflicting_or_invalid: rows.filter(r => r.status === 'CONFLICT_OR_INVALID').length,
      active_without_reference: rows.filter(r => r.active && r.status !== 'EXPLICIT_REFERENCE_PRESENT').length,
      inactive_master_references: rows.filter(r => r.master_active === false).length,
      stock_parent_differs_from_variant_sum: master.products.filter(p => {
        const variants = master.variants.filter(v => v.productId === p.id);
        return variants.length && Number(p.stock) !== variants.reduce((n, v) => n + Number(v.stock), 0);
      }).length }, rows };
}

function operatorEvidence(users, configuredId) {
  const configured = configuredId ? users.find(u => u.id === configuredId) : null;
  const active = users.filter(u => Boolean(Number(u.isActive)));
  // Actual resolveCreatedBy orders by createdAt only. Equal oldest dates are not deterministic.
  const fallback = active[0];
  return { configured: Boolean(configuredId), configured_exists: Boolean(configured),
    configured_active: configured ? Boolean(Number(configured.isActive)) : null,
    resolution_source: configured ? 'CONFIGURED_USER' : 'OLDEST_ACTIVE_USER_FALLBACK',
    effective_operator_fingerprint: (configured || fallback) ? sha((configured || fallback).id).slice(0, 16) : null,
    effective_role: (configured || fallback)?.role_name || null,
    oldest_created_at_tied: Boolean(fallback && active.filter(u => String(u.createdAt) === String(fallback.createdAt)).length > 1),
    business_owner_approval: 'UNVERIFIED_NO_OWNER_ASSIGNED_BY_AUDIT' };
}

function orderEvidence(web, master) {
  const w = web.orders.length === 1 ? web.orders[0] : null;
  const mid = json(w?.data_mid);
  const items = json(w?.items);
  return { order_number: 'L00000227', website_record_count: web.orders.length,
    website_saved_status: w?.status || null,
    saved_midtrans_status: mid?.transaction_status || null,
    gateway_status_checked_live: false,
    website_items_are_array: Array.isArray(items),
    website_item_count: Array.isArray(items) ? items.length : null,
    master_orders: master.orders.map(s => ({ sale_number: s.saleNumber, status: s.status })),
    master_item_count: master.items.length,
    master_items_without_product: master.items.filter(i => !i.productId).length,
    order_created_or_forwarded_by_audit: false };
}

async function main() {
  auditStage = 'READ_CONFIGURATION_FILES';
  const backend = process.cwd();
  const website = '/mine/lunareafurniture.com/jasmine-shop';
  const backendFile = fs.readFileSync(path.join(backend, '.env'), 'utf8');
  const websiteFile = fs.readFileSync(path.join(website, '.env'), 'utf8');
  const luna = dotenv.parse(backendFile), web = dotenv.parse(websiteFile);
  if (!luna.DB_HOST || !luna.DB_USER || !luna.DB_NAME) throw new Error('Master connection incomplete');
  const mysql = require('mysql2/promise');
  auditStage = 'CONNECT_MASTER';
  const masterDb = await mysql.createConnection({ host: luna.DB_HOST, port: Number(luna.DB_PORT || 3306),
    user: luna.DB_USER, password: luna.DB_PASSWORD || '', database: luna.DB_NAME, connectTimeout: 10000 });
  try {
    auditStage = 'SELECT_MASTER_SNAPSHOT';
    const master = await collectMaster(masterDb);
    auditStage = 'SELECT_WEBSITE_SNAPSHOT_WITH_PHP';
    if (!process.env.AUDIT_PHP_B64) throw new Error('Missing reviewed PHP inspector');
    const phpSource = Buffer.from(process.env.AUDIT_PHP_B64, 'base64').toString('utf8').replace(/^<\?php\s*/, '');
    const php = spawnSync('/usr/bin/php', ['-r', phpSource], { cwd: website,
      env: { ...process.env, LUNA_AUDIT_WEBSITE_ROOT: website }, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 });
    const marker = 'LUNA_WEBSITE_EVIDENCE_JSON=';
    const line = String(php.stdout || '').split(/\r?\n/).find(v => v.startsWith(marker));
    if (php.status !== 0 || !line) {
      const diagnostic = json(String(php.stderr || '').trim());
      if (['READ_CONFIGURATION', 'CONNECT_MYSQLI', 'SELECT_SNAPSHOT'].includes(diagnostic?.website_audit_stage)
        && Number.isInteger(diagnostic?.error_code)) console.error(JSON.stringify({ php_inspector_stage: diagnostic.website_audit_stage, php_error_code: diagnostic.error_code }));
      throw new Error('PHP website inspection failed');
    }
    const websiteData = JSON.parse(line.slice(marker.length));
    auditStage = 'CLASSIFY_EVIDENCE';
    const before = [fingerprint(master.products), fingerprint(master.variants), fingerprint(websiteData.products)];
    const report = { report_version: 1, audit_mode: 'SELECT_ONLY_READ_ONLY_TRANSACTIONS',
      source: 'PRODUCTION_DATABASE_SNAPSHOTS', cross_database_snapshot_is_atomic: false,
      website_connection_driver: 'PHP_MYSQLI_WITH_CI4_DOTENV_PARSER',
      master_context: master.context, website_context: websiteData.context, website_schema: websiteData.schema,
      config_source: 'DISK_ENV_NOT_LIVE_PROCESS_MEMORY',
      integration_tokens_nonempty_and_equal: Boolean(luna.LUNA_WEB_ORDER_TOKEN && web.LUNA_SYSTEM_WEB_ORDER_TOKEN
        && luna.LUNA_WEB_ORDER_TOKEN === web.LUNA_SYSTEM_WEB_ORDER_TOKEN),
      website_identity_flag_on_disk: /^(true|1|yes|on)$/i.test(web.LUNA_PRODUCT_IDENTITY_ENABLED || ''),
      operator: operatorEvidence(master.operators, luna.WEBSITE_ORDER_USER_ID),
      catalogue: mappingEvidence(websiteData, master, luna.LUNA_WEB_PRODUCT_MAP),
      order: orderEvidence(websiteData, master),
      snapshot_fingerprints: { master_products: before[0], master_variants: before[1], website_products: before[2] },
      production_writes_performed: false, credentials_and_customer_fields_in_report: false };
    if (fs.readFileSync(path.join(backend, '.env'), 'utf8') !== backendFile
      || fs.readFileSync(path.join(website, '.env'), 'utf8') !== websiteFile) throw new Error('Configuration changed during audit');
    console.log('LUNA_IDENTITY_EVIDENCE_JSON=' + JSON.stringify(report));
  } finally { await masterDb.end(); }
}

function safeAuditFailure(error) {
  const knownMessages = new Set(['Website connection requires explicit review', 'Website connection incomplete',
    'Master connection incomplete', 'Configuration changed during audit', 'Non-read-only query rejected',
    'Missing reviewed PHP inspector', 'PHP website inspection failed']);
  const knownCodes = new Set(['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_BAD_FIELD_ERROR',
    'ER_NO_SUCH_TABLE', 'ER_PARSE_ERROR', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENOENT', 'EACCES']);
  return knownMessages.has(error?.message) ? error.message : knownCodes.has(error?.code) ? error.code : 'UNCLASSIFIED_FAILURE';
}

module.exports = { select, readOnlySnapshot, websiteConfig, mappingEvidence, operatorEvidence, orderEvidence, collectWebsite, collectMaster, safeAuditFailure };
if (require.main === module || process.env.LUNA_READONLY_AUDIT_STDIN === '1') main().catch((error) => {
  console.error(JSON.stringify({ audit_stage: auditStage, reason: safeAuditFailure(error) }));
  console.error('Read-only evidence audit stopped. No raw SQL, customer data or credentials are printed.');
  process.exitCode = 1;
});
