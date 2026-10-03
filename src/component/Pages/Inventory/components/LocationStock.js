import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import StockSerials from "./StockSerials";
import ReclassificationProposals from "./ReclassificationProposals";

// Keep decimal strings exact, including values beyond JavaScript's safe precision.
export function displayQuantity(value) {
  if (typeof value !== "string" || !/^\d+(\.\d{1,6})?$/.test(value)) return "Unavailable";
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}

export default function LocationStock({ api, branch, location, onClose, canPropose = false, canReview = false, userId }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serialBalance, setSerialBalance] = useState(null);
  const [proposalBalance, setProposalBalance] = useState(null);
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setResult(null);
    api.stock(branch.id, location.id, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((err) => {
      if (!controller.signal.aborted) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Stock could not be loaded. Check your connection and retry.");
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, branch.id, location.id, page, limit, revision]);

  if (proposalBalance?.api === api) return <ReclassificationProposals key={proposalBalance.row.id} api={api} balance={proposalBalance.row} canPropose={canPropose} canReview={canReview} userId={userId}
    onClose={() => setProposalBalance(null)} />;
  if (serialBalance) return <StockSerials key={serialBalance.id} api={api} branch={branch} location={location} balance={serialBalance}
    onClose={() => { setSerialBalance(null); setRevision((n) => n + 1); }} />;
  return <section aria-label="Location stock" className={`h-full min-h-0 min-w-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between items-center gap-3">
      <div><h1 className="text-xl font-bold">{location.name} — stock</h1>
        <p className="text-sm">{branch.name} · {location.code} · Read-only ledger quantities</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={onClose}>Back to locations</button>
        <button type="button" className={button} onClick={() => setRevision((n) => n + 1)}>Refresh stock</button>
      </div>
    </header>
    <p className="text-sm shrink-0">This exact location only; child locations and other stores are not included. Available = on-hand − reserved − damaged − quarantined. Pickup plans do not reserve stock.</p>
    {(!branch.is_active || !location.is_active) && <p role="status" className="text-sm shrink-0">This branch or location is inactive. Quantities are shown for reference only.</p>}
    <p className="text-sm shrink-0">Not a checkout promise or a live stock feed. Refresh before reviewing; posting must recheck availability, batch matching and expiry. Each batch is a separate row. Legacy product totals are not imported here.</p>
    <div className={`flex-1 min-h-0 overflow-auto border rounded-xl ${panel}`} aria-busy={loading}>
      {loading ? <p role="status" className="p-4">Loading stock…</p> : error ? <div role="alert" className="p-4"><p>{error}</p><button type="button" className={button} onClick={() => setRevision((n) => n + 1)}>Retry stock</button></div> : !result?.items.length ?
        <p className="p-4">No ledger balances recorded at this location yet. This does not mean physical stock is zero. Opening balances need a verified import or approved opening workflow.</p> :
        <table className="w-full text-sm text-left">
          <thead className={`sticky top-0 ${panel}`}><tr>{["Product / SKU", "Batch / expiry", "Unit", "On-hand", "Reserved", "Available", "Damaged", "Quarantined", "Record version"].map((label) => <th scope="col" className="p-3 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead>
          <tbody>{result.items.map((row) => <tr key={row.id} className="border-t">
            <td className="p-3 min-w-48"><div>{row.product_name}</div><div className="font-mono">{row.sku}</div>{row.product_status !== "active" && <span>Inactive product</span>}</td>
            <td className="p-3 min-w-48">{row.tracking_policy === "BATCH" ? <><div className="font-mono">{row.batch_code}</div><div>Shade: {row.batch_shade || "Not recorded"}</div><div>Calibre: {row.batch_calibre || "Not recorded"}</div><div>Expiry: {row.expires_on || "Not recorded"}</div></> : row.tracking_policy === "SERIAL" ? <><div>Serial tracked</div><button type="button" className={button} onClick={() => setSerialBalance(row)}>View serials</button></> : "Ordinary / untracked"}</td>
            <td className="p-3 whitespace-nowrap">{row.base_unit}<div className="text-xs">{row.unit_policy_status === "SNAPSHOTTED" ? `Increment: ${displayQuantity(row.quantity_step)}` : "Unit rules need review — posting blocked"}</div></td>
            {["on_hand", "reserved", "available", "damaged", "quarantined"].map((key) => <td key={key} className="p-3 text-right whitespace-nowrap tabular-nums">{displayQuantity(row[key])}</td>)}
            <td className="p-3 whitespace-nowrap">{row.version}<div><button type="button" className={button} onClick={() => setProposalBalance({ api, row })}>Reclassification proposals</button></div></td>
          </tr>)}</tbody>
        </table>}
    </div>
    <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : result?.pages || 1} totalCount={loading || error ? 0 : result?.total || 0}
      onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
  </section>;
}
