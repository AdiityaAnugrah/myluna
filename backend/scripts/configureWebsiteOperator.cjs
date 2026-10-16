const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

async function resolveApprovedOperator(db, username, role) {
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(username || '') || !/^[A-Z_]{1,50}$/.test(role || '')) throw new Error('Invalid approved operator input');
  const [rows] = await db.execute('SELECT u.id, u.username, u.isActive, r.name AS role_name FROM users u JOIN roles r ON r.id = u.roleId WHERE u.username = ?', [username]);
  if (rows.length !== 1 || rows[0].username !== username || !Number(rows[0].isActive) || rows[0].role_name !== role
    || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(rows[0].id)) throw new Error('Approved operator verification failed');
  return rows[0];
}

function prepareOperatorEnvironment(source, id) {
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid operator UUID');
  const pattern = /^(?:[ \t]*export[ \t]+)?[ \t]*WEBSITE_ORDER_USER_ID[ \t]*=.*$/gm;
  if ((source.match(pattern) || []).length > 1) throw new Error('Duplicate operator environment key');
  const current = dotenv.parse(source).WEBSITE_ORDER_USER_ID;
  if (current && current !== id) throw new Error('Configured operator changed; explicit conflict review required');
  const line = 'WEBSITE_ORDER_USER_ID=' + id;
  return source.match(pattern) ? source.replace(pattern, line) : source + (source.endsWith('\n') ? '' : '\n') + line + '\n';
}

async function main() {
  const filename = path.resolve('.env');
  const original = fs.readFileSync(filename, 'utf8'), config = dotenv.parse(original);
  if (!config.DB_HOST || !config.DB_USER || !config.DB_NAME) throw new Error('Missing database configuration');
  const db = await require('mysql2/promise').createConnection({ host: config.DB_HOST, port: Number(config.DB_PORT || 3306),
    user: config.DB_USER, password: config.DB_PASSWORD || '', database: config.DB_NAME, connectTimeout: 10000 });
  let operator;
  try {
    await db.query('START TRANSACTION READ ONLY');
    operator = await resolveApprovedOperator(db, process.env.APPROVED_OPERATOR_USERNAME, process.env.APPROVED_OPERATOR_ROLE);
  } finally { try { await db.rollback(); } finally { await db.end(); } }
  const next = prepareOperatorEnvironment(original, operator.id);
  let changed = false;
  if (process.env.LUNA_OPERATOR_APPLY === '1' && dotenv.parse(original).WEBSITE_ORDER_USER_ID !== operator.id) {
    const folder = path.resolve('.release-private');
    fs.mkdirSync(folder, { recursive: true, mode: 0o700 }); fs.chmodSync(folder, 0o700);
    const suffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    fs.writeFileSync(path.join(folder, 'env-before-operator-' + suffix), original, { flag: 'wx', mode: 0o600 });
    if (fs.readFileSync(filename, 'utf8') !== original) throw new Error('Environment changed concurrently');
    const temp = path.resolve('.env.identity-release-operator-' + suffix + '.tmp');
    fs.writeFileSync(temp, next, { flag: 'wx', mode: fs.statSync(filename).mode & 0o777 });
    if (fs.readFileSync(filename, 'utf8') !== original) throw new Error('Environment changed concurrently');
    fs.renameSync(temp, filename);
    if (dotenv.parse(fs.readFileSync(filename, 'utf8')).WEBSITE_ORDER_USER_ID !== operator.id) throw new Error('Operator configuration readback failed');
    changed = true;
  }
  console.log(JSON.stringify({ approved_operator_verified: true, active: true, expected_role_verified: true,
    operator_fingerprint: crypto.createHash('sha256').update(operator.id).digest('hex').slice(0, 16),
    configuration_changed: changed, database_writes: false, password_used: false }));
}

module.exports = { resolveApprovedOperator, prepareOperatorEnvironment };
if (require.main === module || process.env.LUNA_OPERATOR_CONFIG_STDIN === '1') main().catch(() => {
  console.error('Approved operator verification/configuration failed; no database records changed. Credentials are not logged.');
  process.exitCode = 1;
});
