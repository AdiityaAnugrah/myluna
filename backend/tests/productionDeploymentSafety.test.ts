import fs from 'fs';
import path from 'path';

describe('production deployment and inspection safety', () => {
  const root = path.resolve(__dirname, '../..');
  test('production workflow is manual and excludes automatic database maintenance', () => {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toMatch(/^\s*push\s*:/m);
    expect(workflow).not.toMatch(/npm run (?:migrate|seed|reconcile):/);
    expect(workflow).toContain('cancel-in-progress: false');
  });
  test('operator inspection script contains SELECT statements only', () => {
    const sql = fs.readFileSync(path.join(root, 'PRODUCTION_IDENTITY_CHECK_READONLY.sql'), 'utf8')
      .replace(/--[^\r\n]*/g, '');
    const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement).toMatch(/^SELECT\b/i);
      expect(statement).not.toMatch(/\b(?:INTO\s+OUTFILE|FOR\s+UPDATE|GET_LOCK|RELEASE_LOCK)\b/i);
    }
  });
});
