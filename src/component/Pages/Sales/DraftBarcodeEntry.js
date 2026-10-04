import React, { useEffect, useRef, useState } from 'react';
import { inputClass, secondaryButtonClass } from '../../UI/UXComponent/RegisterShell';

export default function DraftBarcodeEntry({ api, disabled, onSelect }) {
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const request = useRef(null), current = useRef({ disabled, onSelect });
  current.current = { disabled, onSelect };
  useEffect(() => () => { request.current?.abort(); request.current = null; }, [api]);
  useEffect(() => {
    if (disabled) { request.current?.abort(); request.current = null; setBusy(false); }
  }, [disabled]);
  async function scan(event) {
    event.preventDefault();
    if (current.current.disabled || request.current) return;
    if (!/^[!-~]{1,100}$/.test(code)) { setMessage('Enter an exact registered barcode (no spaces).'); return; }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setMessage('');
    try {
      const { data: barcode } = await api.resolveUnitBarcode(code, controller.signal);
      if (!barcode.eligible || barcode.retired || barcode.barcode !== code) throw new Error('Unavailable barcode');
      const { data: policy } = await api.activePolicy(barcode.product_id, controller.signal);
      const units = policy.config ? [policy.config.base_unit, ...policy.config.conversions.map(row => row.unit)] : [];
      if (policy.product_id !== barcode.product_id || policy.status !== 'ACTIVE' ||
          policy.config?.base_unit !== barcode.base_unit || !units.includes(barcode.unit)) throw new Error('Changed policy');
      if (controller.signal.aborted || current.current.disabled) return;
      current.current.onSelect({ id: barcode.product_id, policy_version: policy.version,
        base_unit: policy.config.base_unit, unit: barcode.unit, units });
      setCode(''); setMessage(`Added one ${barcode.unit} of product ${barcode.product_id}. Check quantity before saving.`);
    } catch {
      if (!controller.signal.aborted) setMessage('Barcode unavailable, access denied or policy changed. Nothing added; check and retry.');
    } finally {
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  return <section className="shrink-0 space-y-1">
    <form onSubmit={scan} className="flex flex-wrap items-end gap-2">
      <label className="text-xs font-semibold">Scan or enter unit barcode
        <input className={`block ${inputClass}`} value={code} maxLength={100} autoComplete="off"
          disabled={disabled || busy} onChange={event => setCode(event.target.value)} />
      </label>
      <button type="submit" disabled={disabled || busy} className={secondaryButtonClass}>{busy ? 'Resolving…' : 'Add barcode'}</button>
    </form>
    {message && <p role="status" className="text-xs">{message}</p>}
  </section>;
}
