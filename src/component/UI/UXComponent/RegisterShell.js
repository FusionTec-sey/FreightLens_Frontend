import React from 'react';
import { Loader2 } from 'lucide-react';

// Shared register styling. Keep data loading and actions in each feature screen.
export const pageClass = 'h-full min-h-0 flex flex-col gap-3 bg-slate-50 p-3 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:p-4';
export const headerBandClass = 'shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const toolbarClass = 'shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900';
export const cardClass = 'flex-1 min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const panelClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900';
export const tableClass = 'w-full text-sm';
export const thClass = 'sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-300';
export const tdClass = 'px-4 py-3.5 align-top';
export const trClass = 'border-b border-slate-100 transition-colors hover:bg-indigo-50/60 dark:border-slate-800 dark:hover:bg-slate-800/70';
export const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40';
export const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700';
export const dangerButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70';
export const surfaceClass = 'bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700';
export const rowActionClass ='inline-flex items-center rounded-lg px-2.5 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 dark:text-indigo-300 dark:hover:bg-slate-800';
export const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
export const fieldLabelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300';
export const hintClass = 'text-xs text-slate-500 dark:text-slate-400';
export const referenceClass = 'block max-w-[22ch] truncate font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300';
export const selectClass = `${inputClass} cursor-pointer`;
export const textareaClass = `block w-full ${inputClass} min-h-[88px] resize-y leading-relaxed`;

const messageTones = {
  info: 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  muted: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  error: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-200',
};

// Strip for save results and recovery notices. The screen keeps the role on its
// own message element, so these wrappers never add a second status or alert.
export function messageClass(tone = 'info') {
  return `shrink-0 flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-sm ${messageTones[tone] || messageTones.info}`;
}

export function LoadingState({ label }) {
  return <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 dark:text-slate-400">
    <Loader2 size={16} className="animate-spin text-indigo-500" aria-hidden="true" />{label}</div>;
}

export function EmptyState({ icon: Icon, title, hint }) {
  return <div className="flex flex-col items-center justify-center gap-2 p-10 text-center">
    {Icon && <Icon size={34} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />}
    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
    {hint && <p className={hintClass}>{hint}</p>}</div>;
}

export function RegisterHeader({ icon: Icon, title, description, count, actions }) {
  return <header className={headerBandClass}>
    <div className="flex min-w-0 items-center gap-3">
      {Icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon size={20} aria-hidden="true" /></span>}
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-bold">{title}</h1>{count != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{count}</span>}</div>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}</div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
}
