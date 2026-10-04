import React from 'react';

// Drafts have no authoritative pricing/payment contract yet. Never infer zeros
// or an unpaid balance from quantities or old catalogue prices.
export default function SalesDraftSummary({ compact = false }) {
  return <section aria-label="Draft totals" className={`sales-summary ${compact ? 'sales-summary-compact' : ''}`}>
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Order summary</h3><span className="text-xs text-slate-500 dark:text-slate-400">SCR · pricing pending</span></div>
    {!compact && <dl className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
      <div className="flex justify-between gap-2"><dt>Subtotal</dt><dd>Not calculated</dd></div>
      <div className="flex justify-between gap-2"><dt>Tax</dt><dd>Not calculated</dd></div>
    </dl>}
    <div className="mt-2 flex justify-between gap-2 border-t border-slate-200 pt-2 font-semibold dark:border-slate-700"><span>Total</span><span>Not calculated</span></div>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Prices and tax require the pricing service. Saving creates a draft, not a payment or invoice.</p>
  </section>;
}
