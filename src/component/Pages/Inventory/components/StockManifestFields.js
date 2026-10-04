import React from 'react';

export function newBatchRow(makeKey = () => window.crypto.randomUUID()) {
  return { key: makeKey(), code: '', shade: '', calibre: '', expires_on: '', on_hand: '', damaged: '0', quarantined: '0' };
}

export function buildStockManifest(tracking, rows, serialText, identities, makeKey = () => window.crypto.randomUUID()) {
  if (tracking === 'UNTRACKED') return { batches: [], serials: null };
  if (tracking === 'BATCH') {
    if (!rows.length) throw new Error('Add at least one batch.');
    return { batches: rows.map(row => ({
      identity: { batch_key: row.key, code: row.code.trim(), shade: row.shade.trim() || null,
        calibre: row.calibre.trim() || null, expires_on: row.expires_on || null },
      on_hand: row.on_hand, damaged: row.damaged, quarantined: row.quarantined,
    })), serials: null };
  }
  if (tracking !== 'SERIAL') throw new Error('A reviewed tracking policy is required.');
  const lines = serialText.trim().split('\n');
  if (!serialText.trim() || lines.length > 1000) throw new Error('Enter between 1 and 1000 serial identities.');
  return { batches: [], serials: { items: lines.map(line => {
    const parts = line.split('|').map(value => value.trim());
    if (parts.length !== 2 || !parts[0] || !['AVAILABLE', 'DAMAGED', 'QUARANTINED'].includes(parts[1])) {
      throw new Error('Each serial line must be NUMBER | AVAILABLE, DAMAGED or QUARANTINED.');
    }
    if (!identities.has(parts[0])) identities.set(parts[0], makeKey());
    return { serial_key: identities.get(parts[0]), serial_number: parts[0], condition: parts[1] };
  }) } };
}

export default function StockManifestFields({ tracking, rows, setRows, serialText, setSerialText,
  disabled = false, panel = '', button = 'border rounded p-2', addLabel = 'Add batch' }) {
  const change = (index, field, value) => setRows(old => old.map((row, i) => i === index ? { ...row, [field]: value } : row));
  if (tracking === 'UNTRACKED') return <p>Ordinary stock does not require batch or serial identities.</p>;
  if (tracking === 'SERIAL') return <label className="block">Serial manifest — one NUMBER | CONDITION per line
    <textarea rows={12} disabled={disabled} value={serialText} onChange={event => setSerialText(event.target.value)}
      className={`block w-full border rounded-lg p-2 font-mono ${panel}`} />
  </label>;
  if (tracking !== 'BATCH') return <p role="status">Load a reviewed inventory policy before entering physical identities.</p>;
  return <>
    {rows.map((row, index) => <fieldset key={row.key} className="border rounded-lg p-3"><legend>Batch {index + 1}</legend>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[['code', 'Batch code'], ['shade', 'Shade'], ['calibre', 'Calibre'], ['expires_on', 'Expiry date'], ['on_hand', 'On-hand'], ['damaged', 'Damaged'], ['quarantined', 'Quarantined']].map(([field, label]) =>
          <label key={field}>{label}<input type={field === 'expires_on' ? 'date' : 'text'} disabled={disabled} value={row[field]}
            onChange={event => change(index, field, event.target.value)} className={`block w-full border rounded-lg p-2 ${panel}`} /></label>)}
      </div>
      <button type="button" className={button} disabled={disabled} onClick={() => setRows(old => old.filter(item => item.key !== row.key))}>Remove batch {index + 1}</button>
    </fieldset>)}
    <button type="button" className={button} disabled={disabled || rows.length >= 1000}
      onClick={() => setRows(old => [...old, newBatchRow()])}>{addLabel}</button>
  </>;
}
