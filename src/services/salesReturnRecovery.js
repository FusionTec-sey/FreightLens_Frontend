// Exact uncertain sales-return intent only. It is scoped to one company, user and
// invoice and removed after a confirmed response. Tokens, card data, prices and
// credit amounts are never stored. Claim contact/reason are unavoidable request
// inputs; local recovery must therefore remain authenticated-user scoped.
const prefix = 'freightlens.sales-return-recovery.v1:';
const lockName = 'freightlens.sales-return-recovery.v1';
const uuid = value => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export function returnRecoveryScope(orgId, userId, invoiceKey) {
  if (!positive(orgId) || !positive(userId) || !uuid(invoiceKey)) throw new Error('Authenticated company, user and invoice are required for safe return recovery.');
  return `${Number(orgId)}:${Number(userId)}:${invoiceKey.toLowerCase()}`;
}
const key = scope => {
  if (!/^\d+:\d+:[0-9a-f-]{36}$/.test(scope)) throw new Error('Invalid return recovery scope.');
  return `${prefix}${scope}`;
};
function safeRecord(value) {
  if (!value || value.format !== 1 || !positive(value.revision)) throw new Error('Unrecognised return recovery record. Original retained.');
  if (!['CLAIM', 'CREDIT_NOTE'].includes(value.kind) || !uuid(value.return_key) || !value.body || typeof value.body !== 'object') throw new Error('Invalid return recovery intent. Original retained.');
  const raw = JSON.stringify(value.body);
  if (raw.length > 100000 || raw.includes('Authorization') || raw.includes('token')) throw new Error('Unsafe return recovery intent. Original retained.');
  return { format: 1, revision: Number(value.revision), kind: value.kind,
    return_key: value.return_key, body: JSON.parse(raw), updated_at: value.updated_at };
}
export function readReturnRecovery(scope) {
  const raw = window.localStorage.getItem(key(scope));
  return raw ? safeRecord(JSON.parse(raw)) : null;
}
async function locked(work) {
  if (!window.navigator.locks?.request) throw new Error('Safe return recovery requires browser locking support. Keep this screen open.');
  return window.navigator.locks.request(lockName, work);
}
export async function writeReturnRecovery(scope, expectedRevision, kind, returnKey, body) {
  return locked(() => {
    const previous = readReturnRecovery(scope);
    if ((previous?.revision || 0) !== expectedRevision) throw new Error('Return recovery changed in another tab. Reload before continuing.');
    const row = safeRecord({ format: 1, revision: expectedRevision + 1, kind,
      return_key: returnKey, body, updated_at: new Date().toISOString() });
    window.localStorage.setItem(key(scope), JSON.stringify(row));
    return row;
  });
}
export async function removeReturnRecovery(scope, expectedRevision) {
  return locked(() => {
    const previous = readReturnRecovery(scope);
    if ((previous?.revision || 0) !== expectedRevision) throw new Error('Return recovery changed in another tab and was not removed.');
    window.localStorage.removeItem(key(scope));
  });
}
