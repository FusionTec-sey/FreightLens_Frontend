import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../../../../context/ThemeContext";
import PaginationToolbar from "../../../UI/UXComponent/PaginationToolbar";
import { locationError } from "../../../../services/inventoryLocationsApi";
import PolicyActivation from "./PolicyActivation";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import ChargeEvidenceDetails from './ChargeEvidenceDetails';

export default function ManagerCases({ api, userId, onClose, canActivate = false, standalone = false, retirement = false, reclassification = false, reviewDetails = null, costAllocation = false, chargeEvidence = false, canReview = true }) {
  const { isDark } = useTheme();
  const [page, setPage] = useState(1), [limit, setLimit] = useState(25), [reload, setReload] = useState(0);
  const [rows, setRows] = useState({ items: [], total: 0, pages: 1 }), [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null), [reason, setReason] = useState(""), [error, setError] = useState(""), [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [view, setView] = useState(standalone ? "NEEDS_MY_REVIEW" : "ALL");
  const controller = useRef(null), busy = useRef(false);
  const { payloadFor, clear } = useOperationIntent();
  useEffect(() => {
    const warn = event => { if (reason) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [reason]);
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const button = "px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 disabled:opacity-40";
  useEffect(() => {
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError("");
    api.managerCases(page, limit, request.signal, view).then(({ data }) => { if (!request.signal.aborted) setRows(data); })
      .catch((err) => { if (!request.signal.aborted) setError(locationError(err).message); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [api, page, limit, reload, view]);
  const review = async (outcome) => {
    if (busy.current || discard || !canReview || self || !reason.trim() || selected.status !== "REQUESTED") return;
    if (typeof window.crypto?.randomUUID !== "function") { setError("A secure browser connection is required."); return; }
    const body = { expected_version: selected.version, outcome, reason: reason.trim() };
    busy.current = true; setSaving(true); setError("");
    const request = controller.current;
    try {
      await api.reviewPolicyCase(selected.case_key, payloadFor(["case-review", selected.case_key], body), request.signal);
      if (!request.signal.aborted) { setDiscard(false); setSelected(null); setReason(""); setReload((value) => value + 1); }
    } catch (err) { if (!request.signal.aborted) setError(locationError(err).message); }
    finally { busy.current = false; if (!request.signal.aborted) setSaving(false); }
  };
  const self = selected && (String(selected.requestor_id) === String(userId) || (costAllocation && String(selected.creator_id) === String(userId)));
  const caseSubject = chargeEvidence ? 'charge evidence' : costAllocation ? "cost allocation" : reclassification ? "reclassification proposal" : retirement ? "barcode retirement" : "policy";
  return <section aria-label="Inventory manager cases" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3"><div><h1 className="text-xl font-bold">{chargeEvidence ? 'Reviews — charge evidence' : costAllocation ? "Approvals — cost allocations" : reclassification ? "Approvals — stock proposals" : retirement ? "Approvals — barcode retirement" : standalone ? "Approvals — inventory policies" : "Inventory manager cases"}</h1>
      <p className="text-sm">Exact saved-source reviews. Approval is not execution and cannot be reused for changed details.</p></div>
      <div className="flex gap-2"><button type="button" className={button} disabled={saving} onClick={selected ? () => { if (reason) setDiscard(true); else { setSelected(null); setError(""); } } : onClose}>{selected ? "Back to cases" : reclassification || costAllocation ? "Back to proposal" : "Branches & locations"}</button>
        {!selected && <button type="button" className={button} onClick={() => setReload((value) => value + 1)}>Refresh cases</button>}</div></header>
    {error && <p role="alert">{error}</p>}
    {discard && <div role="alert">Discard the unsaved decision reason?
      <button type="button" className={button} disabled={saving} onClick={() => setDiscard(false)}>Keep reviewing</button>
      <button type="button" className={button} disabled={saving} onClick={() => { setDiscard(false); setSelected(null); setReason(""); setError(""); }}>Discard decision draft</button></div>}
    {selected ? <><div className="flex-1 min-h-0 overflow-auto space-y-3">
      <h2 className="font-semibold">{selected.charge_reference || selected.product_name} · {reclassification || costAllocation ? "proposal" : retirement ? "identity" : "policy"} version {selected.source_version}</h2>
      <p>Status: {selected.status} · Requestor #{selected.requestor_id}</p><p>Request: {selected.reason}</p>
      {reclassification && <><p>Review the exact historical quantities and identity manifest below. Approval does not execute a conversion; source versions are rechecked by the server.</p>{reviewDetails}</>}
      {chargeEvidence && <ChargeEvidenceDetails key={selected.case_key} api={api} item={selected} button={button} />}
      {costAllocation && <>{!chargeEvidence && <p>Approval records an allocation decision only. Supplier invoice and exchange-rate evidence require a separate verification review before financial posting. This screen cannot verify or post a charge.</p>}<p>Declaration: {selected.declaration_reason} · Creator #{selected.creator_id}</p><p>SCR {selected.snapshot.total_scr} · {selected.snapshot.basis}</p><table className="w-full text-sm text-left"><thead><tr><th>Product / stock / valuation</th><th>Basis</th><th>Allocated SCR</th></tr></thead><tbody>{selected.snapshot.lines.map(line => <tr key={line.valuation_id}><td className="p-2">{line.product_name} · #{line.balance_id} · #{line.valuation_id}</td><td className="p-2">{line.basis_value} {selected.snapshot.basis === 'BASE_QUANTITY' ? line.base_unit : 'SCR'}</td><td className="p-2">{line.allocated_scr}</td></tr>)}</tbody></table></>}
      {!reclassification && !costAllocation && <p>{retirement ? "Review permanently disabling this barcode. Its code, product and unit history will not be deleted or reassigned." : selected.transition === "EXTEND_UNITS" ? "Reviewed alternate-unit extension. Existing stock rules and barcode meanings must remain unchanged." : selected.expected_active_version ? `Reviewed transition from active policy ${selected.expected_active_version}; stock history and barcode checks still apply.` : "Initial activation review; no stock is created."}</p>}
      {!costAllocation && <pre className="whitespace-pre-wrap break-words border rounded-lg p-3 text-sm">{JSON.stringify(selected.config, null, 2)}</pre>}
      {selected.review_reason && <p>Review: {selected.review_reason} · Reviewer #{selected.reviewer_id}</p>}
      {self && <p>{costAllocation ? "You cannot review a proposal you created or requested." : "You cannot review your own request."}</p>}
      {selected.status === "REQUESTED" && canReview && <label className="block">Decision reason<textarea maxLength={1000} disabled={saving || self} value={reason} onChange={(event) => setReason(event.target.value)} className={`block border rounded-lg p-2 w-full ${panel}`} /></label>}
    </div>{selected.status === "APPROVED" && canActivate && !reclassification && !costAllocation && <footer className="shrink-0">
      <PolicyActivation retirement={retirement} key={selected.case_key} api={api} caseKey={selected.case_key}
        expectedActiveVersion={selected.expected_active_version} transition={selected.transition}
        panel={panel} button={button} onBusyChange={setSaving} onActivated={() => { setSelected(null); setReload((value) => value + 1); }} />
    </footer>}{selected.status === "REQUESTED" && canReview && <footer className="shrink-0 flex gap-3 border-t pt-3">
      <button type="button" className={button} disabled={saving || discard || self || !reason.trim()} onClick={() => review("APPROVED")}>{chargeEvidence ? 'Verify invoice and FX evidence' : costAllocation ? "Approve exact allocation" : reclassification ? "Approve exact proposal" : retirement ? "Approve barcode retirement" : "Approve exact policy"}</button>
      <button type="button" className={button} disabled={saving || discard || self || !reason.trim()} onClick={() => review("REJECTED")}>Reject request</button></footer>}</> : <>
      <div className="shrink-0 space-y-2">
        <label className="flex flex-wrap items-center gap-2">Case view
          <select aria-label="Case view" value={view} onChange={(event) => { setView(event.target.value); setPage(1); }} className={`border rounded-lg p-2 ${panel}`}>
            <option value="NEEDS_MY_REVIEW">Needs my review</option><option value="MY_REQUESTS">My requests</option><option value="ALL">All cases</option>
          </select>
        </label>
        <p className="text-sm">{view === "NEEDS_MY_REVIEW" ? "Undecided requests from other users in this company. Shared with eligible reviewers; not an exclusive assignment. Current source rules are rechecked when deciding." : view === "MY_REQUESTS" ? "Your requests and their recorded decisions in this company." : `All ${caseSubject} cases in this company, including decisions and completed actions.`}</p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto border rounded-lg">{loading ? <p role="status" className="p-4">Loading manager cases…</p> : error ? <p className="p-4">Case list unavailable. Refresh to retry.</p> : !rows.items.length ? <p className="p-4">{view === "NEEDS_MY_REVIEW" ? `No ${caseSubject} requests waiting for your review.` : view === "MY_REQUESTS" ? `You have no ${caseSubject} review requests in this company.` : `No ${caseSubject} review cases.`}</p> :
        <table className="w-full text-sm text-left"><thead className={`sticky top-0 ${panel}`}><tr>{[costAllocation ? "Charge reference" : retirement ? "Barcode" : "Product", costAllocation ? "Proposal version" : retirement ? "Identity version" : "Policy version", "Status", "Requested", "Action"].map((label) => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>
          {rows.items.map((row) => <tr key={row.case_key} className="border-t"><td className="p-3">{row.charge_reference || row.product_name}</td><td className="p-3">{row.source_version}</td><td className="p-3">{row.status}</td><td className="p-3">{row.requested_at}</td><td className="p-3"><button type="button" className={button} onClick={() => { setSelected(row); setReason(""); clear(); }}>Review case<span className="sr-only"> {row.charge_reference || row.product_name}</span></button></td></tr>)}
        </tbody></table>}</div>
      <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : rows.pages} totalCount={loading || error ? 0 : rows.total} onPageChange={setPage}
        onPageSizeChange={(value) => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
    </>}
  </section>;
}
