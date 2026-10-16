export {};
const { VERIFIED, mergedMap, updatedEnvironment, verifyMaster, safeFailureReason, mapDiagnostics, prepareReleaseMap } = require('../scripts/verifyWebsiteIdentityRelease.cjs');

describe('read-only identity release preflight', () => {
  test('invalid legacy values require explicit quarantine and are preserved without guessing', () => {
    const raw = JSON.stringify({ UNKNOWN: 'unresolved-placeholder', BOTHER: '11111111-1111-4111-8111-111111111111' });
    expect(() => prepareReleaseMap(raw)).toThrow();
    const result = prepareReleaseMap(raw, true);
    expect(result.quarantined).toEqual({ UNKNOWN: 'unresolved-placeholder' });
    expect(result.map).toEqual({ BOTHER: '11111111-1111-4111-8111-111111111111', [VERIFIED.websiteId]: VERIFIED.productId });
    expect(result.map.UNKNOWN).toBeUndefined();
  });
  test('quarantine never resolves conflicting valid UUIDs or malformed map containers', () => {
    expect(() => prepareReleaseMap(JSON.stringify({ [VERIFIED.websiteId]: '11111111-1111-4111-8111-111111111111' }), true)).toThrow();
    expect(() => prepareReleaseMap(JSON.stringify({ B1: VERIFIED.productId, B2: VERIFIED.productId }), true)).toThrow();
    expect(() => prepareReleaseMap('[]', true)).toThrow();
  });
  test('mapping diagnostics report shape only, never keys or values', () => {
    const result = JSON.stringify(mapDiagnostics(JSON.stringify({ 'PRIVATE NAME': 'PRIVATE VALUE' })));
    expect(result).not.toContain('PRIVATE');
    expect(result).toContain('"valid_master_uuid":false');
  });
  test('diagnostics expose only known reasons, never raw connection or SQL errors', () => {
    expect(safeFailureReason(new Error('Conflicting master mapping'))).toBe('Conflicting master mapping');
    expect(safeFailureReason({ code: 'ER_BAD_FIELD_ERROR', message: 'secret SQL' })).toBe('ER_BAD_FIELD_ERROR');
    expect(safeFailureReason(new Error('secret credential'))).toBe('Unexpected preflight failure');
  });
  test('adds only confirmed mapping and retains existing mappings', () => {
    expect(mergedMap(JSON.stringify({ BOTHER: '11111111-1111-4111-8111-111111111111' })))
      .toEqual({ BOTHER: '11111111-1111-4111-8111-111111111111', [VERIFIED.websiteId]: VERIFIED.productId });
  });
  test('conflicting and duplicate identities fail closed', () => {
    expect(() => mergedMap(JSON.stringify({ [VERIFIED.websiteId]: '11111111-1111-4111-8111-111111111111' }))).toThrow();
    expect(() => mergedMap(JSON.stringify({ BOTHER: VERIFIED.productId }))).toThrow();
    expect(() => mergedMap('[]')).toThrow();
  });
  test('keeps unrelated environment values unchanged and rejects duplicate map keys', () => {
    const source = 'DB_PASSWORD=synthetic-test-only\nOTHER=true\n';
    expect(updatedEnvironment(source, mergedMap(''))).toContain(source);
    expect(() => updatedEnvironment('LUNA_WEB_PRODUCT_MAP={}\nLUNA_WEB_PRODUCT_MAP={}\n', {})).toThrow();
  });
  test('master verification runs SELECT only and checks ownership', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ id: VERIFIED.productId, sku: VERIFIED.sku, isActive: 1, marketplaceLinks: null }]])
      .mockResolvedValueOnce([[{ id: VERIFIED.variantId, productId: VERIFIED.productId, value: VERIFIED.variant }]]);
    await verifyMaster({ execute });
    for (const [sql] of execute.mock.calls) expect(sql).toMatch(/^SELECT /);
  });
  test('does not accept a different master variant', async () => {
    const execute = jest.fn().mockResolvedValueOnce([[{ sku: VERIFIED.sku, isActive: 1 }]])
      .mockResolvedValueOnce([[{ value: 'OTHER' }]]);
    await expect(verifyMaster({ execute })).rejects.toThrow();
  });
});
