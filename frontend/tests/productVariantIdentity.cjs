const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../lib/validations/schemas.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded._compile(compiled, filename);
const { productSchema } = loaded.exports;
const product = {
  name: 'MT 120', categoryId: '33333333-3333-4333-8333-333333333333', unit: 'pcs', sellingPrice: 445550, minStock: 0,
  variants: [{ id: '11111111-1111-4111-8111-111111111111', name: 'HITAM', value: 'HITAM', stock: 26 }],
};
test('form validation retains original variant UUID', () => {
  assert.equal(productSchema.parse(product).variants[0].id, product.variants[0].id);
});
test('new variant may omit UUID; malformed submitted UUID is rejected', () => {
  assert.equal(productSchema.safeParse({ ...product, variants: [{ value: 'PUTIH', stock: 0 }] }).success, true);
  assert.equal(productSchema.safeParse({ ...product, variants: [{ ...product.variants[0], id: 'invalid' }] }).success, false);
});
