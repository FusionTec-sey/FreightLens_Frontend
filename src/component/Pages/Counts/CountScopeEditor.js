import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ListChecks, Trash2 } from 'lucide-react';
import useOperationIntent from '../../../hooks/useOperationIntent';
import {
  Badge, EmptyState, RegisterHeader, cardClass, fieldLabelClass, hintClass, inputClass,
  messageClass, pageClass, panelClass, primaryButtonClass, rowActionClass, secondaryButtonClass,
  selectClass, tableClass, tdClass, thClass, trClass,
} from '../../UI/UXComponent/RegisterShell';

const CADENCES = ['ANNUAL', 'QUARTERLY', 'MONTHLY'];

/**
 * Builds the product-location lines a draft plan covers. Saving replaces the
 * whole scope, which is why the server requires the plan to still be DRAFT.
 */
export default function CountScopeEditor({ api, plan, onClose, onSaved }) {
  const { payloadFor } = useOperationIntent();
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]);
  const [draft, setDraft] = useState({ product_id: '', location_id: '', cadence: 'ANNUAL', due_on: `${plan.year}-12-31` });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.locations(plan.branch_id, 1, 100, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setLocations(data.items || []); })
      .catch(() => { if (!controller.signal.aborted) setError('Locations could not be loaded for this branch.'); });
    return () => controller.abort();
  }, [api, plan.branch_id]);

  useEffect(() => {
    const controller = new AbortController();
    api.products(1, 50, controller.signal, search)
      .then(({ data }) => { if (!controller.signal.aborted) setProducts(data.items || []); })
      .catch(() => { if (!controller.signal.aborted) setProducts([]); });
    return () => controller.abort();
  }, [api, search]);

  const productLabels = useMemo(() => {
    const map = {};
    products.forEach(product => { map[product.id] = product; });
    return map;
  }, [products]);

  function add() {
    if (!draft.product_id || !draft.location_id || !draft.due_on) {
      setError('Choose a product, a location and a due date.'); return;
    }
    const key = `${draft.product_id}:${draft.location_id}`;
    if (lines.some(line => `${line.product_id}:${line.location_id}` === key)) {
      setError('That product and location is already in the scope.'); return;
    }
    const product = productLabels[Number(draft.product_id)];
    setError('');
    setLines(rows => [...rows, {
      product_id: Number(draft.product_id), location_id: Number(draft.location_id),
      cadence: draft.cadence, due_on: draft.due_on,
      product_name: product?.name, sku: product?.sku,
      policy_version: product?.policy_version,
    }]);
  }

  async function save() {
    if (busy) return;
    if (!lines.length) { setError('Add at least one product and location.'); return; }
    setBusy(true); setError('');
    try {
      await api.saveScope(plan.plan_key, payloadFor(['count.scope.save', plan.plan_key, String(lines.length)], {
        expected_state: 'DRAFT',
        lines: lines.map(line => ({
          product_id: line.product_id, location_id: line.location_id,
          cadence: line.cadence, due_on: line.due_on,
        })),
      }));
      toast.success('Count scope saved.');
      onSaved();
    } catch (failure) {
      setError(failure.response?.data?.detail || 'The scope could not be saved. Your lines are retained.');
    } finally { setBusy(false); }
  }

  const unreviewed = lines.filter(line => !line.policy_version).length;

  return <section className={pageClass} aria-label="Count scope editor">
    <RegisterHeader icon={ListChecks} title={`Scope · ${plan.code}`} count={lines.length}
      description="Each line is one product counted at one location. Saving replaces the plan's whole scope."
      actions={<>
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onClose}>Back to plans</button>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save scope'}</button>
      </>} />
    {error && <p role="alert" className={messageClass('error')}>{error}</p>}
    {!!unreviewed && <p className={messageClass('muted')}>{unreviewed} line(s) use a product without a reviewed inventory policy. The server will refuse those, because a counted quantity has no meaning without a unit rule.</p>}

    <div className={`${panelClass} grid gap-3 md:grid-cols-5`}>
      <label className="md:col-span-2"><span className={fieldLabelClass}>Product</span>
        <input className={`mb-2 block w-full ${inputClass}`} value={search} maxLength={160}
          onChange={event => setSearch(event.target.value)} placeholder="Search name or SKU" />
        <select className={`block w-full ${selectClass}`} value={draft.product_id}
          onChange={event => setDraft({ ...draft, product_id: event.target.value })}>
          <option value="">Select a product</option>
          {products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
        </select></label>
      <label><span className={fieldLabelClass}>Location</span>
        <select className={`block w-full ${selectClass}`} value={draft.location_id}
          onChange={event => setDraft({ ...draft, location_id: event.target.value })}>
          <option value="">Select a location</option>
          {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select></label>
      <label><span className={fieldLabelClass}>Cadence</span>
        <select className={`block w-full ${selectClass}`} value={draft.cadence}
          onChange={event => setDraft({ ...draft, cadence: event.target.value })}>
          {CADENCES.map(cadence => <option key={cadence} value={cadence}>{cadence}</option>)}
        </select></label>
      <label><span className={fieldLabelClass}>Due on</span>
        <input type="date" className={`block w-full ${inputClass}`} value={draft.due_on}
          onChange={event => setDraft({ ...draft, due_on: event.target.value })} /></label>
      <div className="md:col-span-5"><button type="button" className={secondaryButtonClass} onClick={add}>Add scope line</button></div>
    </div>

    <div className={cardClass}>
      {!lines.length ? <EmptyState icon={ListChecks} title="No scope lines yet."
          hint="Add the products and locations this plan covers. Annual coverage is measured against these lines." />
        : <table className={tableClass}>
          <thead><tr>{['Product', 'Location', 'Cadence', 'Due on', ''].map((label, index) => <th key={label || index} className={thClass}>{label}</th>)}</tr></thead>
          <tbody>{lines.map((line, index) => <tr key={`${line.product_id}:${line.location_id}`} className={trClass}>
            <td className={tdClass}>
              <span className="block text-sm font-semibold">{line.product_name || `Product ${line.product_id}`}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{line.sku}</span>
              {!line.policy_version && <span className="ml-2"><Badge tone="amber">No reviewed policy</Badge></span>}
            </td>
            <td className={tdClass}>{locations.find(location => location.id === line.location_id)?.name || `Location ${line.location_id}`}</td>
            <td className={tdClass}>{line.cadence}</td>
            <td className={tdClass}>{line.due_on}</td>
            <td className={`${tdClass} text-right`}><button type="button" className={rowActionClass}
              onClick={() => setLines(rows => rows.filter((_, position) => position !== index))}><Trash2 size={13} aria-hidden="true" />Remove</button></td>
          </tr>)}</tbody></table>}
    </div>
    <p className={hintClass}>Up to 500 lines per plan. Scope can only change while the plan is a draft, so an assigned round can never be re-aimed at different shelves.</p>
  </section>;
}
