export {};
const { resolveApprovedOperator, prepareOperatorEnvironment } = require('../scripts/configureWebsiteOperator.cjs');
const fs = require('node:fs'), path = require('node:path');
describe('explicit website operator configuration', () => {
  test('workflow never deploys code or changes database, only approved config and backend restart', () => {
    const workflow = fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/website-operator.yml'), 'utf8');
    expect(workflow).not.toMatch(/git pull|npm (?:ci|install)|migrat|pm2 restart all/);
    expect(workflow).toContain('pm2 restart luna-backend --update-env');
    expect(workflow).toContain('default: false');
    expect(workflow).not.toContain('operator_password');
  });
  const id = '11111111-1111-4111-8111-111111111111';
  test('requires exact approved username, role, active record and UUID', async () => {
    const db = { execute: jest.fn().mockResolvedValue([[{ id, username: 'approved', role_name: 'DEV', isActive: 1 }]]) };
    expect((await resolveApprovedOperator(db, 'approved', 'DEV')).id).toBe(id);
    expect(db.execute.mock.calls[0][0]).toMatch(/^SELECT /);
    await expect(resolveApprovedOperator(db, 'other', 'DEV')).rejects.toThrow();
    await expect(resolveApprovedOperator(db, 'approved', 'ADMIN')).rejects.toThrow();
    db.execute.mockResolvedValue([[{ id, username: 'approved', role_name: 'DEV', isActive: 0 }]]);
    await expect(resolveApprovedOperator(db, 'approved', 'DEV')).rejects.toThrow();
  });
  test('does not select first active account when approved account is missing', async () => {
    await expect(resolveApprovedOperator({ execute: async () => [[]] }, 'approved', 'DEV')).rejects.toThrow();
  });
  test('preserves unrelated environment keys and rejects conflicting existing operator', () => {
    const source = 'UNRELATED=synthetic-test-only\n';
    expect(prepareOperatorEnvironment(source, id)).toBe(source + 'WEBSITE_ORDER_USER_ID=' + id + '\n');
    expect(() => prepareOperatorEnvironment('WEBSITE_ORDER_USER_ID=other\n', id)).toThrow();
    expect(() => prepareOperatorEnvironment('WEBSITE_ORDER_USER_ID=\nWEBSITE_ORDER_USER_ID=\n', id)).toThrow();
  });
});
