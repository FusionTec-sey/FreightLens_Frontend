import React from "react";

// Failed reads are not empty business results. Keep recovery consistent.
export default function LoadError({ title = "Unable to load this view", children, onRetry }) {
  return <section role="alert" className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-slate-900 dark:border-amber-700 dark:bg-slate-900 dark:text-slate-100">
    <h2 className="font-semibold">{title}</h2>
    <p className="mt-2 text-sm">{children}</p>
    {onRetry && <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Retry loading</button>}
  </section>;
}
