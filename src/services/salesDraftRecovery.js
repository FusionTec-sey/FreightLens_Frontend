// Local intent only, never authority. No tokens, customer contacts, prices, money,
// reservations or approvals are persisted. Server validates every eventual save.
const prefix = 'freightlens.sales-recovery.v1:';
const lockName = 'freightlens.sales-recovery.v1';
const sequenceKey = 'freightlens.sales-recovery-sequence.v1';
const text = value => typeof value === 'string' && value.length <= 128 ? value : null;
const positive = value => Number.isSafeInteger(value) && value > 0 ? value : null;
function sourceReference(value) {
  if (value == null) return null;
  const key = text(value.document_key);
  const version = positive(value.version);
  if (!key || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) || !version) {
    throw new Error('Invalid copy source reference.');
  }
  return { document_key: key, version };
}
export function recoveryScope(orgId, userId) {
  if (!positive(Number(orgId)) || !positive(Number(userId))) throw new Error('Select an authenticated company and user for recovery.');
  return `${Number(orgId)}:${Number(userId)}`;
}
function storageKey(scope, key) {
  if (!/^\d+:\d+$/.test(scope) || !text(key) || !key) throw new Error('Invalid recovery identity.');
  return `${prefix}${scope}:${encodeURIComponent(key)}`;
}
function draftFields(draft) {
  if (!Array.isArray(draft.lines) || draft.lines.length > 100) throw new Error('Invalid recovery line count.');
  return { customer_key: text(draft.customer_key), expected_customer_version: positive(draft.expected_customer_version),
    branch_id: positive(draft.branch_id), lines: (draft.lines || []).slice(0, 100).map(line => ({
      line_key: text(line.line_key), product_id: positive(line.product_id), expected_policy_version: positive(line.expected_policy_version),
      quantity: text(line.quantity), unit: text(line.unit),
    })) };
}
export function recoverySnapshot(value) {
  if (!Number.isSafeInteger(value.expected_version) || value.expected_version < 0) throw new Error('Invalid draft version.');
  const draft = draftFields(value.draft);
  const source_reference = sourceReference(value.source_reference);
  const pending_source_reference = value.pending ? sourceReference(value.pending.source_reference) : null;
  const expected_pending_source = value.expected_version === 0 ? source_reference : null;
  const pending = value.pending ? { operation_key: text(value.pending.operation_key), expected_version: value.pending.expected_version,
    ...(pending_source_reference ? { source_reference: pending_source_reference } : {}), draft: draftFields(value.pending.draft) } : null;
  if (pending && (!pending.operation_key || pending.expected_version !== value.expected_version ||
    JSON.stringify(pending.draft) !== JSON.stringify(draft) ||
    JSON.stringify(pending_source_reference) !== JSON.stringify(expected_pending_source) ||
    (pending_source_reference && pending.expected_version !== 0))) {
    throw new Error('Pending save does not match the recoverable draft.');
  }
  return { expected_version: value.expected_version, draft, pending, conflict: Boolean(value.conflict),
    source_reference,
    units: draft.lines.map((line, index) => [...new Set([line.unit, ...(value.units?.[index] || [])])].filter(unit => text(unit)).slice(0, 17)) };
}
function decode(raw, scope, key) {
  if (!raw) return null;
  const row = JSON.parse(raw);
  if (row.format !== 1 || row.scope !== scope || row.key !== key || !positive(row.revision)) throw new Error('Unrecognised recovery record. Original retained.');
  return { format: 1, scope, key, revision: row.revision, updated_at: row.updated_at, snapshot: recoverySnapshot(row.snapshot) };
}
export function readRecovery(scope, key) {
  return decode(window.localStorage.getItem(storageKey(scope, key)), scope, key);
}
export function listRecovery(scope, branchId = null) {
  storageKey(scope, 'check');
  const rows = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const name = window.localStorage.key(i);
    if (!name?.startsWith(`${prefix}${scope}:`)) continue;
    const key = decodeURIComponent(name.slice(`${prefix}${scope}:`.length));
    const row = readRecovery(scope, key);
    if (row && (branchId === null || row.snapshot.draft.branch_id === branchId)) rows.push(row);
  }
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
async function locked(work) {
  if (!window.navigator.locks?.request) throw new Error('Safe local recovery requires browser locking support. Keep this editor open.');
  return window.navigator.locks.request(lockName, work);
}
export async function writeRecovery(scope, key, expectedRevision, snapshot) {
  const safe = recoverySnapshot(snapshot);
  return locked(() => {
    const previous = readRecovery(scope, key);
    if ((previous?.revision || 0) !== expectedRevision) throw new Error('Recovery changed in another tab. Reopen it before editing; this tab will not overwrite it.');
    if (!previous && listRecovery(scope).length >= 100) throw new Error('Local recovery is full. Review saved drafts before creating more.');
    // Do not reset revision on deletion/recreation: an older tab must not regain
    // write access merely because a new recovery copy reused the document key.
    const sequence = Number(window.localStorage.getItem(sequenceKey) || 0);
    if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence >= Number.MAX_SAFE_INTEGER - 1) throw new Error('Invalid local recovery sequence.');
    const revision = Math.max(sequence, expectedRevision) + 1;
    window.localStorage.setItem(sequenceKey, String(revision));
    const row = { format: 1, scope, key, revision, updated_at: new Date().toISOString(), snapshot: safe };
    window.localStorage.setItem(storageKey(scope, key), JSON.stringify(row));
    return row;
  });
}
export function removeRecovery(scope, key, expectedRevision) {
  return locked(() => {
    const previous = readRecovery(scope, key);
    if ((previous?.revision || 0) !== expectedRevision) throw new Error('Recovery changed in another tab; it has not been removed.');
    window.localStorage.removeItem(storageKey(scope, key));
  });
}
