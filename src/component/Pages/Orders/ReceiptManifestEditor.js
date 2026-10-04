import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { inventoryLocationsApi, locationError } from '../../../services/inventoryLocationsApi';
import useOperationIntent from '../../../hooks/useOperationIntent';
import DraftSourcePicker from '../Sales/DraftSourcePicker';
import StockManifestFields, { buildStockManifest } from '../Inventory/components/StockManifestFields';
import { secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

const blank = { on_hand: '', damaged: '0', quarantined: '0', reason: '' };

export default function ReceiptManifestEditor({ receipt, token, orgId, api, suppliedInventoryApi,
  isDark = false, onDirtyChange, onBusyChange, onSaved, onClose }) {
  const inventoryApi = useMemo(() => suppliedInventoryApi || inventoryLocationsApi(token, orgId), [suppliedInventoryApi, token, orgId]);
  const eligibleLines = useMemo(() => (receipt?.items || []).filter(row => row.product_id), [receipt]);
  const [lineId, setLineId] = useState(''), [branch, setBranch] = useState(null), [location, setLocation] = useState(null);
  const [choice, setChoice] = useState(null), [policy, setPolicy] = useState(null), [fields, setFields] = useState(blank);
  const [rows, setRows] = useState([]), [serialText, setSerialText] = useState(''), [preview, setPreview] = useState(null);
  const [sourceContext, setSourceContext] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState('');
  const action = useRef(null), identities = useRef(new Map());
  const intent = useOperationIntent();
  const line = eligibleLines.find(row => String(row.id) === String(lineId));
  const panel = isDark ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const dirty = Boolean(lineId || branch || location || fields.reason || fields.on_hand || rows.length || serialText);
  const invalidate = useCallback(() => { setPreview(null); setSaved(''); }, []);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { action.current?.abort(); onBusyChange?.(false); onDirtyChange?.(false); }, [onBusyChange, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => {
    setPolicy(null); setRows([]); setSerialText(''); identities.current.clear(); invalidate();
    if (!line?.product_id) return undefined;
    const controller = new AbortController(); setError('');
    inventoryApi.activePolicy(line.product_id, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setPolicy(data);
    }).catch(failure => { if (!controller.signal.aborted) setError(locationError(failure).message); });
    return () => controller.abort();
  }, [inventoryApi, line?.product_id, invalidate]);
  useEffect(() => {
    setSourceContext(null); invalidate();
    if (!line || !branch || !location || !policy?.version) return undefined;
    const controller = new AbortController(); setError('');
    const source = { receipt_id: receipt.id, receipt_item_id: line.id, branch_id: branch.id,
      location_id: location.id, expected_policy_version: policy.version };
    api.sourcePreview(source, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (data.receipt_id !== receipt.id || data.receipt_item_id !== line.id || data.product_id !== line.product_id ||
          data.branch_id !== branch.id || data.location_id !== location.id || data.policy_version !== policy.version ||
          data.physical_posting_enabled !== false) throw new Error('Unexpected receipt source context. Reload the receipt.');
      setSourceContext(data); setFields(old => ({ ...old, on_hand: data.base_quantities.received_quantity }));
    }).catch(failure => { if (!controller.signal.aborted) setError(locationError(failure).message); });
    return () => controller.abort();
  }, [api, receipt.id, line, branch, location, policy?.version, invalidate]);

  const branchLoad = useCallback((page, limit, signal) => inventoryApi.list(null, page, limit, signal), [inventoryApi]);
  const locationLoad = useCallback((page, limit, signal) => inventoryApi.list(branch?.id, page, limit, signal), [inventoryApi, branch?.id]);
  function changeField(name, value) { setFields(old => ({ ...old, [name]: value })); invalidate(); }
  function chooseBranch(row) { setBranch(row); setLocation(null); setSourceContext(null); setChoice(null); invalidate(); }
  function chooseLocation(row) { setLocation(row); setSourceContext(null); setChoice(null); invalidate(); }
  function body() {
    if (!line || !branch || !location || !policy?.version || !sourceContext) throw new Error('Load the authoritative receipt source before classifying it.');
    if (!fields.reason.trim()) throw new Error('Enter a classification reason.');
    return { source: { receipt_id: receipt.id, receipt_item_id: line.id, branch_id: branch.id,
      location_id: location.id, expected_policy_version: policy.version },
      on_hand: fields.on_hand, damaged: fields.damaged, quarantined: fields.quarantined, reason: fields.reason.trim(),
      ...buildStockManifest(policy.config?.tracking, rows, serialText, identities.current) };
  }
  async function validate() {
    let payload; try { payload = body(); } catch (failure) { setError(failure.message); return; }
    action.current?.abort(); action.current = new AbortController(); setBusy(true); setError(''); setSaved('');
    try {
      const { data } = await api.preview(payload, action.current.signal);
      if (!action.current.signal.aborted) setPreview(data);
    } catch (failure) { if (!action.current.signal.aborted) setError(locationError(failure).message); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  async function save() {
    let payload; try { payload = body(); } catch (failure) { setError(failure.message); return; }
    if (!preview || JSON.stringify(preview.manifest) !== JSON.stringify(payload)) { setError('Validate the current classification before saving.'); return; }
    action.current?.abort(); action.current = new AbortController(); setBusy(true); setError(''); setSaved('');
    try {
      const request = intent.payloadFor(['receipt-manifest', receipt.id, line.id, branch.id, location.id], payload);
      const { data } = await api.create(request, action.current.signal);
      if (!action.current.signal.aborted) { setSaved(`Manifest ${data.manifest_key} saved—not posted.`); onSaved?.(data); }
    } catch (failure) { if (!action.current.signal.aborted) setError(locationError(failure).message); }
    finally { if (!action.current.signal.aborted) setBusy(false); }
  }
  function discard() {
    setLineId(''); setBranch(null); setLocation(null); setChoice(null); setPolicy(null); setFields(blank);
    setRows([]); setSerialText(''); setPreview(null); setSourceContext(null); setError(''); setSaved(''); identities.current.clear(); intent.clear(); onClose?.();
  }

  if (!receipt || !['SUBMITTED', 'VERIFIED'].includes(receipt.status)) return <p role="status">Submit the goods receipt before preparing its physical classification.</p>;
  if (!eligibleLines.length) return <p role="status">Receipt lines need linked product identities before they can be classified.</p>;
  return <section aria-label="Prepare physical receipt manifest" className="space-y-3 rounded border p-3">
    <div><h3 className="font-semibold">Prepare physical classification</h3><p className="text-sm">Validate exact base-unit quantities, then save a reviewable manifest. This does not receive stock or post value.</p></div>
    {error && <p role="alert">{error}</p>}{saved && <p role="status" className="break-all">{saved}</p>}
    <label className="block">Receipt line<select value={lineId} disabled={busy} onChange={event => { setLineId(event.target.value); setFields(blank); setSourceContext(null); invalidate(); }} className={`block w-full rounded border p-2 ${panel}`}>
      <option value="">Choose a submitted line</option>{eligibleLines.map(row => <option key={row.id} value={row.id}>{row.description} · {row.received_quantity} {row.unit}</option>)}
    </select></label>
    {line && <p>Product {line.product_id} · Received {line.received_quantity} {line.unit}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} className={secondaryButtonClass} onClick={() => setChoice('branch')}>{branch ? `Branch: ${branch.name}` : 'Choose receiving branch'}</button>
      <button type="button" disabled={busy || !branch} className={secondaryButtonClass} onClick={() => setChoice('location')}>{location ? `Location: ${location.name}` : 'Choose stock location'}</button>
    </div>
    {choice === 'branch' && <div className="h-80"><DraftSourcePicker title="Receiving branches" embedded load={branchLoad} onSelect={chooseBranch} disabled={busy} /></div>}
    {choice === 'location' && branch && <div className="h-80"><DraftSourcePicker title={`Locations in ${branch.name}`} embedded load={locationLoad} onSelect={chooseLocation} disabled={busy} /></div>}
    {line && !policy && !error && <p role="status">Loading reviewed product policy…</p>}
    {line && branch && location && policy && !sourceContext && !error && <p role="status">Loading exact receipt quantities…</p>}
    {sourceContext && <div className="rounded border p-2 text-sm">
      <p>Receipt source: {sourceContext.received_quantity} {sourceContext.unit} = {sourceContext.base_quantities.received_quantity} {sourceContext.base_unit}</p>
      <p>Observed damaged: {sourceContext.base_quantities.damaged_quantity} · Incorrect: {sourceContext.base_quantities.incorrect_quantity} {sourceContext.base_unit}</p>
      <p>Classify damaged and quarantined explicitly; purchasing observations are not silently subtracted or combined.</p>
    </div>}
    {policy && <>
      <p>Reviewed policy v{policy.version} · {policy.config.tracking} · Base unit {policy.config.base_unit}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[['on_hand', 'Total received in base units'], ['damaged', 'Damaged'], ['quarantined', 'Quarantined']].map(([name, label]) => <label key={name}>{label}<input value={fields[name]} disabled={busy} inputMode="decimal" onChange={event => changeField(name, event.target.value)} className={`block w-full rounded border p-2 ${panel}`} /></label>)}
      </div>
      <label className="block">Classification reason<textarea value={fields.reason} disabled={busy} maxLength={500} onChange={event => changeField('reason', event.target.value)} className={`block w-full rounded border p-2 ${panel}`} /></label>
      <StockManifestFields tracking={policy.config.tracking} rows={rows} setRows={value => { setRows(value); invalidate(); }}
        serialText={serialText} setSerialText={value => { setSerialText(value); invalidate(); }} disabled={busy} panel={panel}
        button={secondaryButtonClass} addLabel="Add received batch" />
    </>}
    {preview && <div role="status" className="rounded border p-2"><p>Validated against the current receipt and policy.</p>
      <p>On hand {preview.quantities.on_hand} · Available {preview.quantities.available} {preview.source.base_unit}</p>
      {preview.condition_review_required && <p>Condition review is required before any future posting workflow.</p>}</div>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={secondaryButtonClass} disabled={busy || !policy || !sourceContext} onClick={validate}>{busy ? 'Working…' : 'Validate classification'}</button>
      <button type="button" className={secondaryButtonClass} disabled={busy || !preview} onClick={save}>Save manifest</button>
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={discard}>{dirty ? 'Discard classification' : 'Close editor'}</button>
    </div>
  </section>;
}
