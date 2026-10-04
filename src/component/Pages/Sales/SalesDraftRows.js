import React from 'react';
import { Badge, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

// Two presentations of the same server page, never a separate list or client filter.
export default function SalesDraftRows({ rows, selectedKey, loading, onOpen, theme, compact = false }) {
  if (selectedKey || compact) return <ul aria-label="Sales drafts on this page" className="divide-y divide-slate-200 dark:divide-slate-700">
    {rows.map(row => <li key={row.document_key} className={`p-3 space-y-2 ${selectedKey === row.document_key ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words font-semibold">{row.customer_name || 'Customer name unavailable'}</p>
        <Badge tone="amber">Draft</Badge>
      </div>
      <p className="break-all font-mono text-xs">{row.document_key}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>{row.branch_name || `Branch ${row.branch_id}`} · Version {row.version}</p>
        <button type="button" disabled={loading} aria-current={selectedKey === row.document_key ? 'true' : undefined}
          aria-label={`View draft ${row.document_key}`} className={`${secondaryButtonClass} min-h-[44px]`} onClick={() => onOpen(row)}>
          {selectedKey === row.document_key ? 'Selected' : 'View'}
        </button>
      </div>
    </li>)}
  </ul>;
  return <table className="w-full min-w-[720px] text-sm">
    <thead className={`sticky top-0 ${theme}`}><tr>{['Draft reference', 'Customer', 'Version', 'Branch', 'Status', 'Amount', 'Payment', 'Collection', 'Action'].map(label => <th scope="col" key={label} className="p-3 text-left">{label}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr className="border-t hover:bg-slate-50 dark:hover:bg-slate-800" key={row.document_key}>
      <td className="p-3 font-mono"><span className="block max-w-[140px] truncate" title={row.document_key}>{row.document_key}</span></td>
      <td className="p-3">{row.customer_name || 'Customer name unavailable'}</td>
      <td className="p-3">{row.version}</td><td className="p-3">{row.branch_name || `Branch ${row.branch_id}`}</td>
      <td className="p-3"><Badge tone="amber">Draft</Badge></td>
      <td className="p-3 text-slate-500">Not calculated</td>
      <td className="p-3">Not recorded</td>
      <td className="p-3">Not authorised</td>
      <td className="p-3"><button type="button" disabled={loading} aria-label={`View draft ${row.document_key}`}
        className={`${secondaryButtonClass} min-h-[44px]`} onClick={() => onOpen(row)}>View</button></td>
    </tr>)}</tbody>
  </table>;
}
