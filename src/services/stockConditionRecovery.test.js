import {
  readStockConditionRecovery, removeStockConditionRecovery,
  stockConditionRecoveryScope, writeStockConditionRecovery,
} from './stockConditionRecovery';

const operationKey = '10000000-0000-4000-8000-000000000001';
const caseKey = '20000000-0000-4000-8000-000000000001';

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'locks', { configurable: true,
    value: { request: jest.fn((name, work) => Promise.resolve(work())) } });
});

test('stores and removes an exact company-user-source request under a revision lock', async () => {
  const scope = stockConditionRecoveryScope(7, 9, 'REQUEST', 44);
  const body = { operation_key: operationKey, credit_note_line_id: 44,
    expected_source_version: 8, quantity: '9007199254740993.000001', reason: 'Verified returned damage' };
  const saved = await writeStockConditionRecovery(scope, 0, body);
  expect(readStockConditionRecovery(scope)).toEqual(expect.objectContaining({
    action: 'REQUEST', target: '44', revision: 1, body,
  }));
  await expect(writeStockConditionRecovery(scope, 0, body)).rejects.toThrow(/another tab/);
  await removeStockConditionRecovery(scope, saved.revision);
  expect(readStockConditionRecovery(scope)).toBeNull();
});

test('separates review and execution scopes and rejects changed payload shape', async () => {
  const reviewScope = stockConditionRecoveryScope(7, 9, 'REVIEW', caseKey);
  const executeScope = stockConditionRecoveryScope(7, 9, 'EXECUTE', caseKey);
  await writeStockConditionRecovery(reviewScope, 0, { operation_key: operationKey,
    expected_version: 1, outcome: 'APPROVED', reason: 'Checked independently' });
  await writeStockConditionRecovery(executeScope, 0, { operation_key: operationKey });
  expect(readStockConditionRecovery(reviewScope).action).toBe('REVIEW');
  expect(readStockConditionRecovery(executeScope).action).toBe('EXECUTE');
  await expect(writeStockConditionRecovery(stockConditionRecoveryScope(7, 9, 'REQUEST', 45), 0, {
    operation_key: operationKey, credit_note_line_id: 44, expected_source_version: 8,
    quantity: '1.000000', reason: 'Wrong source', target_damaged: '1.000000',
  })).rejects.toThrow(/Invalid recovered stock-condition request/);
});

test('fails closed without authenticated scope or browser locking', async () => {
  expect(() => stockConditionRecoveryScope(0, 9, 'REQUEST', 44)).toThrow(/Authenticated company/);
  expect(() => stockConditionRecoveryScope(7, 9, 'REVIEW', 'not-a-case')).toThrow(/exact stock-condition/);
  Object.defineProperty(window.navigator, 'locks', { configurable: true, value: undefined });
  const scope = stockConditionRecoveryScope(7, 9, 'EXECUTE', caseKey);
  await expect(writeStockConditionRecovery(scope, 0, { operation_key: operationKey })).rejects.toThrow(/browser locking/);
});
