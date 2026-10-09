import React, { useState } from "react";
import axios from "axios";
import { Database, RefreshCw } from "lucide-react";

const endpoint = `${process.env.REACT_APP_NETWORK}/admin/legacy-sync`;

export default function LegacySyncPanel() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await axios.get(`${endpoint}/preview`);
      setPreview(response.data);
    } catch (err) {
      setPreview(null);
      setError(err.response?.data?.detail || "Could not check the legacy database.");
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!preview?.fingerprint) return;
    if (!window.confirm("Import the previewed legacy records into this database? Existing edited records will be kept as conflicts.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await axios.post(`${endpoint}/apply`, { fingerprint: preview.fingerprint });
      setResult(response.data);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Legacy sync failed. Check the data again before retrying.");
    } finally {
      setBusy(false);
    }
  };

  const rows = Object.entries(preview?.tables || {});
  const totals = rows.reduce((acc, [, counts]) => {
    Object.entries(counts).forEach(([key, count]) => { acc[key] = (acc[key] || 0) + count; });
    return acc;
  }, {});

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4" aria-labelledby="legacy-sync-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="legacy-sync-title" className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Database size={18} /> Temporary legacy data sync
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Check the old containermgmt database, review the changes, then import them into this system.
          </p>
        </div>
        <button type="button" onClick={check} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} /> Check legacy data
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {result && (
        <div role="status" className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          Sync run #{result.run_id}: {Object.entries(result.summary || {}).map(([key, count]) => `${count} ${key}`).join(", ")}. Run Check legacy data again to review remaining conflicts.
        </div>
      )}
      {preview && (
        <>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {preview.source_rows} source rows · {totals.new || 0} new · {totals.changed || 0} changed · {totals.conflict || 0} conflicts · {totals.archived || 0} archive only
          </p>
          {preview.organisations_to_create?.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Organisations to create: {preview.organisations_to_create.join(", ")}. Unidentified records go to the unknown legacy organisation for later remapping.
            </p>
          )}
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>
                <th className="p-2">Source table</th><th className="p-2">New</th><th className="p-2">Changed</th><th className="p-2">Unchanged</th><th className="p-2">Conflicts</th><th className="p-2">Archive only</th>
              </tr></thead>
              <tbody>{rows.map(([name, counts]) => <tr key={name} className="border-t border-slate-200 dark:border-slate-700">
                <td className="p-2 font-mono">{name}</td><td className="p-2">{counts.new || 0}</td><td className="p-2">{counts.changed || 0}</td><td className="p-2">{counts.unchanged || 0}</td><td className="p-2">{counts.conflict || 0}</td><td className="p-2">{counts.archived || 0}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <button type="button" onClick={apply} disabled={busy || !(totals.new || totals.changed || totals.archived)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Apply previewed sync
          </button>
        </>
      )}
    </section>
  );
}
