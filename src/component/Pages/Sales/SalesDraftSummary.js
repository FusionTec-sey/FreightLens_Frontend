import React from 'react';

// Drafts have no authoritative pricing/payment contract yet. Never infer zeros
// or an unpaid balance from quantities or old catalogue prices.
export default function SalesDraftSummary({ compact = false, pricing, loading = false, error = '', onRetry }) {
  const ready = pricing?.status === 'READY';
  return <section aria-label="Draft totals" className={`sales-summary ${compact ? 'sales-summary-compact' : ''}`}>
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Order summary</h3><span className="text-xs text-slate-500 dark:text-slate-400">{ready ? 'Current pricing preview' : loading ? 'Loading pricing…' : 'Pricing pending'}</span></div>
    {!compact && <dl className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
      <div className="flex justify-between gap-2"><dt>Net</dt><dd>{ready ? `${pricing.currency} ${pricing.net_total_scr}` : 'Not calculated'}</dd></div>
      <div className="flex justify-between gap-2"><dt>Included tax</dt><dd>{ready ? `${pricing.currency} ${pricing.tax_total_scr}` : 'Not calculated'}</dd></div>
    </dl>}
    <div className="mt-2 flex justify-between gap-2 border-t border-slate-200 pt-2 font-semibold dark:border-slate-700"><span>Total</span><span>{ready ? `${pricing.currency} ${pricing.gross_total_scr}` : 'Not calculated'}</span></div>
    {pricing?.requires_floor_approval && <p role="alert" className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">A selected customer price is below its approval floor. An exact manager review is required before future posting can consume this price.</p>}
    {error && <div className="mt-2 text-xs text-amber-700 dark:text-amber-300"><p role="status">{error}</p>{onRetry && <button type="button" className="mt-2 underline" onClick={onRetry}>Retry pricing</button>}</div>}
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ready ? `Calculated ${new Date(pricing.priced_at).toLocaleString()} from versioned store, customer and tax rules. Preview only—no payment, invoice or stock posting.` : 'Authoritative store price, selling unit and tax configuration are required. Saving creates a draft, not a payment or invoice.'}</p>
  </section>;
}
