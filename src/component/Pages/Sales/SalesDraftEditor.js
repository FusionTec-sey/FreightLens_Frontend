import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useOperationIntent from '../../../hooks/useOperationIntent';
import CustomersPage from '../MasterData/CustomersPage';
import DraftSourcePicker from './DraftSourcePicker';
import { recoveryScope, writeRecovery, removeRecovery } from '../../../services/salesDraftRecovery';
import { FilePlus2 } from 'lucide-react';
import { RegisterHeader, fieldLabelClass, hintClass, inputClass, messageClass, pageClass, panelClass, primaryButtonClass, secondaryButtonClass, selectClass } from '../../UI/UXComponent/RegisterShell';

export default function SalesDraftEditor({ api, orgId, userId, initial, recovery, onSaved, onClose }) {
  const recovered = recovery?.snapshot;
  if (recovered) initial = { ...recovered.draft, document_key: recovery.key, version: recovered.expected_version,
    lines: recovered.draft.lines.map((line, index) => ({ ...line, units: recovered.units[index] })) };
  const [key] = useState(() => initial?.document_key || window.crypto.randomUUID());
  const [customer, setCustomer] = useState(initial?.customer_key ? { customerKey: initial.customer_key, version: initial.expected_customer_version } : null);
  const [branch, setBranch] = useState(initial?.branch_id ? { id: initial.branch_id } : null);
  const [lines, setLines] = useState(() => (initial?.lines || []).map(line => ({ ...line, name: line.product_name, units: line.units || [...new Set([line.unit, line.base_unit])] })));
  const [picker, setPicker] = useState(null); const [dirty, setDirty] = useState(Boolean(recovery));
  const [pending, setPending] = useState(recovered?.pending || null); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [discard, setDiscard] = useState(false);
  const [conflict, setConflict] = useState(Boolean(recovered?.conflict));
  const [localError, setLocalError] = useState(''), [localSaving, setLocalSaving] = useState(false);
  const localRevision = useRef(recovery?.revision || 0), localQueue = useRef(Promise.resolve()), finished = useRef(false);
  const controller = useRef(null); const alive = useRef(true); const inFlight = useRef(false);
  const { payloadFor } = useOperationIntent();
  const expectedVersion = initial?.version || 0;
  function snapshot(pendingSave = pending) {
    return { expected_version: expectedVersion, conflict, pending: pendingSave, units: lines.map(line => line.units), draft: {
      customer_key: customer?.customerKey || null, expected_customer_version: customer?.version || null, branch_id: branch?.id || null,
      lines: lines.map(line => ({ line_key: line.line_key, product_id: line.product_id, expected_policy_version: line.expected_policy_version, quantity: line.quantity, unit: line.unit })),
    } };
  }
  const persist = useRef(null);
  persist.current = value => {
    setLocalSaving(true);
    const task = localQueue.current.catch(() => {}).then(async () => {
      if (finished.current) return;
      const row = await writeRecovery(recoveryScope(orgId, userId), key, localRevision.current, value);
      localRevision.current = row.revision;
      if (alive.current) setLocalError('');
    });
    localQueue.current = task;
    task.catch(failure => { if (alive.current) setLocalError(failure.message || 'Local recovery could not be saved.'); })
      .finally(() => { if (alive.current && localQueue.current === task) setLocalSaving(false); });
    return task;
  };
  const latestSnapshot = useRef(null); latestSnapshot.current = snapshot();
  useEffect(() => {
    if (dirty || pending) persist.current(latestSnapshot.current).catch(() => {});
  }, [customer, branch, lines, dirty, pending, conflict]);
  async function discardLocal() {
    try {
      await localQueue.current;
      await removeRecovery(recoveryScope(orgId, userId), key, localRevision.current);
      finished.current = true; if (alive.current) onClose();
    } catch (failure) { if (alive.current) setLocalError(failure.message || 'Recovery was not removed.'); }
  }
  async function keepLocal() {
    try {
      await persist.current(snapshot());
      if (alive.current) onClose();
    } catch { /* The local recovery alert explains why closing was blocked. */ }
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!dirty && !pending) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, pending]);
  function editLine(index, changes) { setDirty(true); setLines(rows => rows.map((line, i) => i === index ? { ...line, ...changes } : line)); }
  async function save() {
    if (inFlight.current || conflict) return;
    if (!customer || !branch || !lines.length || lines.some(line => !/^\d{1,12}(?:\.\d{1,6})?$/.test(line.quantity) || !/[1-9]/.test(line.quantity))) {
      setError('Select a customer, selling store and at least one product. Quantities must be positive decimal values with at most six decimal places.'); return;
    }
    let body;
    try {
      body = pending || payloadFor(`${orgId}:${key}`, { expected_version: initial?.version || 0, draft: {
        customer_key: customer.customerKey, expected_customer_version: customer.version, branch_id: branch.id,
        lines: lines.map(line => ({ line_key: line.line_key, product_id: line.product_id,
          expected_policy_version: line.expected_policy_version, quantity: line.quantity, unit: line.unit })),
      } });
    } catch { setError('Secure save identity is unavailable. Keep the draft open and retry.'); return; }
    inFlight.current = true; setBusy(true); setPending(body); setError('');
    controller.current = new AbortController();
    try {
      // Persist the exact retry identity before the request can reach the server.
      await persist.current(snapshot(body));
      if (!alive.current) return;
      const { data } = await api.save(key, body, controller.current.signal);
      if (!alive.current) return;
      if (data.document_key !== key || data.version !== body.expected_version + 1 || data.status !== 'DRAFT') throw new Error('Receipt mismatch');
      await localQueue.current;
      await removeRecovery(recoveryScope(orgId, userId), key, localRevision.current);
      finished.current = true;
      if (!alive.current) return;
      toast.success('Sales draft saved. No stock reserved or money posted.'); onSaved(data);
    } catch (failure) {
      if (!alive.current) return;
      const status = failure.response?.status;
      if (status === 422 || status === 404) { setPending(null); setError('The draft could not be saved. Check source selections, units and quantities; your entries are retained.'); }
      else if (status === 409) { setPending(null); setConflict(true); setError('The saved draft or source policy changed. Your entries are retained; close only after reviewing them, then reopen the latest version.'); }
      else setError('Save outcome is unconfirmed. Entries are locked; retry the same request to avoid duplicate saves.');
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  const locked = busy || Boolean(pending) || conflict;
  if (picker === 'customer') return <section className={pageClass}><button type="button" className={`${secondaryButtonClass} shrink-0`} onClick={() => setPicker(null)}>Back to draft</button>
    <div className="flex-1 min-h-0"><CustomersPage onSelect={choice => { if (String(choice.orgId) === String(orgId)) { setCustomer(choice); setDirty(true); setPicker(null); } }} /></div></section>;
  if (picker) return <DraftSourcePicker title={picker === 'branch' ? 'Select selling store' : 'Add product'} products={picker === 'product'} load={picker === 'branch' ? api.branches : api.products} onClose={() => setPicker(null)}
    onSelect={choice => {
      if (picker === 'branch') setBranch(choice);
      else setLines(rows => [...rows, { line_key: window.crypto.randomUUID(), product_id: choice.id, name: choice.name,
        expected_policy_version: choice.policy_version, unit: choice.base_unit, units: choice.units, quantity: '1' }]);
      setDirty(true); setPicker(null);
    }} />;
  return <section className={pageClass}>
    <RegisterHeader icon={FilePlus2} title={initial ? 'Edit sales draft' : 'New sales draft'}
      description="Demand only. Saving does not confirm a sale, reserve stock or receive payment."
      actions={<>
        <button type="button" disabled={busy || Boolean(pending)} className={secondaryButtonClass} onClick={() => dirty ? setDiscard(true) : onClose()}>Cancel</button>
        <button type="button" disabled={busy || localSaving} className={secondaryButtonClass} onClick={keepLocal}>Keep locally and close</button>
        <button type="button" disabled={busy || conflict} className={primaryButtonClass} onClick={save}>{busy ? 'Saving…' : pending ? 'Retry same save' : 'Save draft'}</button>
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    <p role="status" className={messageClass('muted')}>{localSaving ? 'Saving local recovery…' : localError ? 'Local recovery unavailable. Keep this editor open.' : dirty || pending ? 'Recovery saved on this browser for this company and user. It is not a confirmed sale.' : 'Edits will be retained locally without customer names, contacts or payment details.'}</p>
    {localError && <p role="alert" className={messageClass('error')}>{localError} <button className={secondaryButtonClass} onClick={() => persist.current(snapshot()).catch(() => {})}>Retry local recovery</button></p>}
    {discard && <section role="alertdialog" aria-label="Discard draft edits" className={`${panelClass} shrink-0 space-y-3`}><p className="text-sm">Discard unsaved edits? Previously saved versions remain unchanged.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButtonClass} onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className={secondaryButtonClass} onClick={discardLocal}>Discard edits</button></div></section>}
    <div className="flex-1 min-h-0 overflow-auto space-y-3">
      <div className="grid gap-3 md:grid-cols-2"><button type="button" disabled={locked} className={`${panelClass} text-left disabled:opacity-40`} onClick={() => setPicker('customer')}>{customer ? `Customer: ${customer.profile?.name || customer.customerKey}` : 'Select customer'}</button>
        <button type="button" disabled={locked} className={`${panelClass} text-left disabled:opacity-40`} onClick={() => setPicker('branch')}>{branch ? `Store: ${branch.name || branch.id}` : 'Select selling store'}</button></div>
      {lines.map((line, index) => <section key={line.line_key} className={`${panelClass} flex flex-wrap items-end gap-3`}>
        <div className="min-w-[14rem] flex-1">
          <p className="text-sm font-semibold">{line.name || `Product ${line.product_id}`} · Policy v{line.expected_policy_version}</p>
          {line.reserved_quantity && <p className={hintClass}>Reserved: {line.reserved_quantity} {line.base_unit}. Held quantities and ownership are protected on save.</p>}
        </div>
        <label className="block"><span className={fieldLabelClass}>Quantity {index + 1}</span><input disabled={locked} inputMode="decimal" className={`block w-36 ${inputClass}`} value={line.quantity} onChange={event => editLine(index, { quantity: event.target.value })} /></label>
        <label className="block"><span className={fieldLabelClass}>Unit {index + 1}</span><select disabled={locked} className={`block ${selectClass}`} value={line.unit} onChange={event => editLine(index, { unit: event.target.value })}>{line.units.map(unit => <option key={unit}>{unit}</option>)}</select></label>
        <button type="button" disabled={locked} className={secondaryButtonClass} onClick={() => { setLines(rows => rows.filter((_, i) => i !== index)); setDirty(true); }}>Remove line {index + 1}</button>
      </section>)}
      {!lines.length && <p className={`${panelClass} text-center text-sm text-slate-500 dark:text-slate-400`}>No products selected.</p>}
      <button type="button" disabled={locked || lines.length >= 100} className={secondaryButtonClass} onClick={() => setPicker('product')}>Add product</button>
      <p className={hintClass}>Maximum 100 lines. Unit increments and current source versions are checked again by the server. Recover edits through Local drafts on this browser; recovery does not grant offline posting rights.</p>
    </div>
  </section>;
}
