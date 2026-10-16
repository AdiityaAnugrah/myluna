const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

const VERIFIED = Object.freeze({ websiteId: 'B20240116151233', productId: '7ef42be0-9851-4d75-ab2b-13e9acd58990',
  variantId: '3b2bb1d3-df78-4272-92b2-87612eac4c1d', sku: 'SKU-1773394485448-MT12', variant: 'CHERRY HITAM' });

function mergedMap(raw) {
  const result = raw ? JSON.parse(raw) : {};
  if (!result || Array.isArray(result) || typeof result !== 'object') throw new Error('Invalid map');
  const seen = new Set();
  for (const [key, id] of Object.entries(result)) {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(key) || typeof id !== 'string'
      || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || seen.has(id.toLowerCase())) throw new Error('Invalid existing map');
    seen.add(id.toLowerCase());
    if (key === VERIFIED.websiteId && id !== VERIFIED.productId) throw new Error('Conflicting website mapping');
    if (id.toLowerCase() === VERIFIED.productId && key !== VERIFIED.websiteId) throw new Error('Conflicting master mapping');
  }
  return { ...result, [VERIFIED.websiteId]: VERIFIED.productId };
}

function mapDiagnostics(raw) {
  try {
    const map = raw ? JSON.parse(raw) : {};
    if (!map || Array.isArray(map) || typeof map !== 'object') return { format: 'invalid' };
    const seen = new Set();
    return { format: 'object', entries: Object.entries(map).map(([key, value]) => {
      const validId = typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
      const duplicate = validId && seen.has(value.toLowerCase());
      if (validId) seen.add(value.toLowerCase());
      return { confirmed_website: key === VERIFIED.websiteId,
        valid_key: /^[A-Za-z0-9_-]{1,100}$/.test(key), valid_master_uuid: validId,
        confirmed_master: value === VERIFIED.productId, duplicate_master: duplicate };
    }) };
  } catch { return { format: 'invalid_json' }; }
}

function updatedEnvironment(source, map) {
  const pattern = /^(?:[ \t]*export[ \t]+)?[ \t]*LUNA_WEB_PRODUCT_MAP[ \t]*=.*$/gm;
  const matches = source.match(pattern) || [];
  if (matches.length > 1) throw new Error('Duplicate environment key');
  const line = "LUNA_WEB_PRODUCT_MAP='" + JSON.stringify(map) + "'";
  return matches.length ? source.replace(pattern, line) : source + (source.endsWith('\n') ? '' : '\n') + line + '\n';
}

async function verifyMaster(db) {
  const [products] = await db.execute('SELECT id, sku, isActive, marketplaceLinks FROM products WHERE id = ?', [VERIFIED.productId]);
  if (products.length !== 1 || products[0].sku !== VERIFIED.sku || !Number(products[0].isActive)) throw new Error('Master product preflight failed');
  let links = products[0].marketplaceLinks;
  if (typeof links === 'string' && links) links = JSON.parse(links);
  for (const key of ['websiteId', 'website_id']) {
    if (links?.[key] && links[key] !== VERIFIED.websiteId) throw new Error('Stored marketplace mapping conflicts');
  }
  const [variants] = await db.execute('SELECT id, productId, value FROM product_variants WHERE id = ? AND productId = ?', [VERIFIED.variantId, VERIFIED.productId]);
  if (variants.length !== 1 || variants[0].value !== VERIFIED.variant) throw new Error('Master variant preflight failed');
}

async function main() {
  const filename = path.resolve('.env');
  const original = fs.readFileSync(filename, 'utf8');
  const config = dotenv.parse(original);
  console.log(JSON.stringify({ mapping_diagnostics: mapDiagnostics(config.LUNA_WEB_PRODUCT_MAP) }));
  const map = mergedMap(config.LUNA_WEB_PRODUCT_MAP);
  const mysql = require('mysql2/promise');
  const db = await mysql.createConnection({ host: config.DB_HOST, port: Number(config.DB_PORT || 3306),
    database: config.DB_NAME, user: config.DB_USER, password: config.DB_PASSWORD || '', connectTimeout: 10000 });
  let operatorConfigured = false;
  try {
    await verifyMaster(db);
    if (config.WEBSITE_ORDER_USER_ID) {
      const [users] = await db.execute('SELECT id FROM users WHERE id = ? AND isActive = 1', [config.WEBSITE_ORDER_USER_ID]);
      if (users.length !== 1) throw new Error('Configured operator preflight failed');
      operatorConfigured = true;
    }
  } finally { await db.end(); }
  const next = updatedEnvironment(original, map);
  let changed = false;
  if (process.argv.includes('--apply-verified-mt120') && dotenv.parse(original).LUNA_WEB_PRODUCT_MAP !== JSON.stringify(map)) {
    const folder = path.resolve('.release-private');
    fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
    fs.chmodSync(folder, 0o700);
    const suffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const backup = path.join(folder, 'env-before-identity-' + suffix);
    fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 });
    if (fs.readFileSync(filename, 'utf8') !== original) throw new Error('Environment changed concurrently');
    const temp = path.resolve('.env.identity-release-' + suffix + '.tmp');
    fs.writeFileSync(temp, next, { flag: 'wx', mode: fs.statSync(filename).mode & 0o777 });
    fs.renameSync(temp, filename);
    changed = true;
  }
  console.log(JSON.stringify({ identity_preflight: 'passed', verified_product: 'MT120',
    mapping_changed: changed, operator_explicitly_configured: operatorConfigured, database_writes: false }));
}

function safeFailureReason(error) {
  const reasons = new Set(['Invalid map', 'Invalid existing map', 'Conflicting website mapping',
    'Conflicting master mapping', 'Duplicate environment key', 'Master product preflight failed',
    'Stored marketplace mapping conflicts', 'Master variant preflight failed',
    'Configured operator preflight failed', 'Environment changed concurrently']);
  if (reasons.has(error?.message)) return error.message;
  if (error instanceof SyntaxError) return 'Invalid JSON configuration or master metadata';
  const codes = new Set(['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_BAD_FIELD_ERROR',
    'ER_NO_SUCH_TABLE', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENOENT', 'EACCES']);
  return codes.has(error?.code) ? error.code : 'Unexpected preflight failure';
}

module.exports = { VERIFIED, mergedMap, updatedEnvironment, verifyMaster, safeFailureReason, mapDiagnostics };
if (require.main === module) main().catch((error) => {
  console.error('Preflight reason: ' + safeFailureReason(error));
  console.error('Identity release preflight failed. Database records were not modified; inspect schema, mapping and operator configuration privately.');
  process.exitCode = 1;
});
