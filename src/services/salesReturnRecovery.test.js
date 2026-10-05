import { readReturnRecovery, removeReturnRecovery, returnRecoveryScope, writeReturnRecovery } from './salesReturnRecovery';

const invoice = '10000000-0000-4000-8000-000000000001';
const returned = '20000000-0000-4000-8000-000000000001';

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window.navigator, 'locks', { configurable: true,
    value: { request: jest.fn((name, work) => Promise.resolve(work())) } });
});

test('isolates and removes one exact uncertain return request', async () => {
  const scope = returnRecoveryScope(7, 12, invoice);
  const body = { return_key: returned, operation_key: '30000000-0000-4000-8000-000000000001',
    returner_name: 'Synthetic Returner', returner_contact: '2 500 000', reason: 'Wrong size', lines: [] };
  const saved = await writeReturnRecovery(scope, 0, 'CLAIM', returned, body);
  expect(readReturnRecovery(scope)).toMatchObject({ revision: 1, kind: 'CLAIM', return_key: returned, body });
  expect(() => readReturnRecovery(returnRecoveryScope(8, 12, invoice))).not.toThrow();
  expect(readReturnRecovery(returnRecoveryScope(8, 12, invoice))).toBeNull();
  await removeReturnRecovery(scope, saved.revision);
  expect(readReturnRecovery(scope)).toBeNull();
});

test('does not let an older tab replace a newer exact intent', async () => {
  const scope = returnRecoveryScope(7, 12, invoice);
  await writeReturnRecovery(scope, 0, 'CREDIT_NOTE', returned, { operation_key: '30000000-0000-4000-8000-000000000001' });
  await expect(writeReturnRecovery(scope, 0, 'CREDIT_NOTE', returned, { operation_key: '40000000-0000-4000-8000-000000000001' }))
    .rejects.toThrow('changed in another tab');
});
