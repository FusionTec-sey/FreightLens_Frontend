import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import { locationError } from "../../../../services/inventoryLocationsApi";
import CostAllocationPreview from "./CostAllocationPreview";
import CostAllocationRegister from "./CostAllocationRegister";
import { cardClass, secondaryButtonClass, surfaceClass } from '../../../UI/UXComponent/RegisterShell';

export default function CostPoolValuations({ api, pool, userId, onClose, canManage = false, canViewEvidence = false }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [result, setResult] = useState(null), [error, setError] = useState("");
  const [selected, setSelected] = useState([]), [preview, setPreview] = useState(null);
  const [register, setRegister] = useState(null);
  const panel = surfaceClass;
  const button = secondaryButtonClass;
  useEffect(() => {
    const controller = new AbortController(); setResult(null); setError(""); setSelected([]); setPreview(null);
    api.poolValuations(pool.id, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult({ api, poolId: pool.id, data });
    }).catch(err => { if (!controller.signal.aborted) setError(locationError(err).message); });
    return () => controller.abort();
  }, [api, pool.id, page, limit, reload]);
  const data = result?.api === api && result.poolId === pool.id ? result.data : null;
  if (register === api) return <CostAllocationRegister key={pool.id} api={api} pool={pool} userId={userId} canManage={canManage} canViewEvidence={canViewEvidence} panel={panel} button={button} isDark={isDark} onClose={() => setRegister(null)} />;
  if (preview?.api === api && preview.poolId === pool.id) return <CostAllocationPreview api={api} pool={pool} ids={preview.ids} panel={panel} button={button} canManage={canManage} onClose={() => setPreview(null)} />;
  return <section aria-label="Cost pool valuation history" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">Valuation history</h1><p>{pool.code} — {pool.name}</p></div>
      <div className="flex gap-2"><button type="button" className={button} onClick={onClose}>Back to cost pools</button><button type="button" className={button} onClick={() => setReload(n => n + 1)}>Refresh valuations</button></div></header>
    <p className="shrink-0 text-sm">Recorded opening and additional-cost values in SCR, not selling prices. Unreconciled records are not final accounts. Charge entries add value, not quantity, and cannot be selected as allocation sources.</p>
    <button type="button" className={`${button} shrink-0 self-start`} onClick={() => setRegister(api)}>Saved cost proposals</button>
    <div className="shrink-0"><button type="button" className={button} disabled={!selected.length || !data} onClick={() => setPreview({ api, poolId: pool.id, ids: selected })}>Preview additional-cost allocation</button><span className="text-sm ml-3">Select source rows on this page; changing pages clears selection.</span></div>
    <div className={cardClass}>
      {error ? <p role="alert" className="p-4">{error} Use Refresh valuations to retry.</p> : !data ? <p role="status" className="p-4">Loading valuations…</p> : !data.items.length ? <p className="p-4">No recorded valuations. This does not mean stock has zero cost.</p> :
        <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr>{["Select", "Product / source", "Version", "Opening quantity", "Goods SCR", "Additional SCR", "Pool quantity after", "Pool value SCR after", "Status / reason"].map(label => <th scope="col" key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>{data.items.map(row => <tr key={row.id} className="border-t"><td className="p-3"><input type="checkbox" aria-label={`Select valuation ${row.id}`} disabled={row.kind === 'CHARGE'} checked={selected.includes(row.id)} onChange={e => setSelected(ids => e.target.checked ? [...ids, row.id] : ids.filter(id => id !== row.id))} /></td><td className="p-3">{row.product_name}<p>{row.kind || 'OPENING'} · Stock #{row.balance_id} · Movement {row.source_version}{row.source_valuation_id && ` · Source valuation #${row.source_valuation_id}`}</p></td><td className="p-3">{row.version}</td>
            {[`${row.quantity} ${row.base_unit}`, row.goods_value_scr, row.additional_cost_scr, row.pool_quantity, row.pool_value_scr].map((value, index) => <td key={index} className="p-3 font-mono whitespace-nowrap">{value}</td>)}
            <td className="p-3">{row.status}<p>{row.reason}</p></td></tr>)}</tbody></table>}
    </div>
    <footer className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={data?.pages || 1} totalCount={data?.total || 0} onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} isDark={isDark} /></footer>
  </section>;
}
