import React, { useEffect, useMemo, useRef, useState } from 'react';
import { locationError } from '../../../../services/inventoryLocationsApi';
import useOperationIntent from '../../../../hooks/useOperationIntent';
import ManagerCases from './ManagerCases';
import EvidenceChoice from './EvidenceChoice';

const initial = { invoice_reference: '', invoice_date: '', source_currency: 'SCR', eligible_amount: '', exchange_rate_to_scr: '1', capitalisation_reason: '', reason: '' };
export default function CostChargeEvidence({ api, pool, proposal, userId, canManage, onClose, panel, button, isDark }) {
  const [form, setForm] = useState(initial), [supplier, setSupplier] = useState(null), [invoice, setInvoice] = useState(null), [fx, setFx] = useState(null);
  const [picker, setPicker] = useState(null), [reviews, setReviews] = useState(false), [saved, setSaved] = useState(null);
  const [error, setError] = useState(''), [fields, setFields] = useState({}), [saving, setSaving] = useState(false), [discard, setDiscard] = useState(null);
  const busy = useRef(false), lifecycle = useRef(null);
  const { payloadFor } = useOperationIntent();
  const dirty = !saved && (JSON.stringify(form) !== JSON.stringify(initial) || supplier || invoice || fx);
  useEffect(() => { const controller = new AbortController(); lifecycle.current = controller; return () => controller.abort(); }, []);
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const reviewApi = useMemo(() => ({
    managerCases: (page, limit, signal, view) => api.chargeEvidenceCases(pool.id, proposal.proposal_key, page, limit, signal, view),
    reviewPolicyCase: (key, body, signal) => api.reviewChargeEvidence(pool.id, proposal.proposal_key, key, body, signal),
    evidenceDocument: api.evidenceDocument,
    reviewedEvidenceDocument: (caseKey, id, signal) => api.reviewedEvidenceDocument(pool.id, proposal.proposal_key, caseKey, id, signal),
  }), [api, pool.id, proposal.proposal_key]);
  const leave = target => { if (dirty) setDiscard(target); else if (target === 'reviews') setReviews(true); else onClose(); };
  const change = (name, value) => setForm(current => ({ ...current, [name]: value,
    ...(name === 'source_currency' ? { exchange_rate_to_scr: value === 'SCR' ? '1' : '' } : {}) }));
  const submit = async event => {
    event.preventDefault();
    if (busy.current || !canManage || !supplier || !invoice || saved || discard) return;
    busy.current = true; setSaving(true); setError(''); setFields({});
    const controller = lifecycle.current;
    try {
      const { reason, ...declaration } = form;
      const body = payloadFor(['charge-evidence', pool.id, proposal.proposal_key], { reason, declaration: {
        ...declaration, supplier_id: supplier.id, document_id: invoice.id, fx_document_id: form.source_currency === 'SCR' ? null : fx?.id || null,
      } });
      const { data } = await api.requestChargeEvidence(pool.id, proposal.proposal_key, body, controller.signal);
      if (!controller.signal.aborted) setSaved(data.case_key);
    } catch (err) { if (!controller.signal.aborted) { const failure = locationError(err); setError(failure.message); setFields(failure.fields); } }
    finally { busy.current = false; if (!controller.signal.aborted) setSaving(false); }
  };
  if (reviews) return <ManagerCases api={reviewApi} userId={userId} costAllocation chargeEvidence canReview={canManage} onClose={() => setReviews(false)} />;
  if (picker) return <EvidenceChoice title={picker === 'supplier' ? 'Select supplier' : picker === 'invoice' ? 'Select invoice document' : 'Select exchange-rate document'} load={picker === 'supplier' ? api.evidenceSuppliers : api.evidenceDocuments}
    panel={panel} button={button} isDark={isDark} onClose={() => setPicker(null)} onSelect={row => { (picker === 'supplier' ? setSupplier : picker === 'invoice' ? setInvoice : setFx)(row); setPicker(null); }} />;
  return <section aria-label="Charge evidence" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">Charge evidence</h1><p>{proposal.charge_reference} · Allocation SCR {proposal.total_scr}</p></div>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={saving} onClick={() => leave('back')}>Back to proposal</button><button className={button} disabled={saving} onClick={() => leave('reviews')}>View evidence reviews</button></div></header>
    {discard && <div role="alert">Discard unsaved evidence details?<button className={button} onClick={() => setDiscard(null)}>Keep editing</button><button className={button} onClick={() => { const target = discard; setDiscard(null); setForm(initial); setSupplier(null); setInvoice(null); setFx(null); if (target === 'reviews') setReviews(true); else onClose(); }}>Discard evidence draft</button></div>}
    <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0 overflow-auto space-y-3">
        <p>Declare the eligible expense and documented exchange rate. A different authorised manager must inspect the documents. Approval does not post a financial charge or change selling prices.</p>
        <p>Selectable evidence is limited to existing general and purchase-order documents. Payment and quotation documents are not available in this workflow yet.</p>
        {error && <p role="alert">{error}</p>}{Object.entries(fields).map(([field, message]) => <p role="alert" key={field}>{field}: {message}</p>)}
        {saved ? <p role="status">Evidence review requested: {saved}</p> : canManage ? <fieldset disabled={saving || Boolean(discard)} className="space-y-3">
          <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setPicker('supplier')}>{supplier ? `Supplier: ${supplier.label}` : 'Choose supplier'}</button>
            <button type="button" className={button} onClick={() => setPicker('invoice')}>{invoice ? `Invoice: ${invoice.label}` : 'Choose invoice document'}</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[['invoice_reference', 'Invoice reference', 'text'], ['invoice_date', 'Invoice date', 'date'], ['source_currency', 'Source currency (3 letters)', 'text'], ['eligible_amount', 'Eligible amount in source currency', 'text'], ['exchange_rate_to_scr', 'SCR per one source currency unit', 'text']].map(([name, label, type]) => <label key={name} className="block">{label}<input required type={type} value={form[name]} maxLength={name === 'source_currency' ? 3 : 160} aria-invalid={Boolean(fields[name])} className={`block w-full border rounded-lg p-2 ${panel}`} onChange={event => change(name, event.target.value)} /></label>)}</div>
          <p>For SCR use rate 1. Enter a documented rate for foreign currency; rates are never inferred. The converted eligible amount must equal the complete saved allocation.</p>
          {form.source_currency !== 'SCR' && <button type="button" className={button} onClick={() => setPicker('fx')}>{fx ? `Exchange-rate document: ${fx.label}` : 'Choose exchange-rate document'}</button>}
          {[['capitalisation_reason', 'Why this expense belongs in inventory cost'], ['reason', 'Review request reason']].map(([name, label]) => <label key={name} className="block">{label}<textarea required maxLength={1000} value={form[name]} className={`block w-full border rounded-lg p-2 ${panel}`} onChange={event => setForm({ ...form, [name]: event.target.value })} /></label>)}
        </fieldset> : <p>View-only access. Open evidence reviews to inspect existing declarations.</p>}
      </div>
      {canManage && !saved && <footer className="shrink-0 border-t pt-3"><button type="submit" className={button} disabled={saving || Boolean(discard) || !supplier || !invoice || (form.source_currency !== 'SCR' && !fx)}>{saving ? 'Requesting…' : 'Request evidence review'}</button></footer>}
    </form>
  </section>;
}
