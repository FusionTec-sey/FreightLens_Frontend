import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '../../../context/ThemeContext';
import useOperationIntent from '../../../hooks/useOperationIntent';
import CustomersPage from '../MasterData/CustomersPage';
import { FileText } from 'lucide-react';
import { RegisterHeader, pageClass, primaryButtonClass, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import DraftSourcePicker from './DraftSourcePicker';
import DraftBarcodeEntry from './DraftBarcodeEntry';
import SalesProductImage from './SalesProductImage';
import SalesDraftSummary from './SalesDraftSummary';
import './salesWorkspace.css';
import { nudgeSalesQuantity, salesQuantityError } from '../../../utils/salesQuantity';
import { recoveryScope, writeRecovery, removeRecovery } from '../../../services/salesDraftRecovery';

export default function SalesDraftEditor({ api, inventoryApi, orgId, userId, initial, recovery, onSaved, onClose }) {
  const { isDark } = useTheme();
  const recovered = recovery?.snapshot;
  if (recovered) initial = { ...recovered.draft, document_key: recovery.key, version: recovered.expected_version,
    lines: recovered.draft.lines.map((line, index) => ({ ...line, units: recovered.units[index] })) };
  const [key] = useState(() => initial?.document_key || window.crypto.randomUUID());
  const [customer, setCustomer] = useState(initial?.customer_key ? { customerKey: initial.customer_key, version: initial.expected_customer_version, profile: { name: initial.customer_name } } : null);
  const [branch, setBranch] = useState(initial?.branch_id ? { id: initial.branch_id } : null);
  const [lines, setLines] = useState(() => (initial?.lines || []).map(line => ({ ...line, name: line.product_name, units: line.units || [...new Set([line.unit, line.base_unit])] })));
  const [picker, setPicker] = useState(null); const [dirty, setDirty] = useState(Boolean(recovery));
  const [mobilePane, setMobilePane] = useState('cart');
  const [showValidation, setShowValidation] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const quantityInputs = useRef(new Map());
  const [pending, setPending] = useState(recovered?.pending || null); const [busy, setBusy] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState(null);
  const receiptRef = useRef(null);
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
      if (finished.current || receiptRef.current) return;
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
    if (receiptRef.current) return;
    try {
      await persist.current(snapshot());
      if (alive.current) onClose();
    } catch { /* The local recovery alert explains why closing was blocked. */ }
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (focusRequest) quantityInputs.current.get(focusRequest.lineKey)?.focus();
  }, [focusRequest]);
  useEffect(() => {
    if (!dirty && !pending) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, pending]);
  function editLine(index, changes) { setDirty(true); setLines(rows => rows.map((line, i) => i === index ? { ...line, ...changes } : line)); }
  async function finishConfirmedSave(receipt) {
    try {
      // A failed earlier recovery write must not hide the confirmed server receipt.
      await localQueue.current.catch(() => {});
      if (!finished.current) await removeRecovery(recoveryScope(orgId, userId), key, localRevision.current);
    } catch {
      if (alive.current) setLocalError('Draft saved on the server. Local recovery cleanup failed; retry cleanup without saving again.');
      return;
    }
    finished.current = true;
    if (!alive.current) return;
    setLocalError('');
    toast.success('Sales draft saved. No stock reserved or money posted.');
    onSaved(receipt);
  }
  async function retryCleanup() {
    if (inFlight.current || !receiptRef.current) return;
    inFlight.current = true; setBusy(true);
    try { await finishConfirmedSave(receiptRef.current); }
    catch { if (alive.current) setError('Draft save is confirmed, but opening the saved view failed. Retry to finish without another save.'); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  async function save() {
    if (inFlight.current || conflict || receiptRef.current) return;
    const invalidLine = lines.find(line => salesQuantityError(line.quantity));
    if (!customer || !branch || !lines.length || invalidLine) {
      setShowValidation(true); setMobilePane('cart');
      if (invalidLine) setFocusRequest({ lineKey: invalidLine.line_key });
      setError('Draft not sent. Correct the highlighted selections or quantities; your entries are retained.'); return;
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
      receiptRef.current = data; setSavedReceipt(data);
      await finishConfirmedSave(data);
    } catch (failure) {
      if (!alive.current) return;
      if (receiptRef.current) {
        setError('Draft save is confirmed, but opening the saved view failed. Retry to finish without another save.');
        return;
      }
      const status = failure.response?.status;
      if (status === 422 || status === 404) { setPending(null); setError('The draft could not be saved. Check source selections, units and quantities; your entries are retained.'); }
      else if (status === 409) { setPending(null); setConflict(true); setError('The saved draft or source policy changed. Your entries are retained; close only after reviewing them, then reopen the latest version.'); }
      else setError('Save outcome is unconfirmed. Entries are locked; retry the same request to avoid duplicate saves.');
    } finally { inFlight.current = false; if (alive.current) setBusy(false); }
  }
  const theme = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const locked = busy || Boolean(pending) || conflict || Boolean(savedReceipt);
  function nudgeLine(lineKey, direction) {
    if (locked) return;
    setLines(rows => rows.map(line => {
      if (line.line_key !== lineKey) return line;
      const quantity = nudgeSalesQuantity(line.quantity, direction);
      return quantity === null ? line : { ...line, quantity };
    }));
    setDirty(true);
  }
  function addProduct(choice) {
    if (locked || lines.length >= 100) return;
    setLines(rows => rows.length >= 100 ? rows : [...rows, { line_key: window.crypto.randomUUID(),
      product_id: choice.id, name: choice.name, sku: choice.sku,
      image_signed_url: choice.image_signed_url,
      expected_policy_version: choice.policy_version, unit: choice.unit || choice.base_unit,
      units: choice.units, quantity: '1' }]);
    setDirty(true);
  }
  if (picker === 'customer') return <section className="h-full min-h-0 flex flex-col"><button type="button" className="shrink-0 border rounded p-2" onClick={() => setPicker(null)}>Back to draft</button>
    <div className="flex-1 min-h-0"><CustomersPage onSelect={choice => { if (String(choice.orgId) === String(orgId)) { setCustomer(choice); setDirty(true); setPicker(null); } }} /></div></section>;
  if (picker === 'branch') return <DraftSourcePicker title="Select selling store" load={api.branches} onClose={() => setPicker(null)}
    onSelect={choice => {
      setBranch(choice);
      setDirty(true); setPicker(null);
    }} />;
  return <section className={`sales-workspace ${pageClass}`}>
    <RegisterHeader icon={FileText} title={initial ? 'Edit sales draft' : 'New sales draft'} description="Demand only. Saving does not confirm a sale, reserve stock or receive payment." actions={<>
      <button type="button" disabled={busy || Boolean(pending)} className={secondaryButtonClass} onClick={() => dirty ? setDiscard(true) : onClose()}>Cancel</button>
      <button type="button" disabled={busy || localSaving || Boolean(savedReceipt)} className={secondaryButtonClass} onClick={keepLocal}>Keep locally and close</button>
      {savedReceipt ? <button type="button" disabled={busy} className={primaryButtonClass} onClick={retryCleanup}>{busy ? 'Finishing…' : 'Retry local cleanup'}</button>
        : <button type="button" disabled={busy || conflict} className={primaryButtonClass} onClick={save}>{busy ? 'Saving…' : pending ? 'Retry same save' : 'Save draft'}</button>}
    </>} />
    {error && <p role="alert" className="shrink-0 text-sm">{error}</p>}
    <p role="status" className="shrink-0 text-sm">{savedReceipt ? `Server confirmed draft version ${savedReceipt.version}. Only local recovery cleanup remains; no money or stock was posted.` : localSaving ? 'Saving local recovery…' : localError ? 'Local recovery unavailable. Keep this editor open.' : dirty || pending ? 'Recovery saved on this browser for this company and user. It is not a confirmed sale.' : 'Edits will be retained locally without customer names, contacts or payment details.'}</p>
    {localError && <p role="alert">{localError} {!savedReceipt && <button type="button" className="border rounded p-2" onClick={() => persist.current(snapshot()).catch(() => {})}>Retry local recovery</button>}</p>}
    {discard && <section role="alertdialog" aria-label="Discard draft edits" className="shrink-0 border rounded p-3"><p>Discard unsaved edits? Previously saved versions remain unchanged.</p>
      <button type="button" className="border rounded p-2 mr-2" onClick={() => setDiscard(false)}>Keep editing</button><button type="button" className="border rounded p-2" onClick={discardLocal}>Discard edits</button></section>}
      <div className="shrink-0 flex flex-wrap gap-3"><div><button type="button" disabled={locked} aria-describedby={showValidation && !customer ? 'draft-customer-error' : undefined} className="border rounded p-3 disabled:opacity-40" onClick={() => setPicker('customer')}>{customer ? `Customer: ${customer.profile?.name || customer.customerKey}` : 'Select customer'}</button>
        {showValidation && !customer && <p id="draft-customer-error" className="text-sm text-rose-700 dark:text-rose-300">Select a customer before saving.</p>}</div>
        <div><button type="button" disabled={locked} aria-describedby={showValidation && !branch ? 'draft-branch-error' : undefined} className="border rounded p-3 disabled:opacity-40" onClick={() => setPicker('branch')}>{branch ? `Store: ${branch.name || branch.id}` : 'Select selling store'}</button>
        {showValidation && !branch && <p id="draft-branch-error" className="text-sm text-rose-700 dark:text-rose-300">Select the selling store before saving.</p>}</div></div>
    <nav className="sales-mobile-tabs shrink-0 flex gap-2" aria-label="Draft workspace panels">
      <button type="button" aria-pressed={mobilePane === 'products'} className={secondaryButtonClass} onClick={() => setMobilePane('products')}>Products</button>
      <button type="button" aria-pressed={mobilePane === 'cart'} className={secondaryButtonClass} onClick={() => setMobilePane('cart')}>Cart</button>
    </nav>
    {inventoryApi && <DraftBarcodeEntry api={inventoryApi} disabled={locked || lines.length >= 100} onSelect={addProduct} />}
    <div className="sales-catalog-layout">
      <div className={`sales-catalog-pane ${mobilePane === 'products' ? 'flex' : 'hidden'} rounded-2xl border border-slate-200 dark:border-slate-700`}>
        <DraftSourcePicker title="Products" products embedded load={api.products}
          disabled={locked || lines.length >= 100} onSelect={addProduct} />
      </div>
      <section aria-label="Draft cart" className={`sales-cart-pane ${mobilePane === 'cart' ? 'flex' : 'hidden'} flex-col rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-700`}>
      <h2 className="shrink-0 border-b p-3 font-semibold">Cart <span className="text-sm font-normal">· {lines.length} lines</span></h2>
      <div className="flex-1 min-h-0 overflow-auto">
      {lines.map((line, index) => <section key={line.line_key} className="sales-cart-line">
        <SalesProductImage source={line} size="small" />
        <span className="text-sm font-medium">{line.name || `Product ${line.product_id}`}<span className="block text-xs font-normal text-slate-500">{line.sku || 'No SKU'} · Policy v{line.expected_policy_version}</span></span>
        {line.reserved_quantity && <span className="col-span-2 text-xs">Reserved: {line.reserved_quantity} {line.base_unit}. Held quantities remain protected.</span>}
        <div className="sales-cart-line-controls">
          <button type="button" aria-label={`Decrease line ${index + 1} by one ${line.unit}`}
            className="min-h-[44px] min-w-[44px] border rounded text-xl disabled:opacity-40"
            disabled={locked || nudgeSalesQuantity(line.quantity, -1) === null} onClick={() => nudgeLine(line.line_key, -1)}>−</button>
          <label className="text-xs">Quantity {index + 1}<input disabled={locked} inputMode="decimal" maxLength={19}
            ref={element => { if (element) quantityInputs.current.set(line.line_key, element); else quantityInputs.current.delete(line.line_key); }}
            aria-invalid={showValidation && Boolean(salesQuantityError(line.quantity))}
            aria-describedby={showValidation && salesQuantityError(line.quantity) ? `draft-quantity-error-${index}` : undefined}
            className={`block min-h-[44px] border rounded p-2 w-32 text-base ${theme} ${showValidation && salesQuantityError(line.quantity) ? 'ring-2 ring-rose-500' : ''}`} value={line.quantity}
            onChange={event => editLine(index, { quantity: event.target.value })} /></label>
          <button type="button" aria-label={`Increase line ${index + 1} by one ${line.unit}`}
            className="min-h-[44px] min-w-[44px] border rounded text-xl disabled:opacity-40"
            disabled={locked || nudgeSalesQuantity(line.quantity, 1) === null} onClick={() => nudgeLine(line.line_key, 1)}>+</button>
        </div>
        {showValidation && salesQuantityError(line.quantity) && <p id={`draft-quantity-error-${index}`} className="w-full text-sm text-rose-700 dark:text-rose-300">{salesQuantityError(line.quantity)}</p>}
        <div className="sales-cart-line-controls"><label>Unit {index + 1}<select disabled={locked} className={`border rounded p-2 ml-2 ${theme}`} value={line.unit} onChange={event => editLine(index, { unit: event.target.value })}>{line.units.map(unit => <option key={unit}>{unit}</option>)}</select></label>
        <button type="button" disabled={locked} className="border rounded p-2 disabled:opacity-40" onClick={() => { setLines(rows => rows.filter((_, i) => i !== index)); setDirty(true); }}>Remove line {index + 1}</button></div>
      </section>)}
      {!lines.length && <p className={showValidation ? 'text-rose-700 dark:text-rose-300' : ''}>{showValidation ? 'Add at least one product before saving.' : 'No products selected.'}</p>}
      </div>
      <footer className="shrink-0">
      <SalesDraftSummary compact />
      <button type="button" disabled={locked || lines.length >= 100} className="sales-mobile-tabs border rounded m-2 px-3 py-2 disabled:opacity-40" onClick={() => setMobilePane('products')}>Add product</button>
      </footer>
      </section>
    </div>
  </section>;
}
