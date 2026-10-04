import React, { useEffect, useState } from "react";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import { locationError } from "../../../../services/inventoryLocationsApi";
import { useAuth } from "../../../../context/AuthContext";
import CostReconciliationCases from "./CostReconciliationCases";

export default function CostPoolReconciliationReadiness({ api, pool, panel, button, isDark, onClose }) {
  const { permissions = [], isSuperAdmin, userId } = useAuth();
  const canRequest = isSuperAdmin || permissions.includes("Request_CostReconciliation");
  const canReview = isSuperAdmin || permissions.includes("Review_CostReconciliation");
  const canExecute = isSuperAdmin || permissions.includes("Execute_CostReconciliation");
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState("");
  const [cases, setCases] = useState(false), [candidate, setCandidate] = useState(null);
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError("");
    api.reconciliationReadiness(pool.id, page, limit, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) setResult({ api, poolId: pool.id, data }); })
      .catch(err => { if (!controller.signal.aborted) setError(locationError(err).message); });
    return () => controller.abort();
  }, [api, pool.id, page, limit, reload]);
  const data = result?.api === api && result.poolId === pool.id ? result.data : null;
  const label = row => row.readiness === "READY" ? "Quantity agrees" :
    row.readiness === "MISSING_VALUATION" ? "Missing valuation" :
    row.readiness === "UNIT_MISMATCH" ? "Unit mismatch" : "Quantity mismatch";
  if (cases) return <CostReconciliationCases api={api} pool={pool} candidate={candidate} userId={userId}
    canRequest={canRequest} canReview={canReview} canExecute={canExecute} panel={panel} button={button} isDark={isDark}
    onClosed={() => setReload(value => value + 1)} onClose={() => { setCases(false); setCandidate(null); }} />;
  return <section aria-label="Cost pool reconciliation readiness" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">Reconciliation readiness</h1><p>{pool.code} — {pool.name}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={onClose}>Back to valuations</button>{(canRequest || canReview || canExecute) && <button type="button" className={button} onClick={() => setCases(true)}>Reviewed checkpoints</button>}<button type="button" className={button} onClick={() => setReload(value => value + 1)}>Refresh readiness</button></div></header>
    <p className="shrink-0 text-sm">Read-only central comparison of current physical on-hand and the latest valuation head. “Quantity agrees” is not final accounting approval; evidence retention, period review and export remain separate gates.</p>
    <div className="flex-1 min-h-0 overflow-auto border rounded-xl">
      {error ? <p role="alert" className="p-4">{error} Use Refresh readiness to retry.</p> : !data ? <p role="status" className="p-4">Loading reconciliation readiness…</p> : !data.items.length ? <p className="p-4">No physical or valuation records exist in this cost pool.</p> :
        <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr>{["Product", "Physical on-hand", "Valuation head", "Difference", "Readiness", "Action"].map(value => <th scope="col" className="p-3 whitespace-nowrap" key={value}>{value}</th>)}</tr></thead>
          <tbody>{data.items.map(row => <tr key={row.product_id} className="border-t"><td className="p-3">{row.product_name}<p>Product #{row.product_id}</p></td>
            <td className="p-3 font-mono whitespace-nowrap">{row.physical_quantity ?? "Incompatible units"}<p>{row.physical_base_units.length ? row.physical_base_units.join(", ") : "No current stock balance"}</p></td>
            <td className="p-3 font-mono whitespace-nowrap">{row.pool_quantity == null ? "Not valued" : `${row.pool_quantity} ${row.valuation_base_unit}`}<p>{row.pool_value_scr == null ? "—" : `SCR ${row.pool_value_scr}`} {row.valuation_version && `· v${row.valuation_version}`}</p></td>
            <td className="p-3 font-mono whitespace-nowrap">{row.difference ?? "—"}</td><td className="p-3">{label(row)}<p>{row.readiness}</p></td><td className="p-3">{canRequest && row.readiness === "READY" ? <button type="button" className={button} onClick={() => { setCandidate(row); setCases(true); }}>Request checkpoint review</button> : "—"}</td></tr>)}</tbody></table>}
    </div>
    <footer className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={data?.pages || 1} totalCount={data?.total || 0} onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} isDark={isDark} /></footer>
  </section>;
}
