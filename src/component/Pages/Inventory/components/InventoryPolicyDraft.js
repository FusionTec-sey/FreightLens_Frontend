import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { inventoryLocationsApi } from "../../../../services/inventoryLocationsApi";
import UnitConversionPreview from "./UnitConversionPreview";
import PolicyReviewRequest from "./PolicyReviewRequest";
import ActivePolicySummary from "./ActivePolicySummary";
import UnitBarcodes from "./UnitBarcodes";
import PolicyTransitionReadiness from "./PolicyTransitionReadiness";
import { inputClass, secondaryButtonClass, surfaceClass } from '../../../UI/UXComponent/RegisterShell';

export default function InventoryPolicyDraft({ product, isDark, canEdit, onClose }) {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  const api = useMemo(() => inventoryLocationsApi(token, activeOrg), [token, activeOrg]);
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  return <DraftForm key={`${activeOrg}:${product.id}`} api={api} product={product} isDark={isDark} canEdit={canEdit} onClose={onClose}
    canManageBarcodes={isSuperAdmin || permissions.includes("Manage_InventoryBarcode")}
    canRequestRetirement={isSuperAdmin || permissions.includes("Request_BarcodeRetirement")}
    canRequestReview={isSuperAdmin || permissions.includes("Request_InventoryReview")} />;
}

