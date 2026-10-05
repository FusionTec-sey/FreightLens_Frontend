// Durable identity for one uncertain reviewed return-stock condition action.
// Records are company/user/action/target scoped and contain no money, account,
// customer-contact or authentication data.
const prefix = 'freightlens.stock-condition-recovery.v1:';
const lockName = 'freightlens.stock-condition-recovery.v1';
const actions = new Set(['REQUEST', 'REVIEW', 'EXECUTE']);
const uuid = value => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const exactKeys = (value, expected) => value && typeof value === 'object'
  && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...expected].sort().join('|');

export function stockConditionRecoveryScope(orgId, userId, action, target) {
  if (!positive(orgId) || !positive(userId) || !actions.has(action)) {
    throw new Error('Authenticated company, user and stock-condition action are required for safe recovery.');
  }
  const normalizedTarget = action === 'REQUEST' && positive(target)
    ? String(Number(target)) : typeof target === 'string' && uuid(target) ? target.toLowerCase() : null;
  if (!normalizedTarget) throw new Error('An exact stock-condition source or case is required for safe recovery.');
  return `${Number(orgId)}:${Number(userId)}:${action}:${normalizedTarget}`;
}

const key = scope => {
  if (!/^\d+:\d+:(REQUEST:\d+|(?:REVIEW|EXECUTE):[0-9a-f-]{36})$/.test(scope)) {
    throw new Error('Invalid stock-condition recovery scope.');
  }
  return `${prefix}${scope}`;
};

function safeBody(action, target, body) {
  if (action === 'REQUEST') {
    if (!exactKeys(body, ['operation_key', 'credit_note_line_id', 'expected_source_version', 'quantity', 'reason'])
      || !uuid(body.operation_key) || !positive(body.credit_note_line_id)
      || String(Number(body.credit_note_line_id)) !== target || !positive(body.expected_source_version)
      || typeof body.quantity !== 'string' || !/^\d{1,18}(?:\.\d{1,6})?$/.test(body.quantity)
      || !/[1-9]/.test(body.quantity.replace('.', '')) || typeof body.reason !== 'string'
      || !body.reason.trim() || body.reason.length > 1000) {
      throw new Error('Invalid recovered stock-condition request. Original retained.');
    }
  } else if (action === 'REVIEW') {
    if (!exactKeys(body, ['operation_key', 'expected_version', 'outcome', 'reason'])
      || !uuid(body.operation_key) || !positive(body.expected_version)
      || !['APPROVED', 'REJECTED'].includes(body.outcome) || typeof body.reason !== 'string'
      || !body.reason.trim() || body.reason.length > 1000) {
      throw new Error('Invalid recovered stock-condition review. Original retained.');
    }
  } else if (!exactKeys(body, ['operation_key']) || !uuid(body.operation_key)) {
    throw new Error('Invalid recovered stock-condition execution. Original retained.');
  }
  return JSON.parse(JSON.stringify(body));
}

function safeRecord(value, scope) {
  if (!value || value.format !== 1 || !positive(value.revision)) {
    throw new Error('Unrecognised stock-condition recovery record. Original retained.');
  }
  const [, , action, target] = scope.split(':');
  if (value.action !== action || String(value.target).toLowerCase() !== target) {
    throw new Error('Stock-condition recovery scope does not match its action. Original retained.');
  }
  const body = safeBody(action, target, value.body);
  if (JSON.stringify(body).length > 20000) {
    throw new Error('Unsafe stock-condition recovery intent. Original retained.');
  }
  return { format: 1, revision: Number(value.revision), action, target, body,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : null };
}

export function readStockConditionRecovery(scope) {
  const raw = window.localStorage.getItem(key(scope));
  return raw ? safeRecord(JSON.parse(raw), scope) : null;
}

async function locked(work) {
  if (!window.navigator.locks?.request) {
    throw new Error('Safe stock-condition recovery requires browser locking support. Keep this screen open.');
  }
  return window.navigator.locks.request(lockName, work);
}

export async function writeStockConditionRecovery(scope, expectedRevision, body) {
  return locked(() => {
    const previous = readStockConditionRecovery(scope);
    if ((previous?.revision || 0) !== expectedRevision) {
      throw new Error('Stock-condition recovery changed in another tab. Reload before continuing.');
    }
    const [, , action, target] = scope.split(':');
    const row = safeRecord({ format: 1, revision: expectedRevision + 1, action, target,
      body, updated_at: new Date().toISOString() }, scope);
    window.localStorage.setItem(key(scope), JSON.stringify(row));
    return row;
  });
}

export async function removeStockConditionRecovery(scope, expectedRevision) {
  return locked(() => {
    const previous = readStockConditionRecovery(scope);
    if ((previous?.revision || 0) !== expectedRevision) {
      throw new Error('Stock-condition recovery changed in another tab and was not removed.');
    }
    window.localStorage.removeItem(key(scope));
  });
}
