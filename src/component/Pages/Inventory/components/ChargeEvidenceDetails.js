import React, { useEffect, useRef, useState } from 'react';

export default function ChargeEvidenceDetails({ api, item, button }) {
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const lifecycle = useRef(null), busy = useRef(false), urls = useRef([]);
  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    const links = urls.current;
    return () => { controller.abort(); links.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  const download = async doc => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    const controller = lifecycle.current;
    try {
      const { data } = await (item.source_version === 2
        ? api.reviewedEvidenceDocument(item.case_key, doc.id, controller.signal)
        : api.evidenceDocument(doc.id, controller.signal));
      if (!controller.signal.aborted) {
        const url = URL.createObjectURL(data); urls.current.push(url);
        const link = document.createElement('a'); link.href = url; link.download = doc.label; link.click();
      }
    } catch (err) { if (!controller.signal.aborted) setError('Document download failed. Check access and file availability before approving.'); }
    finally { busy.current = false; if (!controller.signal.aborted) setLoading(false); }
  };
  const declaration = item.declaration;
  return <section aria-label="Declared invoice evidence" className="space-y-2 border rounded-lg p-3">
    <p>Supplier: {item.supplier_name} · Invoice date: {declaration.invoice_date}</p>
    <p>Eligible amount: {declaration.source_currency} {declaration.eligible_amount} · SCR per source unit: {declaration.exchange_rate_to_scr}</p>
    <p>{item.source_version === 2
      ? 'Version-bound evidence: downloads are checked against the exact saved file version and content. Inspect the invoice, eligible cost and documented exchange rate before deciding. Financial posting remains disabled.'
      : 'Historical metadata-only evidence: downloads show current files, not verified historical bytes. This case cannot authorise financial posting. Create a new evidence request for version-bound review.'}</p>
    {item.documents.map(doc => <p key={doc.id}><button type="button" className={button} disabled={loading} onClick={() => download(doc)}>Download {doc.label}</button> · {String(doc.id) === String(declaration.document_id) ? 'Invoice' : 'Exchange-rate evidence'}</p>)}
    {error && <p role="alert">{error}</p>}
  </section>;
}
