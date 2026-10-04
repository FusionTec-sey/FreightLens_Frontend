import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { locationError } from "../../../../services/inventoryLocationsApi";
import useOperationIntent from "../../../../hooks/useOperationIntent";
import { inputClass, secondaryButtonClass, surfaceClass } from '../../../UI/UXComponent/RegisterShell';

const blank = { timezone_name: null, weekday_cutoff: null, weekend_cutoff: null, trading_weekdays: null, date_overrides: [] };
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function BranchSettings({ api, branch, canManage, onClose }) {
  const [record, setRecord] = useState(null);
  const [config, setConfig] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState({ message: "", fields: {} });
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(null);
  const lifetime = useRef(null);
  const posting = useRef(false);
  const { payloadFor, clear } = useOperationIntent();
  const dirty = record && JSON.stringify(config) !== JSON.stringify(record.config);
  const editable = canManage && branch.is_active;
  const panel = surfaceClass;
  const button = secondaryButtonClass;

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    setLoading(true); setRecord(null); setError({ message: "", fields: {} });
    api.branchSettings(branch.id, controller.signal).then(({ data }) => {
      if (controller.signal.aborted) return;
      setRecord(data); setConfig(data.config); clear();
    }).catch((err) => {
      if (!controller.signal.aborted) setError(locationError(err));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, branch.id, revision, clear]);

  const change = (key, value) => setConfig((old) => ({ ...old, [key]: value }));
  const navigate = (action) => {
    if (posting.current) return;
    if (dirty) { setPending(action); return; }
    if (action === "close") onClose(); else setRevision((value) => value + 1);
  };
  const save = async (event) => {
    event.preventDefault();
    if (posting.current || !editable || !record) return;
    const payload = { expected_version: record.version, config };
    if (typeof window.crypto?.randomUUID !== "function") {
      setError({ message: "A secure browser connection is required before saving settings.", fields: {} });
      return;
    }
    posting.current = true; setSaving(true); setError({ message: "", fields: {} });
    const controller = lifetime.current;
    try {
      const { data } = await api.saveBranchSettings(branch.id, payloadFor(["branch-settings", branch.id], payload), controller.signal);
      if (controller.signal.aborted) return;
      setRecord(data); setConfig(data.config); clear();
      toast.success("Branch settings revision saved. Checkout is not activated.");
    } catch (err) {
      if (!controller.signal.aborted) setError(locationError(err));
    } finally {
      posting.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  };
  const input = (key, label, type = "text") => <label className="flex flex-col gap-1">{label}
    <input type={type} value={config[key] || ""} maxLength={100} aria-invalid={!!error.fields[key]}
      onChange={(event) => change(key, event.target.value || null)} className={inputClass} />
    {error.fields[key] && <span className="text-red-500">{error.fields[key]}</span>}
  </label>;

  return <section aria-label="Branch trading settings" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap justify-between gap-3">
      <div><h1 className="text-xl font-bold">{branch.name} — trading settings</h1>
        <p className="text-sm">Preparation only. Saving does not activate checkout or change historical transaction dates.</p></div>
      <div className="flex gap-2"><button type="button" disabled={saving} className={button} onClick={() => navigate("reload")}>Reload</button>
        <button type="button" disabled={saving} className={button} onClick={() => navigate("close")}>Back to locations</button></div>
    </header>
    {pending && <div role="alert" className="shrink-0 border p-3 rounded-lg">Unsaved changes will be discarded.
      <button type="button" disabled={saving} className={button} onClick={() => setPending(null)}>Keep editing</button>
      <button type="button" disabled={saving} className={button} onClick={() => { const action = pending; setPending(null); if (action === "close") onClose(); else setRevision((value) => value + 1); }}>Discard changes</button>
    </div>}
    {loading ? <p role="status">Loading branch settings…</p> : <form onSubmit={save} className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        {error.message && <div role="alert"><p>{error.message}</p>{Object.entries(error.fields).map(([key, message]) => <p key={key}>{key}: {message}</p>)}</div>}
        {record && <>
          <p>Revision {record.version} · {record.status.replaceAll("_", " ")}. {record.missing_fields.length > 0 && `Missing: ${record.missing_fields.join(", ")}. Affected actions remain blocked.`}</p>
          {!editable && <p>Read only. An active branch and branch-settings permission are required to save.</p>}
          <fieldset disabled={!editable || saving} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              {input("timezone_name", "IANA timezone (for example Indian/Mahe)")}
              {input("weekday_cutoff", "Weekday business-day start", "time")}
              {input("weekend_cutoff", "Weekend business-day start", "time")}
            </div>
            <p className="text-sm">Before the configured cutoff, transactions belong to the previous business date. Saturday and Sunday use the weekend cutoff. These are accounting date boundaries, not collection appointments.</p>
            <label className="flex gap-2"><input type="checkbox" checked={config.trading_weekdays !== null}
              onChange={(event) => change("trading_weekdays", event.target.checked ? [] : null)} />Configure weekly trading days</label>
            {config.trading_weekdays !== null && <div className="flex flex-wrap gap-4">{days.map((day, index) => <label key={day} className="flex gap-2">
              <input type="checkbox" checked={config.trading_weekdays.includes(index)} onChange={(event) => change("trading_weekdays",
                event.target.checked ? [...config.trading_weekdays, index].sort() : config.trading_weekdays.filter((value) => value !== index))} />{day}</label>)}</div>}
            {config.trading_weekdays?.length === 0 && <p>No selected days means intentionally closed all week, except explicit open dates.</p>}
            <h2 className="font-semibold">Holiday and exceptional dates</h2>
            <p className="text-sm">Overrides refer to business dates. Open selected public holidays explicitly; no public-holiday calendar is assumed. Maximum 366 configured exceptions.</p>
            {config.date_overrides.map((row, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 border p-3 rounded-lg">
              <label>Date<input type="date" required aria-label={`Exception date ${index + 1}`} value={row.business_date} className={`block ${inputClass}`}
                onChange={(event) => change("date_overrides", config.date_overrides.map((item, i) => i === index ? { ...item, business_date: event.target.value } : item))} /></label>
              <label className="flex gap-2 items-center"><input type="checkbox" checked={row.is_open} onChange={(event) => change("date_overrides", config.date_overrides.map((item, i) => i === index ? { ...item, is_open: event.target.checked } : item))} />Open for trading</label>
              <label>Reason<input required maxLength={200} value={row.reason} aria-label={`Exception reason ${index + 1}`} className={`block ${inputClass}`}
                onChange={(event) => change("date_overrides", config.date_overrides.map((item, i) => i === index ? { ...item, reason: event.target.value } : item))} /></label>
              <button type="button" className={button} onClick={() => change("date_overrides", config.date_overrides.filter((_, i) => i !== index))}>Remove exception</button>
            </div>)}
            <button type="button" className={button} disabled={config.date_overrides.length >= 366} onClick={() => change("date_overrides", [...config.date_overrides, { business_date: "", is_open: false, reason: "" }])}>Add date exception</button>
          </fieldset>
          <p className="text-sm">Collection eligibility is separate from trading dates. Counter setup, offline policy and final release approval are separate gates.</p>
        </>}
      </div>
      {record && editable && <footer className="shrink-0 border-t pt-3"><button type="submit" className={`${button} bg-indigo-600 text-white`} disabled={saving || !dirty}>{saving ? "Saving…" : "Save settings revision"}</button></footer>}
    </form>}
  </section>;
}
