import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import ReclassificationEditor from "./ReclassificationEditor";
import PolicyReviewRequest from "./PolicyReviewRequest";
import ManagerCases from "./ManagerCases";
import { cardClass, secondaryButtonClass, surfaceClass } from '../../../UI/UXComponent/RegisterShell';

export default function ReclassificationProposals({ api, balance, onClose, canPropose = false, canReview = false, userId }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null), [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null), [reviews, setReviews] = useState(false);
  const [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const panel = surfaceClass;
  const button = secondaryButtonClass;
  const key = selected?.api === api && selected?.balanceId === balance.id ? selected.key : null;
  const rows = result?.api === api && result?.balanceId === balance.id ? result.data : null;
  const record = detail?.api === api && detail?.key === key ? detail.data : null;
  const reviewApi = useMemo(() => ({ managerCases: (page, limit, signal, view) => api.reclassificationCases(key, page, limit, signal, view),
    reviewPolicyCase: (caseKey, body, signal) => api.reviewReclassificationCase(key, caseKey, body, signal) }), [api, key]);
  useEffect(() => { setPage(1); setSelected(null); setReviews(false); setDirty(false); setDiscard(false); }, [api, balance.id]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setResult(null); setDetail(null);
    const request = key ? api.reclassificationProposal(key, controller.signal)
      : api.reclassificationProposals(balance.id, page, limit, controller.signal);
    request.then(({ data }) => {
      if (controller.signal.aborted) return;
      if (key) setDetail({ api, key, data });
      else setResult({ api, balanceId: balance.id, data });
    }).catch((err) => {
      if (!controller.signal.aborted) setError(typeof err.response?.data?.detail === "string"
        ? err.response.data.detail : "Proposals could not be loaded. Check your connection and retry.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, balance.id, page, limit, revision, key]);
  if (editing === api) return <ReclassificationEditor api={api} balance={balance} panel={panel} button={button}
    onClose={() => setEditing(null)} onSaved={proposalKey => { setEditing(null); setSelected({ api, balanceId: balance.id, key: proposalKey }); setRevision(n => n + 1); }} />;
  if (reviews && key && record) return <ManagerCases key={key} api={reviewApi} userId={userId} reclassification
    reviewDetails={<ProposalDetail record={record} panel={panel} />} onClose={() => { setReviews(false); setRevision(n => n + 1); }} />;
  return <section aria-label="Reclassification proposals" className={`h-full min-h-0 min-w-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div>
      <h1 className="text-xl font-bold">Reclassification proposals</h1><p>{balance.product_name} · {balance.sku}</p>
    </div><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={key ? () => dirty ? setDiscard(true) : setSelected(null) : onClose}>{key ? "Back to proposals" : "Back to stock"}</button>
      <button type="button" className={button} disabled={busy || dirty} onClick={() => setRevision(n => n + 1)}>Refresh proposals</button>
      {!key && canPropose && balance.tracking_policy === "UNTRACKED" && <button type="button" className={button} onClick={() => setEditing(api)}>Prepare proposal</button>}
      {key && record && canReview && <button type="button" className={button} disabled={busy || dirty} onClick={() => setReviews(true)}>Proposal review cases</button>}</div></header>
    <p className="shrink-0 text-sm">Saved proposals for this stock record. Historical snapshots are not current stock or approval status. Conversion is disabled; saving or approving a proposal does not move goods.</p>
    {discard && <div role="alert">Discard unsaved review reason?<button type="button" className={button} onClick={() => setDiscard(false)}>Keep reviewing</button><button type="button" className={button} onClick={() => { setDiscard(false); setDirty(false); setSelected(null); }}>Discard review reason</button></div>}
    <div className={cardClass} aria-busy={loading}>
      {loading ? <p role="status" className="p-4">Loading proposals…</p> : error ? <div role="alert" className="p-4"><p>{error}</p><button type="button" className={button} onClick={() => setRevision(n => n + 1)}>Retry proposals</button></div>
        : key && record ? <><ProposalDetail record={record} panel={panel} />{canPropose && <div className="p-4"><PolicyReviewRequest key={key} api={api} proposalKey={key} version={1} disabled={discard} panel={panel} button={button} onBusyChange={setBusy} onDirtyChange={setDirty} /></div>}</>
        : !rows?.items?.length ? <p className="p-4">No saved proposals for this stock record. No stock has been reclassified.</p>
        : <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr>{["Reason", "Target tracking", "Stock / policy versions", "Saved", "Action"].map(label => <th scope="col" key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>{rows.items.map(row => <tr key={row.proposal_key} className="border-t"><td className="p-3 min-w-48 break-words">{row.reason}</td><td className="p-3">{row.target_tracking}</td>
            <td className="p-3 whitespace-nowrap">Stock {row.balance_version} · Active {row.active_version} · Draft {row.draft_version}</td><td className="p-3 whitespace-nowrap">{row.created_at}</td>
            <td className="p-3"><button type="button" className={button} onClick={() => setSelected({ api, balanceId: balance.id, key: row.proposal_key })}>View proposal</button></td></tr>)}</tbody></table>}
    </div>
    {!key && <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : rows?.pages || 1} totalCount={loading || error ? 0 : rows?.total || 0}
      onPageChange={setPage} onPageSizeChange={value => { setLimit(value); setPage(1); }} isDark={isDark} /></div>}
  </section>;
}

function ProposalDetail({ record, panel }) {
  const { snapshot, manifest } = record;
  return <article className="p-4 space-y-4 text-sm">
    <h2 className="font-bold">Historical proposal detail</h2><p className="break-all">Reference: {record.proposal_key}</p><p>{record.reason}</p>
    <p>Stock version {snapshot.balance_version} · Active policy {snapshot.active_version} · Draft {snapshot.draft_version}</p>
    <p>{snapshot.original_policy.tracking} → {snapshot.target_policy.tracking} · Base unit: {snapshot.target_policy.base_unit}</p>
    <dl className="grid grid-cols-2 gap-2">{Object.entries(snapshot.quantities).map(([name, value]) => <React.Fragment key={name}><dt>{name.replaceAll("_", " ")}</dt><dd className="font-mono">{value}</dd></React.Fragment>)}</dl>
    <h3 className="font-bold">Explicit identity manifest</h3>
    <table className="w-full text-left"><thead className={panel}><tr>{(manifest.serials ? ["Serial number", "Condition"] : ["Batch", "Shade / calibre / expiry", "On-hand", "Damaged", "Quarantined"]).map(label => <th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
      <tbody>{manifest.serials ? manifest.serials.items.map(item => <tr key={item.serial_key} className="border-t"><td className="p-2 font-mono break-all">{item.serial_number}</td><td className="p-2">{item.condition}</td></tr>) : manifest.batches.map(item => <tr key={item.identity.batch_key} className="border-t"><td className="p-2 font-mono">{item.identity.code}</td><td className="p-2">{item.identity.shade || "Not recorded"} / {item.identity.calibre || "Not recorded"} / {item.identity.expires_on || "Not recorded"}</td>{[item.on_hand, item.damaged, item.quarantined].map((value, index) => <td className="p-2 font-mono" key={index}>{value}</td>)}</tr>)}</tbody>
    </table>
  </article>;
}