function DraftForm({ api, product, isDark, canEdit, onClose, canRequestReview, canManageBarcodes, canRequestRetirement }) {
  const [showBarcodes, setShowBarcodes] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  const lifecycle = useRef(null);
  const panel = surfaceClass;
  const button = secondaryButtonClass;
  useEffect(() => {
    const controller = new AbortController(); lifecycle.current = controller;
    setLoading(true); setError("");
    api.policyDraft(product.id, controller.signal).then(({ data: response }) => {
      if (controller.signal.aborted) return;
      setData(response);
      setForm(response.config || { base_unit: response.current_base_unit || "", quantity_step: "1", tracking: "",
        require_expiry: false, require_shade: false, require_calibre: false, conversions: [] });
      setDirty(false);
    }).catch(() => { if (!controller.signal.aborted) setError("Could not load the draft. Check access and retry."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, product.id, reload]);
  const change = (patch) => { setForm((old) => ({ ...old, ...patch })); setDirty(true); setSaved(false); };
  const close = () => { if (reviewing) return; if (dirty || reviewDirty) setDiscard(true); else onClose(); };
  const save = async (event) => {
    event.preventDefault();
    if (busy.current || reviewing || !canEdit || !form.tracking) return;
    busy.current = true; setSaving(true); setError(""); setSaved(false);
    const controller = lifecycle.current;
    try {
      const { data: response } = await api.savePolicyDraft(product.id, { expected_version: data.version, config: form }, controller.signal);
      if (!controller.signal.aborted) { setData(response); setForm(response.config); setDirty(false); setSaved(true); }
    } catch (err) {
      if (!controller.signal.aborted) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((entry) => `${entry.loc?.slice(1).join(" / ")}: ${entry.msg}`).join("; ") : "Save could not be confirmed. Your fields are retained; retry the unchanged draft or reopen to check its version.");
      }
    } finally { busy.current = false; if (!controller.signal.aborted) setSaving(false); }
  };
  if (showBarcodes) return <div className="fixed inset-0 z-50 bg-black/50 p-3 flex items-center justify-center">
    <div role="dialog" aria-modal="true" aria-label="Unit barcode setup" className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border ${panel}`}>
      <UnitBarcodes api={api} product={product} canManage={canManageBarcodes} canRequestRetirement={canRequestRetirement} isDark={isDark} onClose={() => setShowBarcodes(false)} />
    </div></div>;
  return <div className="fixed inset-0 z-50 bg-black/50 p-3 flex items-center justify-center">
    <section role="dialog" aria-modal="true" aria-labelledby="policy-title" onKeyDown={(event) => {
      if (event.key === "Escape" && !saving) { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const controls = [...event.currentTarget.querySelectorAll("button, input, select, textarea")].filter((el) => !el.matches(":disabled"));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }} className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border ${panel}`}>
      <header className="shrink-0 p-4 border-b flex flex-wrap justify-between gap-2"><div><h2 id="policy-title" className="text-xl font-bold">Units & tracking draft</h2><p>{product.name}</p></div><button autoFocus type="button" disabled={saving} className={button} onClick={close}>Close draft</button></header>
      {discard ? <div className="p-4 space-y-3"><p>Discard unsaved changes? A failed or uncertain save may already exist on the server; reopening will check it.</p><button type="button" className={button} onClick={() => setDiscard(false)}>Keep editing</button> <button type="button" className={button} onClick={onClose}>Discard and close</button></div> : loading ? <p role="status" className="p-4">Loading draft…</p> : !data ? <div className="p-4"><p role="alert">{error}</p><button type="button" className={button} onClick={() => setReload((n) => n + 1)}>Retry load</button></div> :
      <form onSubmit={save} className="min-h-0 flex flex-col">
        <div className="min-h-0 overflow-auto p-4 space-y-4">
          <ActivePolicySummary api={api} productId={product.id} />
          <button type="button" className={button} disabled={saving || reviewing || dirty || reviewDirty} onClick={() => setShowBarcodes(true)}>Unit barcodes</button>
          <p className="text-sm">Draft only · Version {data.version}. Saving does not change stock, prices or active tracking. Reviewed alternate-unit additions can preserve existing stock rules and barcodes. Other revisions require no stock history and no live codes. Stock reclassification is not available. Unit barcodes use the active policy, never this draft.</p>
          {error && <p role="alert" className="text-red-500">{error}</p>}
          {saved && <p role="status">Draft saved. Operational stock rules are unchanged.</p>}
          {form.base_unit !== data.current_base_unit && <div role="alert"><p>The catalogue base unit has changed. This draft needs review; old conversions must not be reused automatically.</p>
            {canEdit && data.current_base_unit && <button type="button" disabled={saving} className={button} onClick={() => change({ base_unit: data.current_base_unit, tracking: "", conversions: [], quantity_step: "1", require_expiry: false, require_shade: false, require_calibre: false })}>Reset draft to catalogue unit</button>}</div>}
          {!data.current_base_unit && <p role="alert">Set the product's catalogue unit before preparing inventory rules.</p>}
          <fieldset disabled={!canEdit || saving || reviewing} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>Base unit (catalogue)<input readOnly value={form.base_unit} className={`block w-full ${inputClass}`} /></label>
              <label>Quantity increment<select value={form.quantity_step} onChange={(e) => change({ quantity_step: e.target.value })} className={`block w-full ${inputClass}`}>{["1", "0.1", "0.01", "0.001", "0.0001", "0.00001", "0.000001"].map((step) => <option key={step}>{step}</option>)}</select></label>
              <label>Tracking mode<select required value={form.tracking} onChange={(e) => change({ tracking: e.target.value, ...(e.target.value !== "BATCH" ? { require_expiry: false, require_shade: false, require_calibre: false } : {}), ...(e.target.value === "SERIAL" ? { quantity_step: "1" } : {}) })} className={`block w-full ${inputClass}`}><option value="">Choose explicitly</option><option value="UNTRACKED">Ordinary / untracked</option><option value="BATCH">Batch / lot</option><option value="SERIAL">Serial numbers</option></select></label>
            </div>
            {form.tracking === "BATCH" && <div className="flex flex-wrap gap-4">{[["require_expiry", "Require expiry date"], ["require_shade", "Match tile shade"], ["require_calibre", "Match tile calibre"]].map(([key, label]) => <label key={key}><input type="checkbox" checked={form[key]} onChange={(e) => change({ [key]: e.target.checked })} /> {label}</label>)}</div>}
            <div><h3 className="font-semibold">Alternate units</h3><p className="text-sm">One alternate unit equals this many base units. Example: 1 BOX = 12 PCS. No conversion is inferred from packaging fields.</p></div>
            {form.conversions.map((row, index) => <div key={index} className="flex flex-wrap gap-2 items-end">
              <label>Unit {index + 1}<input required maxLength={50} value={row.unit} onChange={(e) => change({ conversions: form.conversions.map((item, i) => i === index ? { ...item, unit: e.target.value } : item) })} className={`block ${inputClass}`} /></label>
              <label>Base units per unit {index + 1}<input required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,8})?" value={row.factor} onChange={(e) => change({ conversions: form.conversions.map((item, i) => i === index ? { ...item, factor: e.target.value } : item) })} className={`block ${inputClass}`} /></label>
              <button type="button" className={button} onClick={() => change({ conversions: form.conversions.filter((_, i) => i !== index) })}>Remove unit {index + 1}</button>
            </div>)}
            <button type="button" disabled={form.conversions.length >= 16} className={button} onClick={() => change({ conversions: [...form.conversions, { unit: "", factor: "" }] })}>Add alternate unit</button>
          </fieldset>
          <UnitConversionPreview key={JSON.stringify(form)} api={api} productId={product.id} config={form} panel={panel} button={button} />
          <PolicyTransitionReadiness key={`${data.version}:${dirty}`} api={api} productId={product.id} button={button} disabled={dirty || saving} />
          {canRequestReview && <PolicyReviewRequest api={api} productId={product.id} version={data.version}
            disabled={dirty || saving} panel={panel} button={button} onBusyChange={setReviewing} onDirtyChange={setReviewDirty} />}
        </div>
        <footer className="shrink-0 border-t p-4">{canEdit ? <button type="submit" disabled={saving || !dirty || !form.base_unit || !form.tracking} className={`${button} bg-indigo-600 text-white`}>{saving ? "Saving…" : "Save draft"}</button> : <p>Read-only: product editing permission is required to save.</p>}</footer>
      </form>}
    </section>
  </div>;
}
