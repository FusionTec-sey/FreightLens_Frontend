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
const exactKeys = (value, expected) => value && typeof value === 'object'
  && Object.keys(value).sort().join('|') === [...expected].sort().join('|');
function safeBody(kind, returnKey, body, invoiceKey) {
  if (kind === 'CLAIM') {
    if (!exactKeys(body, ['return_key', 'operation_key', 'invoice_key', 'expected_invoice_version',
      'returner_name', 'returner_contact', 'reason', 'lines'])
      || body.return_key !== returnKey || body.invoice_key.toLowerCase() !== invoiceKey
      || !uuid(body.return_key) || !uuid(body.operation_key) || !uuid(body.invoice_key)
      || body.expected_invoice_version !== 1 || typeof body.returner_name !== 'string'
      || !body.returner_name || body.returner_name.length > 150 || typeof body.returner_contact !== 'string'
      || !body.returner_contact || body.returner_contact.length > 50 || typeof body.reason !== 'string'
      || !body.reason || body.reason.length > 1000 || !Array.isArray(body.lines) || !body.lines.length || body.lines.length > 500
      || body.lines.some(line => !exactKeys(line, ['invoice_line_key', 'handover_allocation_key', 'quantity', 'condition'])
        || !uuid(line.invoice_line_key) || !uuid(line.handover_allocation_key)
        || !/^\d{1,12}(?:\.\d{1,6})?$/.test(line.quantity) || !/[1-9]/.test(line.quantity.replace('.', ''))
        || !['UNOPENED', 'OPENED', 'DAMAGED', 'UNKNOWN'].includes(line.condition))) {
      throw new Error('Invalid recovered return claim. Original retained.');
    }
  } else if (!exactKeys(body, ['operation_key', 'expected_claim_version', 'expected_option_version', 'expected_fingerprint'])
    || !uuid(body.operation_key) || body.expected_claim_version !== 2 || body.expected_option_version !== 1
    || !/^[0-9a-f]{64}$/.test(body.expected_fingerprint)) {
    throw new Error('Invalid recovered return credit request. Original retained.');
  }
  return JSON.parse(JSON.stringify(body));
}
function safeRecord(value, scope) {
  if (!value || value.format !== 1 || !positive(value.revision)) throw new Error('Unrecognised return recovery record. Original retained.');
  if (!['CLAIM', 'CREDIT_NOTE'].includes(value.kind) || !uuid(value.return_key) || !value.body || typeof value.body !== 'object') throw new Error('Invalid return recovery intent. Original retained.');
  const invoiceKey = scope.split(':')[2];
  const body = safeBody(value.kind, value.return_key, value.body, invoiceKey);
  if (JSON.stringify(body).length > 100000) throw new Error('Unsafe return recovery intent. Original retained.');
  return { format: 1, revision: Number(value.revision), kind: value.kind,
    return_key: value.return_key, body, updated_at: value.updated_at };
}
export function readReturnRecovery(scope) {
  const raw = window.localStorage.getItem(key(scope));
  return raw ? safeRecord(JSON.parse(raw), scope) : null;
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
      return_key: returnKey, body, updated_at: new Date().toISOString() }, scope);
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
