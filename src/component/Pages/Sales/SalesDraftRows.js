import React from 'react';
import { Badge, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

// Two presentations of the same server page, never a separate list or client filter.
export default function SalesDraftRows({ rows, selectedKey, loading, onOpen, theme, compact = false }) {
  if (selectedKey || compact) return <ul aria-label="Sales drafts on this page" className="divide-y divide-slate-200 dark:divide-slate-700">
    {rows.map(row => <li key={row.document_key} className={`p-3 space-y-1 ${selectedKey === row.document_key ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words font-semibold">{row.customer_name || 'Customer name unavailable'}</p>
        <Badge tone="amber">Draft v{row.version}</Badge>
      </div>
      <p className="text-sm">{row.branch_name || `Branch ${row.branch_id}`}</p>
      <p className="break-all font-mono text-[11px] text-slate-500 dark:text-slate-400" title="Exact draft reference">{row.document_key}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Payment: not recorded · Collection: not authorised</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>Reservations: open line detail</p>
        <button type="button" disabled={loading} aria-current={selectedKey === row.document_key ? 'true' : undefined}
          aria-label={`View draft ${row.document_key}`} className={`${secondaryButtonClass} min-h-[44px]`} onClick={() => onOpen(row)}>
          {selectedKey === row.document_key ? 'Selected' : 'View'}
        </button>
      </div>
    </li>)}
  </ul>;
  return <table className="w-full min-w-[760px] text-sm">
    <thead className={`sticky top-0 ${theme}`}><tr>{['Draft', 'Selling store', 'Demand', 'Reservations', 'Pricing', 'Payment', 'Collection', 'Action'].map(label => <th scope="col" key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr className="border-t hover:bg-slate-50 dark:hover:bg-slate-800" key={row.document_key}>
      <td className="p-3"><span className="block font-semibold">{row.customer_name || 'Customer name unavailable'}</span>
        <span className="block text-xs">Draft v{row.version}</span><span className="block max-w-[180px] truncate font-mono text-[11px] text-slate-500 dark:text-slate-400" title={row.document_key}>{row.document_key}</span></td>
      <td className="p-3">{row.branch_name || `Branch ${row.branch_id}`}</td>
      <td className="p-3"><Badge tone="amber">Draft</Badge></td>
      <td className="p-3 text-slate-500">Line detail</td>
      <td className="p-3 text-slate-500">Not calculated</td>
      <td className="p-3">Not recorded</td>
      <td className="p-3">Not authorised</td>
      <td className="p-3"><button type="button" disabled={loading} aria-label={`View draft ${row.document_key}`}
        className={`${secondaryButtonClass} min-h-[44px]`} onClick={() => onOpen(row)}>View</button></td>
    </tr>)}</tbody>
  </table>;
}
