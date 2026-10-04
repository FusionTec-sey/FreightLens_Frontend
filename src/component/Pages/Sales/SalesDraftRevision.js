import React, { useEffect, useState } from 'react';
import { secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';
import SalesProductImage from './SalesProductImage';

export default function SalesDraftRevision({ api, documentKey, version, onClose }) {
  const [result, setResult] = useState(null), [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.revision(documentKey, version, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (data.document_key !== documentKey || data.version !== version || data.read_only !== true) {
        throw new Error('Mismatched revision');
      }
      setResult(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError('This revision could not be loaded. Check access and retry.');
    });
    return () => controller.abort();
  }, [api, documentKey, version, refresh]);
  return <section aria-label={`Saved draft version ${version}`} className="flex flex-col flex-1 min-h-0 gap-3">
    <header className="shrink-0 flex flex-wrap justify-between gap-2 p-3">
      <h3 className="font-semibold">Saved version {version} · Read only</h3>
      <div className="flex gap-2"><button type="button" className={secondaryButtonClass} onClick={onClose}>Back to revisions</button>
        <button type="button" className={secondaryButtonClass} onClick={() => setRefresh(n => n + 1)}>Retry revision</button></div>
    </header>
    <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 space-y-3">
      <p className="text-xs">Saved quantities and units. Product names, SKUs and images are current catalogue labels, not historical invoice snapshots. Current reservations, payments and collections are not shown.</p>
      {error ? <p role="alert">{error}</p> : !result ? <p role="status">Loading saved revision…</p> : <>
        <div className="text-sm"><p>{result.customer_name || 'Customer name unavailable'} · Customer profile v{result.customer_version}</p>
          <p>Branch {result.branch_id} · Staff reference {result.created_by}</p>
          <time dateTime={result.created_at}>{new Date(result.created_at).toLocaleString()}</time></div>
        <ol className="divide-y divide-slate-200 dark:divide-slate-700">{result.lines.map(line => <li key={line.line_key} className="py-3">
          <div className="flex items-start gap-3"><SalesProductImage source={line} size="small" />
            <div className="min-w-0 flex-1"><p className="font-medium break-words">{line.product_name || `Product ${line.product_id}`}</p><p className="text-xs">{line.sku || 'SKU unavailable'}</p></div>
            <p className="font-semibold">{line.quantity} {line.unit}</p></div>
          <p className="text-xs mt-2">Saved base quantity: {line.base_quantity} {line.base_unit} · Policy v{line.expected_policy_version}</p>
        </li>)}</ol>
      </>}
    </div>
  </section>;
}
