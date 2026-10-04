import React, { useEffect, useMemo, useRef, useState } from 'react';
import DraftSourcePicker from './DraftSourcePicker';
import { pageClass, panelClass, secondaryButtonClass, rowActionClass } from '../../UI/UXComponent/RegisterShell';

// Reuse paginated draft reads; selection never creates another catalogue/demand.
export default function ReallocationTargetPicker({ api, source, onSelect, onClose }) {
  const [draft, setDraft] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  const load = useMemo(() => async (...args) => {
    const response = await api.list(...args);
    return { ...response, data: { ...response.data, items: response.data.items.map(row => ({ ...row,
      id: row.document_key, name: `Draft ${row.document_key}`, code: `Store ${row.branch_id} · v${row.version}` })) } };
  }, [api]);
  async function open(row) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setDraft(null); setError('');
    try {
      const { data } = await api.read(row.document_key, controller.signal);
      if (controller.signal.aborted) return;
      if (data.document_key !== row.document_key || data.status !== 'DRAFT' || data.branch_id !== source.branch_id)
        throw new Error('Ineligible draft');
      setDraft(data);
    } catch { if (!controller.signal.aborted) setError('Destination unavailable or in another store. Choose an accessible same-store draft.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const lines = draft?.lines.filter(line => line.product_id === source.product_id && line.base_unit === source.base_unit &&
    !(draft.document_key === source.document_key && line.line_key === source.line_key)) || [];
  return <section className={pageClass}>
    {error && <p role="alert">{error}</p>}
    {busy ? <p role="status">Checking destination access…</p> : draft ? <>
      <h2>Choose destination line · draft version {draft.version}</h2>
      <p>Same product, base unit and store only. The server checks current demand and reservation history before accepting the request.</p>
      <div className="flex-1 min-h-0 overflow-auto space-y-3">{lines.length ? lines.map(line => <div className={panelClass} key={line.line_key}>
        <p>{line.product_name || `Product ${line.product_id}`} · Demand {line.base_quantity} {line.base_unit} · Reserved {line.reserved_quantity || '0'}</p>
        <button type="button" className={rowActionClass} onClick={() => onSelect({ document_key: draft.document_key, line_key: line.line_key, version: draft.version })}>Choose line {line.line_key}</button>
      </div>) : <p>No matching destination lines in this draft.</p>}</div>
      <button type="button" className={secondaryButtonClass} onClick={() => setDraft(null)}>Choose another draft</button>
    </> : <div className="flex-1 min-h-0"><DraftSourcePicker title="Choose destination draft" load={load} onSelect={open} onClose={onClose} /></div>}
    {(draft || busy) && <button type="button" className={secondaryButtonClass} onClick={onClose}>Back to request</button>}
  </section>;
}
