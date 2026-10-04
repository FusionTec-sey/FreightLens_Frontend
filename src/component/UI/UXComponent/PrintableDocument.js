import React from 'react';
import { Printer, X } from 'lucide-react';
import { primaryButtonClass, secondaryButtonClass } from './RegisterShell';

/**
 * Real-world document layout for printing or saving as PDF through the browser.
 *
 * Presentation only: it renders what the caller already fetched and never claims
 * a document is an invoice, receipt or proof of payment. The caller supplies the
 * statutory wording in `notes`, so a draft keeps saying it is a draft.
 *
 * Printing uses the browser dialog, so a page break never needs a server round
 * trip. `print-document` and `no-print` are defined in index.css.
 */
export default function PrintableDocument({
  title,
  documentType,
  reference,
  issuedLabel = 'Prepared',
  issuedAt,
  company,
  parties = [],
  meta = [],
  columns = [],
  rows = [],
  notes = [],
  children,
  onClose,
}) {
  const stamp = issuedAt ? new Date(issuedAt) : new Date();
  return (
    <section className="flex h-full min-h-0 flex-col bg-slate-100 dark:bg-slate-950" aria-label={`${documentType} document`}>
      <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold">{documentType}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Check the details, then print or save as PDF from the browser dialog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButtonClass} onClick={() => window.print()}><Printer size={15} aria-hidden="true" />Print document</button>
          {onClose && <button type="button" className={secondaryButtonClass} onClick={onClose}><X size={15} aria-hidden="true" />Close</button>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <article className="print-document mx-auto w-full max-w-[820px] bg-white p-10 text-slate-900 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
            <div>
              <p className="text-lg font-bold uppercase tracking-wide">{company?.name || 'Company'}</p>
              {company?.subtitle && <p className="text-xs text-slate-600">{company.subtitle}</p>}
            </div>
            <div className="text-right">
              <p className="text-base font-bold uppercase tracking-widest">{documentType}</p>
              {reference && <p className="mt-1 break-all font-mono text-[11px] text-slate-600">{reference}</p>}
              <p className="mt-1 text-[11px] text-slate-600">{issuedLabel} {stamp.toLocaleString()}</p>
            </div>
          </header>

          {title && <h2 className="mt-5 text-sm font-bold">{title}</h2>}

          {!!parties.length && (
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              {parties.map(party => (
                <div key={party.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{party.label}</p>
                  <p className="mt-1 text-sm font-semibold">{party.name || '—'}</p>
                  {party.lines?.filter(Boolean).map(line => <p key={line} className="text-xs text-slate-700">{line}</p>)}
                </div>
              ))}
            </div>
          )}

          {!!meta.length && (
            <dl className="mt-4 grid gap-3 border-y border-slate-200 py-3 sm:grid-cols-3">
              {meta.map(item => (
                <div key={item.label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</dt>
                  <dd className="mt-0.5 break-all text-xs font-semibold">{item.value || '—'}</dd>
                </div>
              ))}
            </dl>
          )}

          {!!columns.length && (
            <table className="mt-5 w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-400">
                  {columns.map(column => (
                    <th key={column.key} className={`py-2 pr-3 text-[10px] font-bold uppercase tracking-wider ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key || index} className="border-b border-slate-200 align-top">
                    {columns.map(column => (
                      <td key={column.key} className={`py-2 pr-3 ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}>{row[column.key]}</td>
                    ))}
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={columns.length} className="py-6 text-center text-slate-500">No lines on this document.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {children}

          {!!notes.length && (
            <footer className="mt-6 space-y-1 border-t border-slate-300 pt-3">
              {notes.filter(Boolean).map(note => <p key={note} className="text-[10px] leading-relaxed text-slate-600">{note}</p>)}
            </footer>
          )}
        </article>
      </div>
    </section>
  );
}
