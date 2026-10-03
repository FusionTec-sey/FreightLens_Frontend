import React, { useEffect, useRef, useState } from "react";

// Keyed by the full policy in the parent: editing any rule invalidates the result.
export default function UnitConversionPreview({ api, productId, config, panel, button }) {
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(config.base_unit);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const current = useRef(null);
  useEffect(() => () => current.current?.abort(), []);
  const invalidate = () => { current.current?.abort(); setResult(null); setError(""); setPending(false); };
  const preview = async () => {
    current.current?.abort();
    const controller = new AbortController(); current.current = controller;
    setPending(true); setResult(null); setError("");
    try {
      const { data } = await api.previewPolicyUnit(productId, { config, quantity, unit }, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch (err) {
      if (!controller.signal.aborted) {
        const detail = err.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Check the draft rules, unit and positive quantity, then retry. Nothing was saved.");
      }
    } finally { if (!controller.signal.aborted) setPending(false); }
  };
  return <section aria-label="Test unit conversion" className="space-y-3 border-t pt-3">
    <h3 className="font-semibold">Test unit conversion</h3>
    <p className="text-sm">Uses the current draft fields, including unsaved changes. No rounding, stock change or rule activation.</p>
    <div className="flex flex-wrap gap-3 items-end">
      <label>Test quantity<input inputMode="decimal" value={quantity} onChange={(e) => { invalidate(); setQuantity(e.target.value); }} className={`block p-2 border rounded ${panel}`} /></label>
      <label>Test unit<select value={unit} onChange={(e) => { invalidate(); setUnit(e.target.value); }} className={`block p-2 border rounded ${panel}`}>
        {[config.base_unit, ...config.conversions.map((row) => row.unit)].map((name, index) => <option key={index} value={name}>{name || "Unnamed unit"}</option>)}
      </select></label>
      <button type="button" className={button} disabled={pending || !config.tracking || !quantity || !unit} onClick={preview}>{pending ? "Checking…" : "Check conversion"}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {result && <p role="status">Exact result: {result.base_quantity} {result.base_unit} · Increment {result.quantity_step}. Draft test only; availability is not checked.</p>}
  </section>;
}
