import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";

const conditions = { AVAILABLE: "Eligible condition — not assigned", DAMAGED: "Damaged — unavailable", QUARANTINED: "Quarantined — unavailable" };

export default function StockSerials({ api, branch, location, balance, onClose }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 rounded-lg border cursor-pointer hover:bg-indigo-500/20 disabled:opacity-40";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setResult(null); setError("");
    api.serials(branch.id, location.id, balance.id, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Serial register could not be loaded. Check your connection and retry.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, branch.id, location.id, balance.id, page, limit, revision]);
  return <section aria-label="Serial register" className={`h-full min-h-0 min-w-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">Serial register — {balance.product_name}</h1><p>{branch.name} · {location.name} · {balance.sku}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={onClose}>Back to stock</button><button type="button" className={button} onClick={() => setRevision((n) => n + 1)}>Refresh serials</button></div></header>
    <p className="text-sm shrink-0">Read-only physical register. Reservations hold quantities, not particular serial numbers. An eligible condition does not mean the remaining stock quantity is unreserved. Exact serial assignment happens at handover; that workflow is not enabled yet.</p>
    {(!branch.is_active || !location.is_active || balance.product_status !== "active") && <p role="status">Inactive stock scope: reference only.</p>}
    <div className={`flex-1 min-h-0 overflow-auto border rounded-xl ${panel}`} aria-busy={loading}>
      {loading ? <p role="status" className="p-4">Loading serials…</p> : error ? <div role="alert" className="p-4"><p>{error}</p><button type="button" className={button} onClick={() => setRevision((n) => n + 1)}>Retry serials</button></div> : !result?.items.length ? <p className="p-4">No serial identities recorded. Do not infer serial numbers from quantity totals; review is required before posting.</p> :
        <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr><th scope="col" className="p-3">Serial number</th><th scope="col" className="p-3">Physical condition</th></tr></thead>
          <tbody>{result.items.map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-mono break-all min-w-48">{row.serial_number}</td><td className="p-3 min-w-48">{conditions[row.condition] || "Unknown — review required"}</td></tr>)}</tbody></table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : result?.pages || 1} totalCount={loading || error ? 0 : result?.total || 0}
      onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}
