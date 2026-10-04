import { recoveryScope, readRecovery, listRecovery, writeRecovery, removeRecovery } from './salesDraftRecovery';
const snapshot = { expected_version: 0, draft: { customer_key: 'customer', expected_customer_version: 1, branch_id: 2,
  lines: [{ line_key: 'line', product_id: 3, expected_policy_version: 1, quantity: '2.000001', unit: 'PCS', price: 99, reserved_quantity: '1' }] }, units: [['PCS']] };
beforeEach(() => {
  window.localStorage.clear(); let tail = Promise.resolve();
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: { request: (name, callback) => {
    const result = tail.then(callback); tail = result.catch(() => {}); return result;
  } } });
});
test('scope and branch isolation with whitelisted intent only', async () => {
  const scope = recoveryScope(1, 2);
  await writeRecovery(scope, 'doc', 0, { ...snapshot, token: 'never-store', customer: { name: 'private' }, approvals: ['old'] });
  expect(listRecovery(recoveryScope(2, 2))).toEqual([]); expect(listRecovery(recoveryScope(1, 3))).toEqual([]);
  expect(listRecovery(scope, 3)).toEqual([]); expect(listRecovery(scope, 2)).toHaveLength(1);
  const raw = JSON.stringify(readRecovery(scope, 'doc'));
  expect(raw).not.toMatch(/never-store|private|approvals|reserved_quantity|price/);
  expect(raw).toContain('2.000001');
});
test('concurrent writers cannot overwrite an existing recovery revision', async () => {
  const writes = await Promise.allSettled([writeRecovery('1:2', 'doc', 0, snapshot), writeRecovery('1:2', 'doc', 0, snapshot)]);
  expect(writes.filter(row => row.status === 'fulfilled')).toHaveLength(1);
  expect(readRecovery('1:2', 'doc').revision).toBe(1);
  await expect(removeRecovery('1:2', 'doc', 0)).rejects.toThrow('another tab');
  await removeRecovery('1:2', 'doc', 1); expect(readRecovery('1:2', 'doc')).toBeNull();
});
test('pending exact operation survives reconstruction and cannot differ from draft', async () => {
  const pending = { operation_key: 'stable', expected_version: 0, draft: snapshot.draft };
  await writeRecovery('1:2', 'doc', 0, { ...snapshot, pending });
  expect(readRecovery('1:2', 'doc').snapshot.pending.operation_key).toBe('stable');
  await expect(writeRecovery('1:2', 'doc', 1, { ...snapshot, pending: { ...pending, expected_version: 1 } })).rejects.toThrow('does not match');
});
test('missing browser locks and storage failures are explicit, not success', async () => {
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: undefined });
  await expect(writeRecovery('1:2', 'doc', 0, snapshot)).rejects.toThrow('locking support');
  expect(readRecovery('1:2', 'doc')).toBeNull();
  expect(() => recoveryScope(1, undefined)).toThrow('authenticated');
});

test('quota failure leaves the prior record intact and rejects the write', async () => {
  await writeRecovery('1:2', 'doc', 0, snapshot);
  const setter = jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
  await expect(writeRecovery('1:2', 'doc', 1, snapshot)).rejects.toThrow('quota');
  expect(readRecovery('1:2', 'doc').revision).toBe(1); setter.mockRestore();
});

test('deleted and recreated draft cannot be overwritten by an older tab revision', async () => {
  const original = await writeRecovery('1:2', 'doc', 0, snapshot);
  await removeRecovery('1:2', 'doc', original.revision);
  const replacement = await writeRecovery('1:2', 'doc', 0, snapshot);
  expect(replacement.revision).toBeGreaterThan(original.revision);
  await expect(writeRecovery('1:2', 'doc', original.revision, snapshot)).rejects.toThrow('another tab');
});

test('copy source is retained only as a validated local envelope field', async () => {
  const source_reference = { document_key: '11111111-1111-4111-8111-111111111111', version: 2 };
  await writeRecovery('1:2', 'new-doc', 0, { ...snapshot, source_reference,
    payments: ['never-store'], collection: 'never-store', reservations: ['never-store'] });
  const stored = readRecovery('1:2', 'new-doc').snapshot;
  expect(stored.source_reference).toEqual(source_reference);
  expect(stored.draft).not.toHaveProperty('source_reference');
  expect(JSON.stringify(stored)).not.toContain('never-store');
  await expect(writeRecovery('1:2', 'bad-doc', 0, { ...snapshot,
    source_reference: { document_key: 'not-a-document', version: 1 } })).rejects.toThrow('Invalid copy source');
});
